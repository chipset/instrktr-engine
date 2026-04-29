#!/bin/bash
# Run an authoritative CLI check in the learner workspace.

cd "$INSTRKTR_WORKSPACE" || {
  echo "Could not enter the learner workspace."
  exit 1
}

OUTPUT=$(npm test 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "Tests failed:"
  echo "$OUTPUT" | head -c 300
  exit 1
fi

echo "All tests pass."
exit 0
