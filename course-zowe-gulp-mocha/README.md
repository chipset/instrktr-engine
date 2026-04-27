# Mainframe DevOps: Gulp, Zowe Endevor & Mocha

An [Instrktr](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) course that teaches you to automate mainframe DevOps workflows using JavaScript, Gulp, Zowe CLI, and Mocha — all without leaving VS Code.

## What you'll build

A Gulp-based CI/CD pipeline that:

- **Lists** Endevor source elements via Zowe CLI
- **Retrieves** elements from z/OS to your local workspace
- **Tests** every component with Mocha and Sinon stubs (no mainframe connection required to run the tests)
- **Pushes** processed source back to Endevor

```
my-project/
├── gulpfile.js             Gulp pipeline (list, retrieve, test, deploy)
├── zowe.config.json        Zowe connection profiles
├── src/
│   └── endevor.js          EndevorService class wrapping Zowe CLI
└── test/
    └── endevor.test.js     Mocha + Sinon unit tests
```

## Course outline

| # | Step | Time |
|---|---|---|
| 1 | Initialize the Node.js project | 10 min |
| 2 | Create your first Gulpfile | 15 min |
| 3 | Configure Zowe for Endevor | 15 min |
| 4 | Build the EndevorService class | 20 min |
| 5 | Wire Endevor into Gulp tasks | 15 min |
| 6 | Test EndevorService with Mocha & Sinon | 25 min |
| 7 | Add error handling and error-path tests | 20 min |
| 8 | Build the deployment pipeline | 20 min |

**Total: ~2.5 hours**

## Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.93 or later
- [Instrktr extension](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) installed
- Node.js 18+ and npm
- Basic JavaScript knowledge (functions, async/await, require)
- Zowe CLI with the Endevor plugin (`npm install -g @zowe/cli @broadcom/endevor-for-zowe-sdk`) — optional; the course validators work without a live mainframe

## Getting started

1. Open the **Instrktr** panel in the VS Code activity bar
2. Find **Mainframe DevOps: Gulp, Zowe Endevor & Mocha** in the catalog
3. Click **Install**, then **Start Course**

Or open the course locally for development:

```
Instrktr: Open Local Course Folder
```

## Releasing a new version

1. Bump `version` in `course.json`
2. Commit and push to `main`

The included GitHub Actions workflow creates a tag and GitHub Release automatically. Update `latestVersion` in your registry's `registry.json` to make the update available to learners.

## License

MIT
