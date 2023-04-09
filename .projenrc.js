const { awscdk } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');

const cdkVersion = '2.69.0';
const alphaVersionSuffix = 'alpha.0';

const project = new awscdk.AwsCdkConstructLibrary({
  name: 'cdk-blender-render',
  description: 'Render Blender with AWS',
  repositoryUrl: 'https://github.com/mattiamatrix/cdk-blender-render.git',
  licensed: true,

  author: 'mattiamatrix',

  stability: 'experimental',
  defaultReleaseBranch: 'main',
  keywords: ['aws', 'batch', 'blender', 'cdk', 'render'],

  docgen: false,

  releaseToNpm: true,
  publishTasks: true,
  packageManager: NodePackageManager.NPM,

  cdkVersion: cdkVersion,

  peerDeps: [`@aws-cdk/aws-batch-alpha@^${cdkVersion}-${alphaVersionSuffix}`],

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

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'coverage',
  'venv',
  '.env',
  '*.png',
  '!blender_example.blend',
  '*.blend',
];

// .gitignore
project.gitignore.exclude(...common_exclude);
// .npmignore
project.npmignore.exclude(...common_exclude);
// .prettierignore
[...common_exclude, 'node_modules', 'dist', 'out'].forEach((element) => project.prettier.addIgnorePattern(element));

project.synth();
