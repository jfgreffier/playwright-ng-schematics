import {
  SchematicTestRunner,
  type UnitTestTree,
} from '@angular-devkit/schematics/testing';
import { parse as parseJsonc } from 'jsonc-parser';

const collectionPath = 'lib/schematics/collection.json';

function getExampleTsconfigJsonWithoutReferences(): Record<string, unknown> {
  return {
    compileOnSave: false,
    compilerOptions: {
      outDir: './dist/out-tsc',
      strict: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      skipLibCheck: true,
      isolatedModules: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      moduleResolution: 'bundler',
      importHelpers: true,
      target: 'ES2022',
      module: 'ES2022',
    },
    angularCompilerOptions: {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      strictTemplates: true,
    },
  };
}

describe('ng-add', () => {
  const runner = new SchematicTestRunner('schematics', collectionPath);
  const npmResponse = jest
    .fn()
    .mockResolvedValue({ 'dist-tags': { latest: '1.2.3' } });
  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await runner.runExternalSchematic(
      '@schematics/angular',
      'ng-new',
      {
        name: 'sandbox',
        directory: '.',
        version: '18.0.0',
      },
    );
  });

  it('should add "e2e" to angular', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const angularJSON = JSON.parse(tree.readContent('/angular.json'));
    expect(angularJSON.projects.sandbox.architect.e2e.builder).toBe(
      'playwright-ng-schematics:playwright',
    );
  });

  it('should add npm script', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.scripts.e2e).toBe('ng e2e');
  });

  it('should update .gitignore', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const gitignore = tree.readContent('/.gitignore');
    expect(gitignore).toContain('# Playwright');
  });

  it('should add files and update devDependencies', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });
    // Simulate Angular project without tsconfig references
    appTree.overwrite(
      '/tsconfig.json',
      JSON.stringify(getExampleTsconfigJsonWithoutReferences(), null, 2),
    );

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    expect(tree.files).toContain('/playwright.config.ts');
    expect(tree.files).toContain('/e2e/tsconfig.json');
    expect(tree.files).toContain('/e2e/example.spec.ts');
    expect(tree.files).not.toContain('/tsconfig.e2e.json');

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.devDependencies['@playwright/test']).toEqual('1.2.3');
    expect(packageJSON.devDependencies['@types/node']).toEqual('1.2.3');
    // check that the dependency is added in the correct place
    expect(Object.keys(packageJSON.devDependencies)).toEqual(
      Object.keys(packageJSON.devDependencies).sort(),
    );

    const tsconfigJSON = parseJsonc(tree.readContent('/tsconfig.json'));
    expect(tsconfigJSON.references).toBeUndefined();
  });

  it('should add files and update devDependencies and tsconfig references', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    expect(tree.files).toContain('/playwright.config.ts');
    expect(tree.files).toContain('/tsconfig.e2e.json');
    expect(tree.files).toContain('/e2e/example.spec.ts');
    expect(tree.files).not.toContain('/e2e/tsconfig.json');

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.devDependencies['@playwright/test']).toEqual('1.2.3');
    expect(packageJSON.devDependencies['@types/node']).toEqual('1.2.3');
    // check that the dependency is added in the correct place
    expect(Object.keys(packageJSON.devDependencies)).toEqual(
      Object.keys(packageJSON.devDependencies).sort(),
    );

    const tsconfigJSON = parseJsonc(tree.readContent('/tsconfig.json'));
    expect(tsconfigJSON.references).toContainEqual({
      path: './tsconfig.e2e.json',
    });
  });

  it(`should install latest if can't fetch version from npm`, async () => {
    global.fetch = jest.fn().mockRejectedValueOnce({});

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.devDependencies['@playwright/test']).toEqual('latest');
    expect(packageJSON.devDependencies['@types/node']).toEqual('latest');
  });

  it('should migrate from old e2e/tsconfig.json to root tsconfig.e2e.json', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });
    // Existing e2e/tsconfig.json from previous Playwright installation
    appTree.create(
      '/e2e/tsconfig.json',
      JSON.stringify(
        {
          extends: '../tsconfig.json',
          include: ['./**/*.ts'],
        },
        null,
        2,
      ),
    );

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    expect(tree.files).not.toContain('/e2e/tsconfig.json');
    expect(tree.files).toContain('/tsconfig.e2e.json');
    const tsconfigJSON = parseJsonc(tree.readContent('/tsconfig.json'));
    expect(tsconfigJSON.references).toContainEqual({
      path: './tsconfig.e2e.json',
    });
  });

  it('should keep old-style e2e/tsconfig.json for projects without references', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });
    // Simulate Angular project without tsconfig references
    appTree.overwrite(
      '/tsconfig.json',
      JSON.stringify(getExampleTsconfigJsonWithoutReferences(), null, 2),
    );
    // Existing e2e/tsconfig.json from previous Playwright installation
    appTree.create(
      '/e2e/tsconfig.json',
      JSON.stringify(
        {
          extends: '../tsconfig.json',
          include: ['./**/*.ts'],
        },
        null,
        2,
      ),
    );

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    expect(tree.files).toContain('/e2e/tsconfig.json');
    expect(tree.files).not.toContain('/tsconfig.e2e.json');
    const tsconfigJSON = parseJsonc(tree.readContent('/tsconfig.json'));
    expect(tsconfigJSON.references).toBeUndefined();
  });

  it('should not duplicate tsconfig references when run multiple times', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: npmResponse });
    const treeAfterFirstRun = await runner.runSchematic('ng-add', {}, appTree);

    const treeAfterSecondRun = await runner.runSchematic(
      'ng-add',
      {},
      treeAfterFirstRun,
    );

    // Verify tsconfig.e2e.json reference is not duplicated
    const tsconfigJSON = parseJsonc(
      treeAfterSecondRun.readContent('/tsconfig.json'),
    );
    const e2eReferences = tsconfigJSON.references.filter(
      (ref: { path: string }) => ref.path === './tsconfig.e2e.json',
    );
    expect(e2eReferences).toHaveLength(1);
  });
});
