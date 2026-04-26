# Initialize the Project

In this course you will build a JavaScript-based mainframe DevOps pipeline that:

- Uses **Gulp** as the task runner to orchestrate each stage
- Calls **Zowe CLI** with the **Endevor plugin** to list, retrieve, and push source elements on z/OS
- Tests every component with **Mocha** and **Sinon** — without requiring a live mainframe connection

## What you will build

```
my-project/
├── gulpfile.js             ← Gulp tasks (list, retrieve, test, deploy)
├── zowe.config.json        ← Zowe connection profiles
├── src/
│   └── endevor.js          ← EndevorService class wrapping Zowe CLI calls
└── test/
    └── endevor.test.js     ← Mocha + Sinon tests
```

## Step 1: Initialize the project

In the integrated terminal (`Ctrl+\``) run:

```bash
npm init -y
```

This creates `package.json` with default values. Now install all the tools for this course:

```bash
npm install --save-dev gulp mocha chai sinon
```

| Package | Purpose |
|---|---|
| `gulp` | Task runner and pipeline engine |
| `mocha` | Test framework |
| `chai` | Assertion library (`expect`) |
| `sinon` | Stub library for isolating Zowe CLI calls in tests |

Once the install finishes, click **Check My Work**.
