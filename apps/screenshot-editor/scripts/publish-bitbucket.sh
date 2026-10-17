#!/usr/bin/env bash
# Publish a static export into one subfolder of a Bitbucket Cloud static website.
#
# Usage: bash scripts/publish-bitbucket.sh <site-dir>
#
# Bitbucket serves the repository <workspace>.bitbucket.io at https://<workspace>.bitbucket.io/.
# This script replaces only <SITE_SUBFOLDER>/ in that repository; every other path
# (the repository root, other folders) is left exactly as it is. It never force-pushes.
#
# Environment:
#   BITBUCKET_WORKSPACE     Bitbucket workspace ID. Required unless BITBUCKET_REMOTE_URL is set.
#   BITBUCKET_TOKEN         Repository access token with write access. Required unless
#                           BITBUCKET_REMOTE_URL is set. Only handed to git through a
#                           credential helper; never put in a URL, an argument or a file.
#   SITE_SUBFOLDER          Folder to publish into (default: screenshot-editor). Set but empty
#                           is an error, so a broken variable can never mean "the root".
#   BITBUCKET_PAGES_BRANCH  Branch Bitbucket serves (default: the remote's default branch, else main).
#   BITBUCKET_GIT_USERNAME  Git username for the token (default: x-token-auth).
#   BITBUCKET_REMOTE_URL    Push somewhere else instead, such as a local bare repository (tests).
#   PUBLISH_RETRY_DELAY     Seconds to wait before retry n, multiplied by n (default: 5).
#   GITHUB_SHA, GITHUB_REPOSITORY  Recorded in <SITE_SUBFOLDER>/version.json (default: "local").
set -euo pipefail

