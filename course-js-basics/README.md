# JavaScript Fundamentals for DevOps

An [Instrktr](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) pre-course that teaches the JavaScript concepts you need before tackling the **Mainframe DevOps: Gulp, Zowe Endevor & Mocha** course.

Every exercise is modelled on code you will write in that course — so nothing is abstract.

## What you'll learn

| # | Concept | Used in the Zowe course for… |
|---|---|---|
| 1 | Variables and data types | `const service = new EndevorService({...})` |
| 2 | Functions and arrow functions | Gulp task functions, array callbacks |
| 3 | Objects and destructuring | `const { instance, environment } = this.config` |
| 4 | Arrays and iteration | Processing `zowe endevor list elements` results |
| 5 | CommonJS modules | `require('gulp')`, `module.exports = { EndevorService }` |
| 6 | Classes and `this` | The `EndevorService` class itself |
| 7 | Promises and async/await | Every `execAsync` call in EndevorService |
| 8 | Error handling with try/catch | Wrapping Zowe CLI failures with clear messages |
| 9 | Working with JSON | Parsing `--rfj` responses from Zowe CLI |

**Total: ~2 hours**

## Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.93 or later
- [Instrktr extension](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) installed
- Node.js 18+ and npm
- No prior JavaScript experience required

## Getting started

1. Open the **Instrktr** panel in the VS Code activity bar
2. Find **JavaScript Fundamentals for DevOps** in the catalog
3. Click **Install**, then **Start Course**

## What's next

After completing this course, take **Mainframe DevOps: Gulp, Zowe Endevor & Mocha** to apply everything you've learned in a real CI/CD pipeline.

## License

MIT
