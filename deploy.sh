#!/usr/bin/env bash
# Publish an isolated checkout; never switch or clean the source worktree.
set -euo pipefail
cd "$(dirname "$0")"
[[ "$(git config --local user.name)" == imfangs && "$(git config --local user.email)" == mafangshuai@126.com ]] || { echo 'Unexpected project-local Git identity.' >&2; exit 1; }
case "$(git remote get-url origin)" in https://github.com/imfangs/wbw.git|git@github.com:imfangs/wbw.git) ;; *) echo 'Unexpected repository.' >&2; exit 1;; esac
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit intended changes before publishing.' >&2; exit 1; }
npm run docs:build
SOURCE_SHA=$(git rev-parse HEAD)
SOURCE_SHA="$SOURCE_SHA" node --input-type=module -e 'import{writeFileSync}from"node:fs";writeFileSync(".vitepress/dist/release.json",JSON.stringify({source:process.env.SOURCE_SHA,builtAt:new Date().toISOString()})+"\n")'
git fetch origin gh-pages
DEPLOY_DIR=$(mktemp -d /tmp/wbw-deploy.XXXXXX)
cleanup(){ git worktree remove --force "$DEPLOY_DIR" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git worktree add --detach "$DEPLOY_DIR" origin/gh-pages
git -C "$DEPLOY_DIR" rm -r --ignore-unmatch . >/dev/null
cp -R .vitepress/dist/. "$DEPLOY_DIR/"
touch "$DEPLOY_DIR/.nojekyll"
printf '%s\n' 'wbw.fangs.cc' > "$DEPLOY_DIR/CNAME"
git -C "$DEPLOY_DIR" add -A
if git -C "$DEPLOY_DIR" diff --cached --quiet; then echo 'Build unchanged'; exit 0; fi
git -C "$DEPLOY_DIR" commit -m "${1:-Publish reading homepage}"
git -C "$DEPLOY_DIR" push --progress origin HEAD:gh-pages
