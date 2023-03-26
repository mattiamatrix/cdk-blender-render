const { awscdk, release } = require('projen');
const project = new awscdk.AwsCdkConstructLibrary({
  name: 'cdk-blender-render',
  description: '',
  repositoryUrl: 'https://github.com/mattiamatrix/cdk-blender-render.git',
  licensed: true,

  author: 'Mattia Sappa',
  authorAddress: 'mattiasappa@gmail.com',

  stability: 'experimental',
  defaultReleaseBranch: 'main',
  keywords: ['aws', 'cdk', 'blender', 'render'],

  docgen: false,

  // releaseToNpm: true,
  // publishTasks: true,
  packageManager: NodePackageManager.NPM,

  cdkVersion: '2.1.0',
  // deps: [],                /* Runtime dependencies of this module. */
  devDeps: [
    '@trivago/prettier-plugin-sort-imports',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'eslint-plugin-promise',
    'ts-node',
    'tsc-alias',
  ],

  eslint: true,
  prettier: true,
  prettierOptions: {
    settings: {
      semi: true,
      trailingComma: 'all',
      singleQuote: true,
      printWidth: 120,
      tabWidth: 2,
      importOrder: ['^constructs(.*)$', '^aws-cdk(.*)$', '^@aws-sdk(.*)$', '^test/(.*)$', '^[./]'],
      importOrderSeparation: true,
    },
  },

  dependabot: false,
});

// .eslintrc.json
project.eslint.addRules({ 'import/order': 'off' });

const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log', 'coverage', 'venv'];

// .gitignore
project.gitignore.exclude(...common_exclude);
// .npmignore
project.npmignore.exclude(...common_exclude);
// .prettierignore
[...common_exclude, 'node_modules', 'dist', 'out'].forEach((element) => project.prettier.addIgnorePattern(element));

project.synth();
