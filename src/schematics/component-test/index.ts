import { dirname } from 'node:path';
import { strings } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  type Rule,
  type SchematicContext,
  type Tree,
  url,
} from '@angular-devkit/schematics';

export default function component(options: { name: string }): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    let componentPath = '.';
    tree.visit((path) => {
      if (path.endsWith(`${options.name}.component.ts`)) {
        componentPath = dirname(path);
      }
    });

    const storySource = apply(url('./files'), [
      filter((path) => path.endsWith('.story.ts.template')),
      applyTemplates({
        classify: strings.classify,
        name: options.name,
        dasherize: strings.dasherize,
      }),
      move(componentPath),
    ]);
    const testSource = apply(url('./files'), [
      filter((path) => path.endsWith('.spec.ts.template')),
      applyTemplates({
        classify: strings.classify,
        name: options.name,
        dasherize: strings.dasherize,
      }),
    ]);

    const rule = chain([mergeWith(storySource), mergeWith(testSource)]);

    return rule(tree, _context);
  };
}
