#!/bin/bash
# Check that one or more files exist in the learner workspace.
#
# Bash validators run from the course directory, so always reference learner
# files through INSTRKTR_WORKSPACE.

WS="$INSTRKTR_WORKSPACE"
MISSING=""

[ ! -f "$WS/src/index.js" ] && MISSING="$MISSING src/index.js"
[ ! -f "$WS/package.json" ] && MISSING="$MISSING package.json"
[ ! -f "$WS/README.md" ] && MISSING="$MISSING README.md"

if [ -n "$MISSING" ]; then
  echo "Missing files:$MISSING"
  exit 1
fi

echo "All required files are present."
exit 0
