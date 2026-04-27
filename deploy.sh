#!/bin/bash
GIT=/usr/bin/git

set -e

cd "$(dirname "$0")"

echo "Staging all changes..."
$GIT add -A

if $GIT diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

echo "Enter a commit message (or press Enter for default):"
read -r msg
msg="${msg:-deploy: update}"

$GIT commit -m "$msg"

echo "Pushing to origin..."
$GIT push

echo "Done — Vercel will pick up the push automatically."
