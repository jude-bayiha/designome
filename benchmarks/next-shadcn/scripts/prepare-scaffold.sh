#!/usr/bin/env bash
# Create the neutral Next.js and shadcn/ui scaffold that every generator copies.
# Usage: prepare-scaffold.sh <work-directory>
set -euo pipefail

work="${1:?usage: prepare-scaffold.sh <work-directory>}"
next_version="${NEXT_VERSION:-16.3.8}"
# Pinned defaults keep runs reproducible and never execute a mutable tag.
shadcn_version="${SHADCN_VERSION:-4.21.0}"
lucide_react_version="${LUCIDE_REACT_VERSION:-1.48.0}"
recharts_version="${RECHARTS_VERSION:-3.10.1}"
scaffold="$work/scaffold"

if [ -e "$scaffold" ]; then
  echo "$scaffold already exists; previous scaffolds are immutable" >&2
  exit 1
fi
mkdir -p "$work"

npx --yes "create-next-app@$next_version" "$scaffold" \
  --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" \
  --use-npm --skip-install --disable-git --yes
(
  cd "$scaffold"
  npm install
  npm install "lucide-react@$lucide_react_version" "recharts@$recharts_version"
  npx --yes "shadcn@$shadcn_version" init --yes --defaults
  npx --yes "shadcn@$shadcn_version" add --yes \
    alert avatar badge breadcrumb button calendar card chart checkbox command \
    dialog dropdown-menu input label pagination popover progress \
    radio-group scroll-area select separator sheet sidebar skeleton \
    switch table tabs textarea toggle-group tooltip
  npm run build
  rm -rf .next
  SHADCN_VERSION="$shadcn_version" node -e "const p=require('./package.json');const l=require('./package-lock.json');const v=n=>l.packages['node_modules/'+n]?.version??null;console.log(JSON.stringify({next:v('next'),react:v('react'),tailwindcss:v('tailwindcss'),shadcn:process.env.SHADCN_VERSION,dependencies:p.dependencies},null,2))" \
    >../scaffold.json
)
echo "Scaffold ready: $scaffold (versions in $work/scaffold.json)"
