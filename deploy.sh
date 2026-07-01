#!/bin/bash
# 部署脚本:构建 VitePress 并推送到 gh-pages
# 用法:./deploy.sh [commit message]

set -e

MSG="${1:-deploy: update site}"
DIST_TMP="/tmp/wbw-dist-$$"
ON_GHPAGES=false

cleanup() {
  if [ "$ON_GHPAGES" = true ]; then
    echo "异常退出,切回 main..."
    git checkout main --force
  fi
  rm -rf "$DIST_TMP"
}
trap cleanup EXIT

BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "当前不在 main 分支(在 $BRANCH),请先切回 main"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "main 分支有未提交的改动,先提交:"
  git add -A
  git commit -m "$MSG"
  git push origin main
  echo "main 已提交并推送"
else
  echo "main 分支干净"
fi

if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install
fi

echo "构建中..."
npx vitepress build

rm -rf "$DIST_TMP"
cp -r .vitepress/dist "$DIST_TMP"

if ! git show-ref --verify --quiet refs/heads/gh-pages; then
  echo "创建 gh-pages 分支..."
  git checkout --orphan gh-pages
  git rm -rf .
  git commit --allow-empty -m "init gh-pages"
  git push origin gh-pages
  git checkout main --force
fi

git checkout gh-pages
ON_GHPAGES=true

find . -maxdepth 1 \
  ! -name '.' \
  ! -name '.git' \
  ! -name 'node_modules' \
  ! -name '.vite' \
  -exec rm -rf {} +

cp -r "$DIST_TMP"/* .
touch .nojekyll
echo "wbw.fangs.cc" > CNAME

git add -A -- ':!node_modules' ':!.vite'

if git diff --cached --quiet; then
  echo "没有变化,跳过部署"
else
  git commit -m "$MSG"
  git push origin gh-pages
  echo "已部署到 gh-pages"
fi

git checkout main --force
ON_GHPAGES=false

echo "完成!等 1-2 分钟后刷新 wbw.fangs.cc 查看"
