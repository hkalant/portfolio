#!/usr/bin/env bash
# Check that a deploy to https://<workspace>.bitbucket.io/<SITE_SUBFOLDER>/ is live and complete.
#
# Usage: bash scripts/check-live.sh <site-dir>
#
# Waits until <SITE_SUBFOLDER>/version.json shows GITHUB_SHA. If it never does, that is a
# warning (Bitbucket may serve another branch, or need longer), not a failure. Once it is
# live, the pages and every /_next/static/ file the local HTML references must load with
# the right content type, or the script exits 1. A few more checks only print warnings.
#
# Environment:
#   BITBUCKET_WORKSPACE   Bitbucket workspace ID; the site is https://<workspace>.bitbucket.io/.
#   SITE_SUBFOLDER        Folder the site lives in (default: screenshot-editor).
#   GITHUB_SHA            Commit that should be live (default: "local", as publish writes it).
#   CHECK_LIVE_TIMEOUT    Seconds to wait for version.json (default: 300).
#   CHECK_LIVE_INTERVAL   Seconds between polls (default: 15).
#   CHECK_LIVE_ORIGIN     Check another origin instead, such as http://127.0.0.1:4173 (tests).
#   GITHUB_STEP_SUMMARY   When set, the live URL and the results are appended to it.
set -euo pipefail

SITE_SUBFOLDER="${SITE_SUBFOLDER-screenshot-editor}"
if [[ ! "$SITE_SUBFOLDER" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "::error::SITE_SUBFOLDER must be one folder name of lowercase letters, digits and dashes; got \"$SITE_SUBFOLDER\"." >&2
  exit 1
fi
if [ "$#" -ne 1 ] || [ ! -s "$1/index.html" ]; then
  echo "Usage: bash $0 <site-dir>   (the directory that was published, with index.html)" >&2
  exit 2
fi
site_dir="$(cd "$1" && pwd -P)"
sha="${GITHUB_SHA:-local}"
timeout="${CHECK_LIVE_TIMEOUT:-300}"
interval="${CHECK_LIVE_INTERVAL:-15}"
if [[ ! "$timeout" =~ ^[0-9]+$ ]] || [[ ! "$interval" =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::CHECK_LIVE_TIMEOUT and CHECK_LIVE_INTERVAL must be whole numbers of seconds." >&2
  exit 1
fi

if [ -n "${CHECK_LIVE_ORIGIN:-}" ]; then
  origin="${CHECK_LIVE_ORIGIN%/}"
else
  # Computed here: environment changes made by the publish step do not reach this step.
  workspace="$(printf '%s' "${BITBUCKET_WORKSPACE:-}" | tr '[:upper:]' '[:lower:]')"
  if [[ ! "$workspace" =~ ^[a-z0-9_-]+$ ]]; then
    echo "::error::BITBUCKET_WORKSPACE must be set to a workspace ID; got \"$workspace\"." >&2
    exit 1
  fi
  origin="https://$workspace.bitbucket.io"
fi
sub_path="/$SITE_SUBFOLDER/"
site_url="$origin$sub_path"

curl_opts=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 2 --retry-connrefused)

# probe <GET|HEAD> <url>: sets status (000 when the request failed) and type (lowercase,
# without parameters such as charset). Redirects are not followed.
status=""
type=""
probe() {
  local args=("${curl_opts[@]}" --output /dev/null --write-out '%{http_code} %{content_type}')
  if [ "$1" = HEAD ]; then
    args+=(--head)
  fi
  local out
  out="$(curl "${args[@]}" "$2" 2> /dev/null)" || true
  status="${out%% *}"
  type=""
  if [[ "$out" == *" "* ]]; then
    type="${out#* }"
  fi
  status="${status:-000}"
  type="$(printf '%s' "${type%%;*}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
}

rows=()
hard_failures=0
warnings=0
record() { # record <PASS|FAIL|WARN> <check> <details>
  rows+=("| $2 | $1 | $3 |")
  case "$1" in
    PASS) echo "PASS  $2: $3" ;;
    FAIL)
      hard_failures=$((hard_failures + 1))
      echo "::error::$2: $3"
      ;;
    WARN)
      warnings=$((warnings + 1))
      echo "::warning::$2: $3"
      ;;
  esac
}

write_summary() { # write_summary <headline>
  if [ -z "${GITHUB_STEP_SUMMARY:-}" ]; then
    return 0
  fi
  {
    echo "### Bitbucket site"
    echo ""
    echo "Live URL: $site_url"
    echo ""
    echo "$1"
    if [ "${#rows[@]}" -gt 0 ]; then
      echo ""
      echo "| Check | Result | Details |"
      echo "| --- | --- | --- |"
      printf '%s\n' "${rows[@]}"
    fi
  } >> "$GITHUB_STEP_SUMMARY"
}

# 1. Wait for this commit's version.json (the query string gets past caches).
echo "Waiting up to ${timeout}s for ${site_url}version.json to show $sha"
started=$SECONDS
deadline=$((SECONDS + timeout))
live=false
while :; do
  body="$(curl "${curl_opts[@]}" --fail "${site_url}version.json?t=$(date +%s)" 2> /dev/null)" || body=""
  if [[ "$body" == *"$sha"* ]]; then
    live=true
    break
  fi
  remaining=$((deadline - SECONDS))
  if [ "$remaining" -le 0 ]; then
    break
  fi
  echo "Not live yet ($((SECONDS - started))s): version.json is ${body:-unavailable}"
  sleep "$((remaining < interval ? remaining : interval))"
