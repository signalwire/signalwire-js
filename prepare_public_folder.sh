#!/usr/bin/env bash

set -e

# Create the public folder to be published on Pages
mkdir -p public
# Set an entrypoint to avoid 404 on Pages
echo "<h1>JS SDK Playground</h1>" > public/index.html

# Fetch origin to list the branches below
git fetch --no-tags

# Loop all the branches and - for each - build the SDK, build the playground-js
# and copy the `dist` folder in the global `public` folder.
for branch_name in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/); do
  # Remove `remote/` from refname
  branch=${branch_name/origin\//}
  if [[ $branch == "canary" ]]; then
    # canary branch is too old!
    echo "Skip canary branch"
    continue
  fi

  folder="public/$branch"
  echo "\nCreate folder $folder"
  mkdir -p $folder
  echo "Checkout $branch"
  git switch -f "$branch"
  
  echo "NPM install and Build SDK for this branch"
  # TODO: Build only JS/required sdks 
  npm i && npm run build
  
  echo "Build playgrounds"
  {
    # VITE_BASE used in internal/playground-js/vite.config.ts
    VITE_BASE="/$branch/" npm run -w=@sw-internal/playground-js build
    echo "Move static assets to 'public'"
    cp -R ./internal/playground-js/dist/* $folder
  } || { 
    echo "Error building $branch"
  }

  echo "\n"
done