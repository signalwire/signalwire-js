#!/usr/bin/env sh

set -e
mkdir -p public
echo "<h1>JS SDK Playground</h1>" > public/index.html

git fetch origin

echo "===="
echo $(git for-each-ref --format='%(refname:short)' refs/heads)
echo "===="
echo $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/)
echo "===="
echo $(git for-each-ref --format='%(refname:short)')
echo "===="

# ref: https://stackoverflow.com/a/57748047
# for branch in $(git for-each-ref --format='%(refname:short)' refs/heads); do
#   folder="public/$branch"
#   echo "\nCreate folder $folder"
#   mkdir -p $folder
#   echo "Checkout $branch"
#   git checkout "$branch"
  
#   echo "NPM install and Build SDK for this branch"
#   # TODO: Build only JS/required sdks 
#   npm i && npm run build
  
#   echo "Build playgrounds"
#   VITE_BASE="/$branch/" npm run -w=@sw-internal/playground-js build

#   echo "Move static assets to 'public'"
#   cp -R ./internal/playground-js/dist/* $folder
#   echo "\n"
# done