done
if [ "$live" != true ]; then
  message="${site_url}version.json did not show $sha within ${timeout}s, so the live checks were skipped. Check which branch Bitbucket serves (set BITBUCKET_PAGES_BRANCH if it is not the repository's main branch) and whether the repository is private, then open $site_url."
  echo "::warning title=Site not live yet::$message"
  write_summary "Not confirmed: $message"
  exit 0
fi
echo "Live after $((SECONDS - started))s: $site_url"

# 2. Hard checks: the pages, and every static file their HTML loads.
check_page() { # check_page <path below the subfolder>
  probe GET "$site_url$1"
  if [ "$status" = 200 ] && [ "$type" = text/html ]; then
    record PASS "GET $sub_path$1" "200 $type"
  else
    record FAIL "GET $sub_path$1" "expected 200 text/html, got $status ${type:-(no content type)}"
  fi
}
# Every page in the build: each index.html outside _next/ and Next's not-found
# pages ("" is the site root).
mapfile -t pages < <(
  cd "$site_dir" &&
    find . -name index.html -not -path './_next/*' -not -path './404/*' -not -path './_not-found/*' |
    sed -e 's#^\./##' -e 's#index\.html$##' |
      LC_ALL=C sort
)
html_files=()
for page in "${pages[@]}"; do
  check_page "$page"
  html_files+=("$site_dir/${page}index.html")
done
# File URLs only: the class stops at quotes and the backslashes of escaped JSON in inline scripts.
mapfile -t assets < <(
  cat "${html_files[@]}" |
    { grep -oE "/$SITE_SUBFOLDER/_next/static/[A-Za-z0-9._~%+/-]+" || true; } |
    { grep -E '/[^/]+\.[A-Za-z0-9]+$' || true; } |
    LC_ALL=C sort -u
)
if [ "${#assets[@]}" -eq 0 ]; then
  record FAIL "Static files" "no /$SITE_SUBFOLDER/_next/static/ URLs found in the local HTML"
fi
asset_failures=0
for asset in "${assets[@]}"; do
  probe GET "$origin$asset"
  problem=""
  if [ "$status" != 200 ]; then
    problem="expected 200, got $status"
  else
    case "$asset" in
      *.css) [ "$type" = text/css ] || problem="expected text/css, got ${type:-(none)}" ;;
      *.js | *.mjs) [[ "$type" =~ ^(text|application)/(x-)?(javascript|ecmascript)$ ]] || problem="expected a JavaScript content type, got ${type:-(none)}" ;;
    esac
  fi
  if [ -n "$problem" ]; then
    asset_failures=$((asset_failures + 1))
    record FAIL "GET $asset" "$problem"
  fi
done
if [ "${#assets[@]}" -gt 0 ] && [ "$asset_failures" -eq 0 ]; then
  record PASS "Static files" "all ${#assets[@]} /_next/static/ files from the pages load with the right type"
fi

# 3. Warnings only: things that matter less, or that depend on how Bitbucket serves files.
mapfile -t payloads < <(find "$site_dir" -maxdepth 1 -type f -name '__next.*.txt' | LC_ALL=C sort)
if [ "${#payloads[@]}" -gt 0 ]; then
  payload="$(basename "${payloads[0]}")"
  probe GET "$site_url$payload"
  if [ "$status" = 200 ] && [ "$type" = text/plain ]; then
    record PASS "GET $sub_path$payload" "200 $type"
  else
    record WARN "GET $sub_path$payload" "expected 200 text/plain, got $status ${type:-(no content type)}; client-side navigation data may not load"
  fi
fi

probe HEAD "$site_url"
if [[ "$status" == 2?? ]]; then
  record PASS "HEAD $sub_path" "$status"
else
  record WARN "HEAD $sub_path" "expected 2xx, got $status"
fi

no_slash_url="$origin/$SITE_SUBFOLDER"
out="$(curl "${curl_opts[@]}" --output /dev/null --write-out '%{http_code} %{redirect_url}' "$no_slash_url" 2> /dev/null)" || true
no_slash_status="${out%% *}"
no_slash_target="${out#* }"
case "${no_slash_status:-000}" in
  3??) record PASS "GET /$SITE_SUBFOLDER" "$no_slash_status redirect to ${no_slash_target:-(no Location)}" ;;
  200) record PASS "GET /$SITE_SUBFOLDER" "200, served without a redirect" ;;
  *) record WARN "GET /$SITE_SUBFOLDER" "got ${no_slash_status:-000}; links to $no_slash_url without the trailing slash will not work" ;;
esac

if [ "$hard_failures" -gt 0 ]; then
  write_summary "Live with $sha, but $hard_failures check(s) failed and $warnings warning(s)."
  echo "::error::$hard_failures live check(s) failed for $site_url"
  exit 1
fi
write_summary "Live with $sha. All required checks passed ($warnings warning(s))."
echo "All required checks passed for $site_url ($warnings warning(s))."
