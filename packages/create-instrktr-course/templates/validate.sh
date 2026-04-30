#!/bin/bash
cd "$INSTRKTR_WORKSPACE" || exit 1

if [ ! -f "hello.txt" ]; then
  echo "hello.txt not found. Create it in the workspace root."
  exit 1
fi

CONTENT=$(cat hello.txt)
TRIMMED=$(echo "$CONTENT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [ "$TRIMMED" != "Hello, Instrktr!" ]; then
  echo "hello.txt should contain exactly: Hello, Instrktr!"
  exit 1
fi

echo "Looks good!"
exit 0
