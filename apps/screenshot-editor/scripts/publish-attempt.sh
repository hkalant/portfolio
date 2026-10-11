#!/usr/bin/env bash
# One attempt at publishing a site into <subfolder>/ of a static-site repository.
# Run by publish-bitbucket.sh, which validates the inputs and sets up git authentication.
#
# Usage: bash scripts/publish-attempt.sh <absolute-site-dir> <subfolder> <remote-url>
#
# Works in a fresh temporary clone: fetches the served branch (depth 1), replaces
# <subfolder>/ while keeping <subfolder>/_next/static/ (hashed files that pages still cached
# in browsers may ask for), checks that nothing outside <subfolder>/ changed, then commits
# and pushes as a fast-forward. Any failure exits non-zero before the push.
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: bash $0 <absolute-site-dir> <subfolder> <remote-url>" >&2
  exit 2
fi
site_dir="$1"
sub="$2"
remote_url="$3"
# Same checks as publish-bitbucket.sh, so this script is safe to run on its own too.
if [[ ! "$sub" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Invalid subfolder \"$sub\"." >&2
  exit 1
fi
if [[ "$site_dir" != /* ]] || [ ! -s "$site_dir/index.html" ]; then
  echo "The site directory must be an absolute path containing index.html; got \"$site_dir\"." >&2
  exit 1
fi
# Checked in the site folder, not after the copy: the old <sub>/_next/static/ is kept, so
# the merged tree would have one even when this site has none.
if [ -z "$(find "$site_dir/_next/static" -type f -print -quit 2> /dev/null)" ]; then
  echo "The site directory has no files in _next/static/; got \"$site_dir\"." >&2
  exit 1
fi

sha="${GITHUB_SHA:-local}"
repo="${GITHUB_REPOSITORY:-local}"
# Both go into JSON and a commit message as they are, so allow only plain characters.
if [[ ! "$sha" =~ ^[A-Za-z0-9]+$ ]] || [[ ! "$repo" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "GITHUB_SHA or GITHUB_REPOSITORY has unexpected characters." >&2
  exit 1
fi

# Inherited repository variables (as inside a git hook) would point git at another repository.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_NAMESPACE

work="$(mktemp -d "${TMPDIR:-/tmp}/publish-attempt.XXXXXX")"
trap 'rm -rf "$work"' EXIT
repo_dir="$work/repo"

git init --quiet --template= "$repo_dir"
cd "$repo_dir"
# Local config of this throwaway repository wins over the global config of the machine:
# no hooks, no commit signing, a fixed bot identity.
git config core.hooksPath /dev/null
git config commit.gpgsign false
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git remote add origin "$remote_url"

# 1. Which branch to publish to. An error (auth, network, missing repository) fails here.
symref="$(git ls-remote --symref origin HEAD)"
default_branch="$(printf '%s\n' "$symref" | awk '$1 == "ref:" && $3 == "HEAD" && !done { sub("^refs/heads/", "", $2); print $2; done = 1 }')"
branch="${BITBUCKET_PAGES_BRANCH:-${default_branch:-main}}"
if ! git check-ref-format --branch "$branch" > /dev/null; then
  echo "Invalid branch name \"$branch\"." >&2
  exit 1
fi
echo "Remote default branch: ${default_branch:-(none advertised, the repository may be empty)}. Publishing to: $branch"

# 2. Start from the branch if it exists. Exit code 2 means "no such ref"; anything else
#    non-zero is a real error and must not be mistaken for an empty repository.
rc=0
heads="$(git ls-remote --exit-code origin "refs/heads/$branch")" || rc=$?
if [ "$rc" -eq 0 ] && printf '%s\n' "$heads" | awk -v ref="refs/heads/$branch" '$2 == ref { found = 1 } END { exit !found }'; then
  git fetch --quiet --depth 1 --no-tags origin "+refs/heads/$branch:refs/remotes/origin/$branch"
  git checkout --quiet -B "$branch" "refs/remotes/origin/$branch"
  echo "Starting from $branch at $(git rev-parse --short HEAD)."
elif [ "$rc" -eq 0 ] || [ "$rc" -eq 2 ]; then
  git symbolic-ref HEAD "refs/heads/$branch"
  echo "Branch $branch does not exist yet; it will be created."
else
  echo "Could not list branches of the remote (git exit code $rc)." >&2
  exit "$rc"
fi

# 3. Replace <sub>/ but keep <sub>/_next/static/. Anything that is not a plain directory
#    where a directory is expected (a file or a symlink) is removed, so that copying can
#    never write through a link to a path outside <sub>/.
target="$repo_dir/$sub"
for path in "$target" "$target/_next" "$target/_next/static"; do
  if [ -L "$path" ] || { [ -e "$path" ] && [ ! -d "$path" ]; }; then
    rm -f -- "$path"
  fi
done
if [ -d "$target" ]; then
  find "$target" -mindepth 1 -maxdepth 1 ! -name _next -exec rm -rf -- {} +
fi
if [ -d "$target/_next" ]; then
  find "$target/_next" -mindepth 1 -maxdepth 1 ! -name static -exec rm -rf -- {} +
fi
if [ -d "$target/_next/static" ]; then
  find "$target/_next/static" -type l -exec rm -f -- {} +
fi
mkdir -p "$target"
cp -R -- "$site_dir/." "$target/"

# 4. What is deployed. No timestamp, so the same input gives the same output.
printf '{"sha":"%s","repo":"%s"}\n' "$sha" "$repo" > "$target/version.json"

# 5. Stage <sub>/ only. -f because the site repository may have a .gitignore that matches
#    build output such as _next or *.txt.
git add --all --force -- "$sub"

# (That the site itself is complete was checked before anything was deleted; these and the
# list comparison below check that the copy into <sub>/ worked.)
if [ ! -s "$sub/index.html" ] || [ ! -d "$sub/_next/static" ]; then
  echo "Verification failed: $sub/index.html or $sub/_next/static is missing." >&2
  exit 1
fi
expected="$work/expected-files"
tracked="$work/tracked-files"
(cd "$site_dir" && find . \( -type f -o -type l \) -print | sed 's|^\./||' | LC_ALL=C sort) > "$expected"
git ls-files -z -- "$sub/" | tr '\0' '\n' | sed "s|^$sub/||" | LC_ALL=C sort > "$tracked"
missing="$(LC_ALL=C comm -23 "$expected" "$tracked")"
if [ -n "$missing" ]; then
  echo "Verification failed: these site files are not tracked under $sub/:" >&2
  printf '%s\n' "$missing" | sed -n '1,20p' >&2
  exit 1
fi
staged="$work/staged-files"
git diff --cached --no-renames --name-only -z > "$staged"
outside="$(tr '\0' '\n' < "$staged" | grep -v "^$sub/" || true)"
if [ -n "$outside" ]; then
  echo "Verification failed: paths outside $sub/ are staged:" >&2
  printf '%s\n' "$outside" | sed -n '1,20p' >&2
  exit 1
fi

# 6. Commit and push (a fast-forward; never forced).
if git diff --cached --quiet; then
  echo "No changes to deploy: $sub/ on $branch already matches this build."
  exit 0
fi
git commit --quiet --no-verify -m "Deploy $sub from $repo@${sha:0:7}"
git push --quiet --no-verify origin "HEAD:refs/heads/$branch"
echo "Pushed to $branch:"
git --no-pager show --stat HEAD
