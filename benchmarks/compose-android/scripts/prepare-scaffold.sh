#!/usr/bin/env bash
# Create the neutral Kotlin and Jetpack Compose scaffold that every generator copies.
# Usage: prepare-scaffold.sh <work-directory>
# Requires JDK 17 or newer, Gradle on PATH (only to write the wrapper) and ANDROID_HOME
# with the platform and build tools named in scaffold/app/build.gradle.kts.
set -euo pipefail

work="${1:?usage: prepare-scaffold.sh <work-directory>}"
# A pinned default keeps runs reproducible; versions of libraries are pinned in libs.versions.toml.
gradle_version="${GRADLE_VERSION:-9.8.1}"
template="$(cd "$(dirname "$0")/.." && pwd)/scaffold"
scaffold="$work/scaffold"

if [ -e "$scaffold" ]; then
  echo "$scaffold already exists; previous scaffolds are immutable" >&2
  exit 1
fi
: "${ANDROID_HOME:?set ANDROID_HOME to an Android SDK}"
mkdir -p "$work"
cp -R "$template" "$scaffold"

# The wrapper is generated outside the project, so Gradle never evaluates the Android build.
wrapper="$(mktemp -d)"
(
  cd "$wrapper"
  touch settings.gradle.kts
  gradle wrapper --gradle-version "$gradle_version" --quiet
)
cp -R "$wrapper/gradlew" "$wrapper/gradlew.bat" "$wrapper/gradle" "$scaffold/"
rm -rf "$wrapper"

(
  cd "$scaffold"
  # One build and one capture prove the toolchain and warm the Gradle cache for every run.
  ./gradlew --quiet assembleDebug
  ./gradlew --quiet testDebugUnitTest -Proborazzi.test.record=true
  rm -rf .gradle .kotlin build app/build
  node -e "const fs=require('fs');const toml=fs.readFileSync('gradle/libs.versions.toml','utf8');const section=toml.split('[versions]')[1].split('[')[0];const versions=Object.fromEntries([...section.matchAll(/^(\w+)\s*=\s*\"([^\"]+)\"/gm)].map(m=>[m[1],m[2]]));console.log(JSON.stringify({gradle:process.argv[1],...versions},null,2))" \
    "$gradle_version" >../scaffold.json
)
echo "Scaffold ready: $scaffold (versions in $work/scaffold.json)"
