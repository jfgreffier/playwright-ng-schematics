import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { Architect } from '@angular-devkit/architect';
import {
  type BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';

jest.mock('node:child_process');

describe('Playwright builder', () => {
  let architect: Architect;

  beforeEach(async () => {
    const architectHost = new TestingArchitectHost();
    architect = new Architect(architectHost);
    await architectHost.addBuilderFromPackage(join(__dirname, '../../..'));

    // Builder that mocks `ng run app:serve`
    const fakeBuilder = (options: { port: number | null }): BuilderOutput => {
      return { success: true, baseUrl: `https://example.com:${options.port}` };
    };
    architectHost.addBuilder('fakeBuilder', createBuilder(fakeBuilder));
    architectHost.addTarget(targetFromTargetString('app:serve'), 'fakeBuilder');

    (spawn as jest.Mock).mockReturnValue({
      on: jest.fn((event, callback) => callback(0)),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should spawn testing process', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      {},
    );
    await run.stop();
    const output = await run.result;

    expect(output.success).toBeTruthy();
    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      [],
      expect.anything(),
    );
  });

  it('should spawn testing process and Angular server', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      {
        devServerTarget: 'app:serve',
        port: 0,
      },
    );
    await run.stop();
    const output = await run.result;

    expect(output.success).toBeTruthy();
    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      [],
      expect.objectContaining({
        env: expect.objectContaining({
          PLAYWRIGHT_TEST_BASE_URL: 'https://example.com:0',
        }),
      }),
    );
  });

  it('should fail on error', async () => {
    (spawn as jest.Mock).mockReturnValue({
      on: jest.fn((event, callback) => callback(-3)),
    });

    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      {},
    );
    await run.stop();
    const output = await run.result;

    expect(output.success).toBeFalsy();
  });

  it('should accept --ui option', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      { ui: true },
    );
    await run.stop();
    const output = await run.result;

    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      ['--ui'],
      expect.anything(),
    );
    expect(output.success).toBeTruthy();
  });

  it('should accept unknown options', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      {
        test1: 'testValue',
        test2: 2,
        test3: true,
        test4: [],
        test5: {},
        test6: null,
        a: 'yes',
        b: true,
      },
    );
    await run.stop();
    const output = await run.result;

    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      ['--test1', 'testValue', '--test2', '2', '--test3', '-a', 'yes', '-b'],
      expect.anything(),
    );
    expect(output.success).toBeTruthy();
  });

  it('should accept --files option', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      {
        'fail-on-flaky-tests': true,
        files: ['tests/todo-page/', 'tests/landing-page/'],
      },
    );
    await run.stop();
    const output = await run.result;

    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      ['tests/todo-page/', 'tests/landing-page/', '--fail-on-flaky-tests'],
      expect.anything(),
    );
    expect(output.success).toBeTruthy();
  });

  it('should convert camelCase options to kebab-case', async () => {
    const run = await architect.scheduleBuilder(
      'playwright-ng-schematics:playwright',
      { updateSnapshots: true },
    );
    await run.stop();
    const output = await run.result;

    expect(spawn).toHaveBeenCalledWith(
      'npx playwright test',
      ['--update-snapshots'],
      expect.anything(),
    );
    expect(output.success).toBeTruthy();
  });
});
