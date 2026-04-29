#!/bin/bash
# Check that a file exists and contains expected content.

TARGET="$INSTRKTR_WORKSPACE/src/index.js"

if [ ! -f "$TARGET" ]; then
  echo "src/index.js not found. Create it first."
  exit 1
fi

if ! grep -q "function" "$TARGET"; then
  echo "src/index.js should define at least one function."
  exit 1
fi

if ! grep -Eq "export[[:space:]]+default|module\.exports" "$TARGET"; then
  echo "Function found, but nothing is exported yet."
  exit 2
fi

echo "src/index.js looks great."
exit 0
