import { spawn } from 'node:child_process';
import {
  type BuilderContext,
  type BuilderOutput,
  type BuilderRun,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { type JsonObject, strings } from '@angular-devkit/core';

/**
 * Converts the options object back to an argv string array.
 *
 * @example
 * buildArgs({"workers": 2}); // returns ["--workers", 2]
 */
function buildArgs(options: JsonObject): string[] {
  // extract files
  const filesArgs = (options.files as string[]) ?? [];
  options.files = null;

  return [
    ...filesArgs,
    ...Object.entries(options).flatMap(([key, value]) => {
      // Skip builder-internal options
      if (key === 'devServerTarget') {
        return [];
      }
      if (key === 'port') {
        return [];
      }

      // Skip objects, arrays, null, undefined (should already be validated by Angular though)
      if (
        typeof value === 'object' ||
        Array.isArray(value) ||
        value === null ||
        value === undefined
      ) {
        return [];
      }

      // options automatically got converted to camelCase, so we have to convert them back to kebab-case for Playwright.
      const dashes = key.length === 1 ? '-' : '--';
      const argument = `${dashes}${strings.dasherize(key)}`;

      if (typeof value === 'boolean') {
        if (value) {
          return argument;
        }
        return [];
      }
      return [argument, String(value)];
    }),
  ];
}

async function startDevServer(
  context: BuilderContext,
  devServerTarget: string,
  port: number | null,
): Promise<BuilderRun> {
  const target = targetFromTargetString(devServerTarget);
  const overrides: JsonObject = port !== null ? { port } : {};
  const server = await context.scheduleTarget(target, overrides);

  return server;
}

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

async function startPlaywrightTest(options: JsonObject, baseURL: string) {
  // PLAYWRIGHT_TEST_BASE_URL is actually a non-documented env variable used
  // by Playwright Test.
  // Its usage in playwright.config.ts is to clarify that it can be overriden.
  let env = process.env;
  if (baseURL) {
    env = {
      PLAYWRIGHT_TEST_BASE_URL: baseURL,
      ...process.env,
    };
  }

  return new Promise((resolve, reject) => {
    const childProcess = spawn(
      `${getPackageManagerExecCommand()} playwright test`,
      buildArgs(options),
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
        env,
      },
    );

    childProcess.on('exit', (exitCode) => {
      if (exitCode !== 0) {
        reject(exitCode);
      }
      resolve(true);
    });
  });
}

interface PlaywrightBuilderOptions extends JsonObject {
  devServerTarget: string | null;
  port: number | null;
  files: string[] | null;
}

async function runE2E(
  options: PlaywrightBuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  let server: BuilderRun | undefined = undefined;
  let baseURL = '';

  try {
    if (options.devServerTarget) {
      server = await startDevServer(
        context,
        options.devServerTarget,
        options.port,
      );
      const result = await server.result;
      baseURL = result.baseUrl;
    }

    await startPlaywrightTest(options, baseURL);
    return { success: true };
  } catch (error) {
    return { success: false };
  } finally {
    if (server) {
      server.stop();
    }
  }
}

export default createBuilder(runE2E);
