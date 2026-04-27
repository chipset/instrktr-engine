# Configure Zowe for Endevor

Zowe CLI stores connection details in a **team configuration file** (`zowe.config.json`). A template has been scaffolded for you — open [zowe.config.json](open:zowe.config.json) and fill in your site's values.

## Two profiles to configure

### `endevor` — the REST API connection

```json
"endevor": {
  "type": "endevor",
  "properties": {
    "host": "mainframe.example.com",
    "port": 8080,
    "basePath": "EndevorService/api/v2",
    "protocol": "https"
  }
}
```

| Field | Description |
|---|---|
| `host` | Hostname of your Endevor REST API server |
| `port` | Typically `8080` (HTTP) or `8443` (HTTPS) |
| `basePath` | URL prefix — ask your admin; usually `EndevorService/api/v2` |
| `protocol` | `"https"` for production; `"http"` for local dev |

### `endevor-location` — the inventory location

```json
"endevor-location": {
  "type": "endevor-location",
  "properties": {
    "instance":     "ENDEVOR",
    "environment":  "DEV",
    "stageNumber":  "1",
    "system":       "MYAPP",
    "subsystem":    "MAIN",
    "type":         "*"
  }
}
```

| Field | Description |
|---|---|
| `instance` | Endevor configuration name (your admin knows this) |
| `environment` | Where your source lives: `DEV`, `TEST`, `PROD`, etc. |
| `stageNumber` | Stage within the environment: `"1"` or `"2"` |
| `system` / `subsystem` | The Endevor system and subsystem to target |

> **No mainframe access yet?** Leave the placeholder values as-is (`endevor.example.com`, `MYAPP`, etc.) — the validator checks that the file is correctly structured, not that it can actually connect.

Click **Check My Work** when done.
