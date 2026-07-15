#!/usr/bin/env bash
# Create a new project from template
# Usage: bash workspace/scripts/new_project.sh <name> <type: python|node>

NAME="${1:-my-project}"
TYPE="${2:-python}"
DEST="workspace/projects/$NAME"

if [ -d "$DEST" ]; then
  echo "Project already exists: $DEST"
  exit 1
fi

TEMPLATE_DIR="workspace/templates/${TYPE}-project"
if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Unknown template: $TYPE (available: python, node)"
  exit 1
fi

cp -r "$TEMPLATE_DIR" "$DEST"
sed -i "s/{project_name}/$NAME/g" "$DEST"/**/* 2>/dev/null || true
cd "$DEST" && git init && git add . && git commit -m "Initial commit ($TYPE project)" -q
echo "Created project: $DEST"
echo "cd $DEST"
