#!/usr/bin/env bash

set -e

# Create the public folder to be published on Pages
rm -rf public
mkdir -p public
echo "<h1>JS SDK Playground</h1>" > public/index.html

# Fetch origin to list the branches below
git fetch --prune --no-tags

# List remote branches, skip HEAD & canary, strip "origin/"
for remote in $( \
  git branch -r \
    | awk '{print $1}' \
    | grep '^origin/' \
    | grep -vE '^origin/(HEAD|canary)$' \
); do
  branch="${remote#origin/}"
      
  echo "Processing branch: $branch"

  echo "Creating public/$branch"
  mkdir -p "public/$branch"

  echo "Checkout $branch"
  git switch -f "$branch"

  echo "NPM install and Build SDK for this branch"
  # TODO: Build only JS/required sdks 
  npm ci && npm run build

  echo "Building playgrounds for $branch"
  {
    # VITE_BASE used in internal/playground-js/vite.config.ts
    VITE_BASE="/signalwire-js/$branch/" npm run -w=@sw-internal/playground-js build
    echo "Move static assets to 'public'"
    cp -R ./internal/playground-js/dist/* $folder
  } || { 
    echo "Error building $branch"
  }

echo "\n"
done