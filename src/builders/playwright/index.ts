import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
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

  // project alias
  if (options.testProject) {
    options.project = options.testProject;
    options.testProject = null;
  }

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
  const defaultServerOptions = await context.getTargetOptions(target);

  const overrides = { port: port ?? defaultServerOptions.port };
  const server = await context.scheduleTarget(target, overrides);

  return server;
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
    try {
      const projectRequire = createRequire(join(process.cwd(), 'package.json'));
      const playwrightBin = projectRequire.resolve('@playwright/test/cli');

      const childProcess = spawn(
        process.execPath,
        [playwrightBin, 'test', ...buildArgs(options)],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
          env,
        },
      );

      childProcess.on('exit', (exitCode) => {
        if (exitCode !== 0) {
          reject(exitCode);
        }
        resolve(true);
      });
    } catch (error) {
      console.log('Could not find @playwright/test. Make sure it is installed');
      reject(error);
    }
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
  let server: BuilderRun | undefined;
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
  } catch (_error) {
    return { success: false };
  } finally {
    if (server) {
      server.stop();
    }
  }
}

export default createBuilder(runE2E);
