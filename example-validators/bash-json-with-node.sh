#!/bin/bash
# Validate JSON content without requiring jq.

CONFIG="$INSTRKTR_WORKSPACE/zowe.config.json"

if [ ! -f "$CONFIG" ]; then
  echo "zowe.config.json not found."
  exit 1
fi

HOST=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
process.stdout.write(config.profiles?.zosmf?.properties?.host ?? '');
" "$CONFIG" 2>/dev/null)

if [ -z "$HOST" ]; then
  echo "zowe.config.json is missing profiles.zosmf.properties.host."
  exit 1
fi

echo "Zowe config looks correct. Host: $HOST"
exit 0
