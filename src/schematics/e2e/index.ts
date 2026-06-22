import { strings } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  type Rule,
  type SchematicContext,
  type Tree,
  url,
} from '@angular-devkit/schematics';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function e2e(options: { name: string }): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      applyTemplates({
        classify: strings.classify,
        name: options.name,
        dasherize: strings.dasherize,
      }),
      move('e2e'),
    ]);

    const rule = chain([mergeWith(templateSource)]);

    return rule(tree, _context);
  };
}
