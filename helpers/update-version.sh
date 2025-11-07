#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <new-version|major|minor|patch>" >&2
  exit 1
fi

VERSION_ARG=$1
FILE="src/manifest.json"

if [ ! -f "$FILE" ]; then
  echo "File $FILE not found!" >&2
  exit 1
fi

# Extract current version
CURRENT_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[0-9]\+\.[0-9]\+\.[0-9]\+"' "$FILE" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

if [ -z "$CURRENT_VERSION" ]; then
  echo "Could not find current version in $FILE" >&2
  exit 1
fi

# Parse current version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Determine new version
case "$VERSION_ARG" in
  "major")
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  "minor")
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  "patch")
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
  *)
    # Assume it's a specific version number
    NEW_VERSION=$VERSION_ARG
    ;;
esac

# Update version field in JSON with flexible spacing
sed -i '' -E "s|\"version\"[[:space:]]*:[[:space:]]*\"[0-9]+\.[0-9]+\.[0-9]+\"|\"version\": \"$NEW_VERSION\"|" "$FILE"
if [ $? -ne 0 ]; then
  echo "Failed to update version. Aborting." >&2
  exit 1
fi

echo "Version updated from $CURRENT_VERSION to $NEW_VERSION in $FILE" >&2

# Output the version number for capture
echo "$NEW_VERSION"
