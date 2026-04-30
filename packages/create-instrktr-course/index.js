#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { positional: null, title: null, id: null, validator: null };
  let i = 2; // skip node + script
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--title' && argv[i + 1]) { args.title = argv[++i]; }
    else if (a === '--id' && argv[i + 1]) { args.id = argv[++i]; }
    else if (a === '--validator' && argv[i + 1]) { args.validator = argv[++i]; }
    else if (a === '--help' || a === '-h') { printUsage(); process.exit(0); }
    else if (!a.startsWith('-') && !args.positional) { args.positional = a; }
    i++;
  }
  return args;
}

function printUsage() {
  console.log(`
Usage: create-instrktr-course [directory] [options]

Scaffold a new Instrktr course.

Arguments:
  directory              Name of the directory to create

Options:
  --title <title>        Course title (default: titlecased directory name)
  --id <id>              Course ID slug (default: directory name)
  --validator js|bash    Validator language for the sample step (default: js)
  -h, --help             Show this help message
`);
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

function ask(rl, question, fallback) {
  const suffix = fallback ? ` (${fallback})` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || fallback || '');
    });
  });
}

function titleCase(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function gather(args) {
  const isTTY = process.stdin.isTTY;

  if (args.positional && args.title && args.id && args.validator) {
    return {
      dir: args.positional,
      title: args.title,
      id: args.id,
      validator: args.validator,
    };
  }

  if (!isTTY) {
    if (!args.positional) {
      console.error('Error: directory name is required in non-interactive mode.');
      printUsage();
      process.exit(1);
    }
    return {
      dir: args.positional,
      title: args.title || titleCase(args.positional),
      id: args.id || slugify(args.positional),
      validator: args.validator || 'js',
    };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const dir = args.positional || await ask(rl, 'Directory name');
    if (!dir) { console.error('Error: directory name is required.'); process.exit(1); }

    const title = args.title || await ask(rl, 'Course title', titleCase(dir));
    const id = args.id || await ask(rl, 'Course ID (slug)', slugify(dir));

    let validator = args.validator;
    if (!validator) {
      validator = await ask(rl, 'Validator language (js or bash)', 'js');
    }
    if (validator !== 'js' && validator !== 'bash') {
      console.error(`Error: validator must be "js" or "bash", got "${validator}".`);
      process.exit(1);
    }

    return { dir, title, id, validator };
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

const TEMPLATES = path.join(__dirname, 'templates');

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), 'utf8');
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ---------------------------------------------------------------------------
// Scaffold
// ---------------------------------------------------------------------------

function scaffold({ dir, title, id, validator }) {
  const root = path.resolve(dir);

  if (fs.existsSync(root)) {
    console.error(`Error: "${dir}" already exists.`);
    process.exit(1);
  }

  const vars = { title, id };
  const validatorFile = validator === 'bash' ? 'validate.sh' : 'validate.js';

  // Directories
  const dirs = [
    '',
    '.github/workflows',
    'steps/01-hello/starter',
    'steps/01-hello/solution',
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }

  // course.json
  const courseJson = {
    id,
    title,
    version: '1.0.0',
    engineVersion: '>=0.3.5',
    steps: [
      {
        id: 'hello',
        title: 'Hello, Instrktr!',
        instructions: 'steps/01-hello/instructions.md',
        hints: [
          'Create the file in the workspace root.',
          'The file should contain exactly: Hello, Instrktr!',
        ],
        validator: `steps/01-hello/${validatorFile}`,
        starter: 'steps/01-hello/starter',
        solution: 'steps/01-hello/solution',
      },
    ],
  };
  fs.writeFileSync(
    path.join(root, 'course.json'),
    JSON.stringify(courseJson, null, 2) + '\n',
  );

  // .gitignore
  fs.writeFileSync(
    path.join(root, '.gitignore'),
    readTemplate('gitignore'),
  );

  // README.md
  const readmeTemplate = [
    '# {{title}}',
    '',
    'A hands-on [Instrktr](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) course.',
    '',
    '## What you\'ll learn',
    '',
    '- Topic 1',
    '- Topic 2',
    '- Topic 3',
    '',
    '## Prerequisites',
    '',
    '- VS Code 1.93 or later',
    '- [Instrktr](https://marketplace.visualstudio.com/items?itemName=instrktr.instrktr) extension installed',
    '',
    '## Getting started',
    '',
    '1. Open the **Instrktr** panel in VS Code',
    '2. Find this course in the catalog',
    '3. Click **Install**, then **Start Course**',
    '',
    '## Development',
    '',
    'To test locally, set `instrktr.localCoursePath` to the absolute path of this directory in VS Code settings.',
    '',
    '## License',
    '',
    'MIT',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'README.md'), render(readmeTemplate, vars));

  // .github/workflows/release.yml
  fs.writeFileSync(
    path.join(root, '.github/workflows/release.yml'),
    readTemplate('release.yml'),
  );

  // Step files
  fs.writeFileSync(
    path.join(root, 'steps/01-hello/instructions.md'),
    readTemplate('instructions.md'),
  );

  // Validator (only the chosen type)
  const validatorSrc = readTemplate(validatorFile);
  fs.writeFileSync(path.join(root, `steps/01-hello/${validatorFile}`), validatorSrc);
  if (validator === 'bash') {
    fs.chmodSync(path.join(root, `steps/01-hello/${validatorFile}`), 0o755);
  }

  // Starter & solution
  fs.writeFileSync(
    path.join(root, 'steps/01-hello/starter/README.md'),
    readTemplate('starter-readme.md'),
  );
  fs.writeFileSync(
    path.join(root, 'steps/01-hello/solution/hello.txt'),
    readTemplate('solution-hello.txt'),
  );

  return root;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const opts = await gather(args);
  const root = scaffold(opts);

  console.log(`
  Course scaffolded in ${path.relative(process.cwd(), root) || root}

  Next steps:
    cd ${opts.dir}
    git init && git add -A && git commit -m "Initial course scaffold"

  To test locally:
    1. Open VS Code
    2. Set instrktr.localCoursePath to the absolute path of ${opts.dir}
    3. Open the Instrktr panel — your course should load automatically

  To publish:
    1. Push to GitHub
    2. The release.yml workflow will auto-tag and create a release
    3. Add the course to your registry's registry.json
`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
