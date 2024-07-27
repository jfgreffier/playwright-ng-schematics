import {
  url,
  type Rule,
  type SchematicContext,
  type Tree,
  apply,
  chain,
  mergeWith,
  move,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  RunSchematicTask,
} from '@angular-devkit/schematics/tasks';

const PLAYWRIGHT_TEST_VERSION = '1.45.2';

export default function ngAdd(options: { installBrowsers: boolean }): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const copyFiles = mergeWith(apply(url('./files'), [move('.')]));
    const rules = [
      updateAngular,
      addNpmScript,
      gitignore,
      copyFiles,
      addPlaywright,
    ];
    if (options.installBrowsers) {
      context.addTask(new RunSchematicTask('install-browsers', {}));
    }
    return chain(rules)(tree, context);
  };
}

function updateAngular(tree: Tree, context: SchematicContext) {
  if (!tree.exists('angular.json')) {
    return tree;
  }
  context.logger.debug('angular.json');

  const sourceText = tree.readText('angular.json');
  const json = JSON.parse(sourceText);
  for (const projectName of Object.keys(json.projects)) {
    json.projects[projectName].architect.e2e = {
      builder: 'playwright-ng-schematics:playwright',
    };
  }
  tree.overwrite('angular.json', JSON.stringify(json, null, 2));

  return tree;
}

function addNpmScript(tree: Tree, context: SchematicContext) {
  if (!tree.exists('package.json')) {
    return tree;
  }
  context.logger.debug('npm script');

  const key = 'e2e';
  const value = 'ng e2e';

  const sourceText = tree.readText('package.json');
  const json = JSON.parse(sourceText);
  if (!json.scripts[key]) {
    json.scripts[key] = value;
  }
  tree.overwrite('package.json', JSON.stringify(json, null, 2));

  return tree;
}

function gitignore(tree: Tree, context: SchematicContext) {
  if (!tree.exists('.gitignore')) {
    return tree;
  }
  context.logger.debug('Adjust .gitignore');

  const content = tree.readText('.gitignore');
  const modifiedContent = `${content}
# Playwright
/test-results/
/playwright-report/
/playwright/.cache/
`;
  tree.overwrite('.gitignore', modifiedContent);

  return tree;
}

function addPackageToPackageJson(
  tree: Tree,
  context: SchematicContext,
  pkg: string,
  version: string,
): Tree {
  if (!tree.exists('package.json')) {
    return tree;
  }
  context.logger.debug('Adjust package.json');

  const sourceText = tree.readText('package.json');
  const json = JSON.parse(sourceText);
  if (!json.devDependencies) {
    json.devDependencies = {};
  }
  if (!json.devDependencies[pkg]) {
    json.devDependencies[pkg] = version;
  }
  json.devDependencies = sortObjectByKeys(json.devDependencies);
  tree.overwrite('package.json', JSON.stringify(json, null, 2));

  return tree;
}

function addPlaywright(tree: Tree, context: SchematicContext) {
  context.logger.debug('Updating dependencies...');

  context.addTask(new NodePackageInstallTask({ allowScripts: true }));

  return addPackageToPackageJson(
    tree,
    context,
    '@playwright/test',
    PLAYWRIGHT_TEST_VERSION,
  );
}

function sortObjectByKeys(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      return {
        // biome-ignore lint/performance/noAccumulatingSpread: small object, no perf cost
        ...result,
        [key]: obj[key],
      };
    }, {});
}
