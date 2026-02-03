import {
  SchematicTestRunner,
  type UnitTestTree,
} from '@angular-devkit/schematics/testing';

const collectionPath = 'lib/schematics/collection.json';

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
    global.fetch = jest.fn().mockResolvedValueOnce({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const angularJSON = JSON.parse(tree.readContent('/angular.json'));
    expect(angularJSON.projects.sandbox.architect.e2e.builder).toBe(
      'playwright-ng-schematics:playwright',
    );
  });

  it('should add "playwright-ng-schematics" to schematicCollections', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const angularJSON = JSON.parse(tree.readContent('/angular.json'));
    expect(angularJSON.cli.schematicCollections).toContain(
      'playwright-ng-schematics',
    );
  });

  it('should add npm script', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.scripts.e2e).toBe('ng e2e');
  });

  it('should update .gitignore', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const gitignore = tree.readContent('/.gitignore');
    expect(gitignore).toContain('# Playwright');
  });

  it('should add files and update devDependencies', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ json: npmResponse });

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    expect(tree.files).toContain('/playwright.config.ts');
    expect(tree.files).toContain('/e2e/tsconfig.json');
    expect(tree.files).toContain('/e2e/example.spec.ts');

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.devDependencies['@playwright/test']).toEqual('1.2.3');
    // check that the dependency is added in the correct place
    expect(Object.keys(packageJSON.devDependencies)).toEqual(
      Object.keys(packageJSON.devDependencies).sort(),
    );
  });

  it(`should install latest if can't fetch version from npm`, async () => {
    global.fetch = jest.fn().mockRejectedValueOnce({});

    const tree = await runner.runSchematic('ng-add', {}, appTree);

    const packageJSON = JSON.parse(tree.readContent('/package.json'));
    expect(packageJSON.devDependencies['@playwright/test']).toEqual('latest');
  });
});