# Validate the subfolder before anything else: it decides what gets deleted in the site repo.
SITE_SUBFOLDER="${SITE_SUBFOLDER-screenshot-editor}"
if [[ ! "$SITE_SUBFOLDER" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "::error::SITE_SUBFOLDER must be one folder name of lowercase letters, digits and dashes (like \"screenshot-editor\"); got \"$SITE_SUBFOLDER\"." >&2
  exit 1
fi

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: bash $0 <site-dir>" >&2
  exit 2
fi
if [ ! -d "$1" ]; then
  echo "::error::Site directory \"$1\" does not exist." >&2
  exit 1
fi
SITE_DIR="$(cd "$1" && pwd -P)"
if [ ! -s "$SITE_DIR/index.html" ]; then
  echo "::error::$SITE_DIR/index.html is missing or empty. Run \"npm run build\" first." >&2
  exit 1
fi
if ! grep -qF -- "/$SITE_SUBFOLDER/_next/" "$SITE_DIR/index.html"; then
  echo "::error::$SITE_DIR/index.html does not reference \"/$SITE_SUBFOLDER/_next/\". Build with NEXT_PUBLIC_BASE_PATH=/$SITE_SUBFOLDER so the pages load their scripts from the subfolder." >&2
  exit 1
fi

# The site must be complete. A deploy keeps the old <subfolder>/_next/static/, so the result
# in the site repository cannot show this; check the folder itself, before anything is
# deleted. A partly copied out/ is refused here.
if [ -z "$(find "$SITE_DIR/_next/static" -type f -print -quit 2> /dev/null)" ]; then
  echo "::error::$SITE_DIR/_next/static/ is missing or empty. Publish the whole build output folder (out/), not a part of it." >&2
  exit 1
fi
# site_has <URL path below /<subfolder>/>: the site folder has the file that URL serves.
site_has() {
  local rel
  rel="$(printf '%b' "${1//%/\\x}")" # Undo %XX escapes, such as %5B for "[".
  case "$rel" in
    "" | */) [ -f "$SITE_DIR/${rel}index.html" ] ;;
    *) [ -f "$SITE_DIR/$rel" ] || [ -f "$SITE_DIR/$rel/index.html" ] ;;
  esac
}
# Every /_next/static/ file named in the HTML (also in the JSON of inline scripts, where the
# class below stops at the escaping backslash) and every href/src below /<subfolder>/.
site_html="$(find "$SITE_DIR" -type f -name '*.html' -exec cat -- {} +)"
mapfile -t references < <(
  {
    printf '%s\n' "$site_html" |
      { grep -oE "/$SITE_SUBFOLDER/_next/static/[A-Za-z0-9._~%+/-]+" || true; } |
      { grep -E '/[^/]+\.[A-Za-z0-9]+$' || true; }
    printf '%s\n' "$site_html" |
      { grep -oE "(href|src)=\"/$SITE_SUBFOLDER/[^\"?#]*" || true; } |
      sed -E 's/^(href|src)="//'
  } | LC_ALL=C sort -u
)
missing_references=()
for reference in "${references[@]}"; do
  if ! site_has "${reference#"/$SITE_SUBFOLDER/"}"; then
    missing_references+=("$reference")
  fi
done
if [ "${#missing_references[@]}" -gt 0 ]; then
  echo "::error::The site in $SITE_DIR is incomplete: its pages load or link to ${#missing_references[@]} path(s) that are not in it, such as: ${missing_references[*]:0:5}" >&2
  exit 1
fi

if [ -n "${BITBUCKET_REMOTE_URL:-}" ]; then
  remote_url="$BITBUCKET_REMOTE_URL"
else
  workspace="$(printf '%s' "${BITBUCKET_WORKSPACE:-}" | tr '[:upper:]' '[:lower:]')"
  if [ -z "$workspace" ] || [ -z "${BITBUCKET_TOKEN:-}" ]; then
    echo "::error::BITBUCKET_WORKSPACE and BITBUCKET_TOKEN are both required." >&2
    exit 1
  fi
  if [[ ! "$workspace" =~ ^[a-z0-9_-]+$ ]]; then
    echo "::error::BITBUCKET_WORKSPACE must be a workspace ID (letters, digits, dashes and underscores); got \"$workspace\"." >&2
    exit 1
  fi
  if [[ "$workspace" == *_* ]]; then
    echo "::warning::BITBUCKET_WORKSPACE \"$workspace\" contains \"_\", which is not valid in a host name, so https://$workspace.bitbucket.io/ may not work." >&2
  fi
  remote_url="https://bitbucket.org/$workspace/$workspace.bitbucket.io.git"
fi

if [ -n "${BITBUCKET_TOKEN:-}" ] && [[ "$BITBUCKET_TOKEN" == *[[:space:]]* ]]; then
  echo "::error::BITBUCKET_TOKEN contains whitespace or a line break; copy the token again." >&2
  exit 1
fi
if [ -n "${BITBUCKET_PAGES_BRANCH:-}" ] && ! git check-ref-format --branch "$BITBUCKET_PAGES_BRANCH" > /dev/null 2>&1; then
  echo "::error::BITBUCKET_PAGES_BRANCH \"$BITBUCKET_PAGES_BRANCH\" is not a valid branch name." >&2
  exit 1
fi

retry_delay="${PUBLISH_RETRY_DELAY:-5}"
if [[ ! "$retry_delay" =~ ^[0-9]+$ ]]; then
  echo "::error::PUBLISH_RETRY_DELAY must be a whole number of seconds; got \"$retry_delay\"." >&2
  exit 1
fi

# Git authentication without the token touching a URL, an argument, a file or the log:
# the helper below is plain text that refers to $BITBUCKET_TOKEN by name, and the shell git
# starts for it reads the value from the environment. It is passed as command-scope config
# through GIT_CONFIG_COUNT (git 2.31+), so nothing is written to any git config file. The
# empty helper first clears helpers from system or global config, and the helper only
# answers for https://bitbucket.org, so a remote override elsewhere never receives the token.
# printf, not echo: dash's echo would mangle backslashes in the token.
# shellcheck disable=SC2016 # The $ expressions are for the helper's shell, not this one.
credential_helper='!f() { test "$1" = get || exit 0; printf "username=%s\npassword=%s\n" "${BITBUCKET_GIT_USERNAME:-x-token-auth}" "${BITBUCKET_TOKEN:-}"; }; f'
config_index="${GIT_CONFIG_COUNT:-0}"
if [[ ! "$config_index" =~ ^[0-9]+$ ]]; then
  config_index=0
fi
export "GIT_CONFIG_KEY_${config_index}=credential.helper" "GIT_CONFIG_VALUE_${config_index}="
config_index=$((config_index + 1))
export "GIT_CONFIG_KEY_${config_index}=credential.https://bitbucket.org.helper" "GIT_CONFIG_VALUE_${config_index}=$credential_helper"
export GIT_CONFIG_COUNT=$((config_index + 1))
export BITBUCKET_TOKEN="${BITBUCKET_TOKEN:-}"
export BITBUCKET_GIT_USERNAME="${BITBUCKET_GIT_USERNAME:-x-token-auth}"
export BITBUCKET_PAGES_BRANCH="${BITBUCKET_PAGES_BRANCH:-}"
# Fail instead of waiting for a password prompt; leave Git LFS files outside the subfolder alone.
export GIT_TERMINAL_PROMPT=0
export GIT_LFS_SKIP_SMUDGE=1

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
max_attempts=3
# Logged without any user:password@ part, in case an override URL carries one.
echo "Publishing $SITE_DIR to $SITE_SUBFOLDER/ in $(printf '%s' "$remote_url" | sed -E 's#(://)[^/@]*@#\1***@#')"
# Each attempt is its own bash process: bash ignores `set -e` inside anything called from
# if/&&/||, so a function here could carry on after a failed copy and commit a deleted site.
for attempt in $(seq 1 "$max_attempts"); do
  echo "::group::Publish attempt $attempt of $max_attempts"
  if bash "$script_dir/publish-attempt.sh" "$SITE_DIR" "$SITE_SUBFOLDER" "$remote_url"; then
    echo "::endgroup::"
    echo "Publish of $SITE_SUBFOLDER/ finished (attempt $attempt of $max_attempts)."
    exit 0
  fi
  echo "::endgroup::"
  if [ "$attempt" -lt "$max_attempts" ]; then
    wait_seconds=$((retry_delay * attempt))
    echo "::warning::Publish attempt $attempt of $max_attempts failed; retrying in ${wait_seconds}s." >&2
    sleep "$wait_seconds"
  fi
done
echo "::error::Publishing failed after $max_attempts attempts. Nothing was force-pushed; paths outside $SITE_SUBFOLDER/ were not changed." >&2
exit 1
