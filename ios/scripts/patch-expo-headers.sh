#!/bin/bash
# Patches Expo header files to add nullability specifiers
# Run this before pod install to fix nullability warnings

PROJECT_ROOT="$(dirname "$0")/../.."

add_nullability() {
  local file="$1"

  if [ ! -f "$file" ]; then
    return
  fi

  # Skip if already patched
  if grep -q "NS_ASSUME_NONNULL_BEGIN" "$file"; then
    echo "Already patched: $(basename "$file")"
    return
  fi

  # Create patched version
  local tmp=$(mktemp)
  local found_import=0
  local added=0

  while IFS= read -r line || [ -n "$line" ]; do
    echo "$line" >> "$tmp"

    # Add NS_ASSUME_NONNULL_BEGIN after the last #import line
    if [[ "$line" == "#import"* ]]; then
      found_import=1
    elif [ $found_import -eq 1 ] && [ $added -eq 0 ] && [[ "$line" != "#import"* ]] && [[ -n "$line" ]]; then
      sed -i '' '$ d' "$tmp"
      echo "" >> "$tmp"
      echo "NS_ASSUME_NONNULL_BEGIN" >> "$tmp"
      echo "" >> "$tmp"
      echo "$line" >> "$tmp"
      added=1
    fi
  done < "$file"

  echo "" >> "$tmp"
  echo "NS_ASSUME_NONNULL_END" >> "$tmp"

  mv "$tmp" "$file"
  echo "Patched: $(basename "$file")"
}

echo "Patching Expo headers..."

# expo-file-system headers (check both possible locations)
for path in "ios/EXSessionTasks" "ios/Legacy/EXSessionTasks"; do
  add_nullability "$PROJECT_ROOT/node_modules/expo-file-system/$path/EXSessionTaskDelegate.h"
  add_nullability "$PROJECT_ROOT/node_modules/expo-file-system/$path/EXSessionCancelableUploadTaskDelegate.h"
  add_nullability "$PROJECT_ROOT/node_modules/expo-file-system/$path/EXSessionResumableDownloadTaskDelegate.h"
  add_nullability "$PROJECT_ROOT/node_modules/expo-file-system/$path/EXSessionDownloadTaskDelegate.h"
  add_nullability "$PROJECT_ROOT/node_modules/expo-file-system/$path/EXSessionUploadTaskDelegate.h"
done

# expo-modules-core headers
add_nullability "$PROJECT_ROOT/node_modules/expo-modules-core/ios/Interfaces/FileSystem/EXFileSystemInterface.h"
add_nullability "$PROJECT_ROOT/node_modules/expo-modules-core/ios/Legacy/NativeModulesProxy/EXNativeModulesProxy.h"
add_nullability "$PROJECT_ROOT/node_modules/expo-modules-core/ios/JSI/EXJSIInstaller.h"
add_nullability "$PROJECT_ROOT/node_modules/expo-modules-core/ios/EXLegacyExpoViewProtocol.h"

echo "Done"
