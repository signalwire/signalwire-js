#!/usr/bin/env bash

set -e

# Create the public folder to be published on Pages
rm -rf public
mkdir -p public
echo "<h1>JS SDK Playground</h1>" > public/index.html

# Fetch origin to list the branches below
git fetch --prune --no-tags

# Loop all the branches and - for each - build the SDK, build the playground-js
# and copy the `dist` folder in the global `public` folder.
for remote in $( \
  git branch -r \
    | awk '{print $1}' \
    | grep '^origin/' \
    | grep -vE '^origin/(HEAD|canary)$' \
); do
  branch="${remote#origin/}"
      
  echo "======================================"
  echo " Processing branch: $branch"
  echo "======================================"

  echo "Creating public/$branch"
  mkdir -p "public/$branch"

  echo "Checkout $branch"
  git switch -f "$branch"

  echo "NPM install and Build SDK for this branch"
  # TODO: Build only JS/required sdks
    { npm ci && npm run build; } \
    || { echo "SDK build failed for '$branch', skipping"; continue; }

  echo "Building playground for $branch"
  # VITE_BASE used in internal/playground-js/vite.config.ts
  { VITE_BASE="/signalwire-js/$branch/" \
      npm run -w=@sw-internal/playground-js build \
    && cp -R internal/playground-js/dist/* "public/$branch/"; } \
    || { echo "Playground build failed for '$branch', skipping"; continue; }

  echo "Building docs for $branch"
  { npm run docs \
    && cp -R docs "public/$branch/docs"; } \
    || { echo "Docs build failed for '$branch', skipping docs"; }


  echo "Completed $branch"
  echo "\n"
done