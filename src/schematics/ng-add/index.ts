import {
  url,
  MergeStrategy,
  type Rule,
  type SchematicContext,
  type Tree,
  apply,
  chain,
  filter,
  mergeWith,
  move,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  RunSchematicTask,
} from '@angular-devkit/schematics/tasks';
import {
  applyEdits as applyJsoncEdits,
  modify as modifyJsonc,
  parse as parseJsonc,
} from 'jsonc-parser';

function projectUsesTsconfigReferences(tree: Tree): boolean {
  if (!tree.exists('tsconfig.json')) {
    return false;
  }

  const sourceText = tree.readText('tsconfig.json');
  const json = parseJsonc(sourceText);
  return Array.isArray(json.references);
}

/**
 * Filters tsconfig files based on whether the project uses references.
 *
 * - For projects with references: include tsconfig.e2e.json, exclude
 * e2e/tsconfig.json.
 * - For projects without references: exclude tsconfig.e2e.json, include
 * e2e/tsconfig.json.
 *
 * Angular 20+ projects use tsconfig references by default, while Angular 19
 * and earlier use the old structure. Official Angular schematics do not
 * migrate existing projects to use references during updates.
 */
function filterTsconfigFiles(path: string, usesReferences: boolean): boolean {
  if (usesReferences) {
    return !path.endsWith('e2e/tsconfig.json');
  }

  return !path.endsWith('tsconfig.e2e.json');
}

export default function ngAdd(options: { installBrowsers: boolean }): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const usesTsconfigReferences = projectUsesTsconfigReferences(tree);
    context.logger.debug(
      `Project uses tsconfig references: ${usesTsconfigReferences}`,
    );

    const copyFiles = mergeWith(
      apply(url('./files'), [
        filter((path) => filterTsconfigFiles(path, usesTsconfigReferences)),
        move('.'),
      ]),
      MergeStrategy.AllowCreationConflict,
    );

    const rules = [
      updateAngular,
      addNpmScript,
      gitignore,
      copyFiles,
      addPlaywright,
      ...(usesTsconfigReferences ? [handleTsconfigReferences] : []),
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
      options: {
        devServerTarget: `${projectName}:serve`,
      },
      configurations: {
        production: {
          devServerTarget: `${projectName}:serve:production`,
        },
      },
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

async function getLatestNpmVersion(packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    const responseObject = await response.json();
    const version = responseObject['dist-tags'].latest ?? 'latest';
    return version;
  } catch (error) {
    return 'latest';
  }
}

function addPackageToPackageJson(
  tree: Tree,
  context: SchematicContext,
  pkg: string,
  version: string,
): Rule {
  return () => {
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
  };
}

async function addPlaywright(tree: Tree, context: SchematicContext) {
  context.logger.debug('Updating dependencies...');
  const typesNodeVersion = await getLatestNpmVersion('@types/node');
  const playwrightVersion = await getLatestNpmVersion('@playwright/test');

  context.logger.info(`Adding @playwright/test ${playwrightVersion}`);
  context.logger.info(`Adding @types/node ${typesNodeVersion}`);

  context.addTask(new NodePackageInstallTask({ allowScripts: true }));

  return chain([
    addPackageToPackageJson(
      tree,
      context,
      '@playwright/test',
      playwrightVersion,
    ),
    addPackageToPackageJson(tree, context, '@types/node', typesNodeVersion),
  ]);
}

function handleTsconfigReferences(tree: Tree, context: SchematicContext) {
  if (!tree.exists('tsconfig.json')) {
    return tree;
  }
  context.logger.debug('Adjust tsconfig.json');

  const oldTsconfigPath = 'e2e/tsconfig.json';
  if (tree.exists(oldTsconfigPath)) {
    context.logger.info(
      `Removing old ${oldTsconfigPath} file (migrating to tsconfig.e2e.json)`,
    );
    tree.delete(oldTsconfigPath);
  }

  const sourceText = tree.readText('tsconfig.json');
  const json = parseJsonc(sourceText);
  const referenceExists = (
    json.references as { path?: string }[] | undefined
  )?.some((ref) => ref.path === './tsconfig.e2e.json');
  if (!referenceExists) {
    const formattingOptions = {
      eol: '\n',
      insertSpaces: true,
      tabSize: 2,
    };
    let modifiedText = sourceText;
    if (!Array.isArray(json.references)) {
      const edits = modifyJsonc(modifiedText, ['references'], [], {
        formattingOptions,
      });
      modifiedText = applyJsoncEdits(modifiedText, edits);
    }
    const edits = modifyJsonc(
      modifiedText,
      ['references', -1],
      { path: './tsconfig.e2e.json' },
      { formattingOptions },
    );
    modifiedText = applyJsoncEdits(modifiedText, edits);
    tree.overwrite('tsconfig.json', modifiedText);
  }

  return tree;
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
