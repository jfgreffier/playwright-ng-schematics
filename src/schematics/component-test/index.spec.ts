import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

const collectionPath = 'lib/schematics/collection.json';

describe('component-test', () => {
  it('should generate story and component spec file', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const appTree = Tree.empty();

    const tree = await runner.runSchematic(
      'component-test',
      { name: 'hello' },
      appTree,
    );

    expect(tree.files).toContain('/hello.story.ts');
    expect(tree.readContent('/hello.story.ts')).toMatchSnapshot();
    expect(tree.files).toContain('/tests/components/hello.spec.ts');
    expect(
      tree.readContent('/tests/components/hello.spec.ts'),
    ).toMatchSnapshot();
  });
});
