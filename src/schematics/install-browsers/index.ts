import { spawnSync } from 'node:child_process';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function getPackageManagerExecCommand() {
  const env = process.env.npm_config_user_agent || '';
  if (env.includes('yarn')) {
    return 'yarn';
  }
  if (env.includes('pnpm')) {
    return 'pnpm exec';
  }
  return 'npx';
}

export default function installBrowsers(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Installing browsers...');

    spawnSync(`${getPackageManagerExecCommand()} playwright install`, [], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });

    return tree;
  };
}
