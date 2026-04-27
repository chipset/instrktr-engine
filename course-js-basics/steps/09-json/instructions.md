# Working with JSON

Zowe CLI returns JSON when called with `--rfj`. You'll parse it in `listElements()` every time the pipeline runs. This step practises the exact data shape you'll see.

## JSON basics

**JSON** (JavaScript Object Notation) is a text format for structured data. It looks like JavaScript object literals, but all keys must be quoted:

```json
{
  "data": [
    { "elmName": "HELLOPGM", "elmType": "COBOL", "envName": "DEV" },
    { "elmName": "WORLDPGM", "elmType": "COBOL", "envName": "DEV" },
    { "elmName": "DEPLOY",   "elmType": "JCL",   "envName": "DEV" }
  ]
}
```

## Parsing and stringifying

```js
// String → JavaScript object
const obj = JSON.parse(jsonString);

// JavaScript object → string
const str = JSON.stringify(obj, null, 2);  // null, 2 = pretty-print with 2-space indent
```

Both throw on invalid input — which is why you wrap them in try/catch (Step 8).

## The exercise

Open [parse-response.js](open:parse-response.js). A `MOCK_RESPONSE` string is already defined — it is the exact JSON format Zowe returns from `zowe endevor list elements --rfj`.

Complete the `processResponse(jsonString)` function to:

1. Parse the JSON string
2. Extract the `data` array
3. Filter for only COBOL elements
4. Map to an array of element names
5. Return a summary object:
   ```js
   { total: 3, cobol: 2, names: ['HELLOPGM', 'WORLDPGM'] }
   ```

Then log the summary as a pretty-printed JSON string using `JSON.stringify`.

Expected output:
```json
{
  "total": 3,
  "cobol": 2,
  "names": [
    "HELLOPGM",
    "WORLDPGM"
  ]
}
```

Run it: `node parse-response.js`

Click **Check My Work** when done — and congratulations on completing the pre-course!
