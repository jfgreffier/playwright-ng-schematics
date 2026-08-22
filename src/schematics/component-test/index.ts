import { strings } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  type Rule,
  type SchematicContext,
  type Tree,
  url,
} from '@angular-devkit/schematics';

export default function component(options: { name: string }): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      applyTemplates({
        classify: strings.classify,
        name: options.name,
        dasherize: strings.dasherize,
      }),
    ]);

    const rule = chain([mergeWith(templateSource)]);

    return rule(tree, _context);
  };
}
