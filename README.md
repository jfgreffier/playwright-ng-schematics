# Playwright Angular Schematic

[![NPM Version](https://img.shields.io/npm/v/playwright-ng-schematics)](https://www.npmjs.com/package/playwright-ng-schematics)
[![Playwright version](https://img.shields.io/npm/v/playwright?label=Playwright)](https://playwright.dev/)
[![Awesome](https://awesome.re/badge.svg)](https://github.com/mxschmitt/awesome-playwright)

Adds [Playwright Test](https://playwright.dev/) to your Angular project 

- Installs Playwright Test
- Set up `ng e2e` for you
- Adds configuration to `angular.json` for easy integration into your existing project
- `ng generate` e2e tests
- Optionnaly set up component testing

<img src="docs/playwright-schematics.gif" alt="demo of ng e2e installing Playwright, then running end-to-end tests" width="800"/>

## Installation

Run the following to add Playwright to your Angular project. `ng add` will pick the correct version of this schematic automatically
```bash
ng add playwright-ng-schematics
```

Once installed, you can run the tests
```bash
npm run e2e
```

If you selected component testing at installation, you can run component tests as bellow
```bash
npx playwright test --config=playwright-ct.config.ts
```

## New: Component Testing

As of Playwright 1.62, Component Testing is out of experimental and compatible with Angular !

It works thanks to:
- The component **gallery**, a single page application that serves stories. It is created by this schematic on component testing setup
- A **story** is an example usage of your component. You can initialize it with default values, add test doubles...
- Your actual **test** that uses the new `mount()` fixture and return a component. You can then make actions and assertions on `component` as you usually do with `page`

> [!TIP]
> If you use Playwright Test for VSCode and the option `Show browser`, you can see the actual render of your component and inspect it with the browser's DevTools. This way you can edit your component, write tests and see the impact in the browser.

Check the official documentation https://playwright.dev/docs/test-components

### Example

src/components/counter-button.component.ts
```ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-counterbutton',
  standalone: true,
  template: `<button type="button" (click)="increment()">Count is {{ count }}</button>`,
})
export class CounterButtonComponent {
  @Input() count = 0;

  increment(): void {
    this.count += 1;
  }
}

```

src/components/counter-button.story.ts
```ts
import { Component, Input } from '@angular/core';

import { CounterButtonComponent } from './counter-button.component';

@Component({
  selector: 'app-counterbutton-primary-story',
  standalone: true,
  imports: [CounterButtonComponent],
  template: `<app-counterbutton [count]="count"></app-counterbutton>`,
})
export class Primary {
  @Input() count = 0;
}

@Component({
  selector: 'app-counterbutton-seven-story',
  standalone: true,
  imports: [CounterButtonComponent],
  template: `<app-counterbutton [count]="count"></app-counterbutton>`,
})
export class Seven {
  @Input() count = 7;
}

```

tests/components/counter-button.spec.ts
```ts
import { test, expect } from '@playwright/test';

test('renders primary button', async ({ mount }) => {
  const component = await mount('components/counter-button/Primary');

  await expect(component.getByRole('button')).toContainText('Count is');
});

test('button shows inital count', async ({ mount }) => {
  const component = await mount('components/counter-button/Seven');

  await expect(component.getByRole('button')).toHaveText('Count is 7');
});

```

## Requirements

Angular 18+

## Usage

### Run tests

You can also use the Angular CLI `ng` to run your tests
```bash
ng e2e
```

You can use almost the same command-line interface options that exist for Playwright (see [Playwright Docs](https://playwright.dev/docs/test-cli) or use `ng e2e --help`), such as UI mode
```bash
ng e2e --ui
# or
npm run e2e -- --ui
```

To specify particular test files, usually done like this `npx playwright test tests/todo-page/ tests/landing-page/`, you have to prepend the `--files` argument.
```bash
ng e2e --files tests/todo-page/ --files tests/landing-page/
```
The `-c` option is used to choose an Angular configuration. If you also want to specify a Playwright configuration, use `--config` instead.

The `--project` option is used to choose an Angular project. If you want to specify a Playwright project, use `--test-project` instead.

### Start an Angular development server

If a `devServerTarget` option is specified, the builder will launch an Angular server and will automatically set the `PLAYWRIGHT_TEST_BASE_URL` environment variable.

```json title="angular.json"
        "e2e": {
          "builder": "playwright-ng-schematics:playwright",
          "options": {
            "devServerTarget": "my-app:serve",
            "ui": true
          },
          "configurations": {
            "production": {
              "devServerTarget": "my-app:serve:production"
            }
          }
        }
```

You can additionaly override the `port` of the dev server. It's handy when you want to run dev server and Playwright tests on different ports.
```json title="angular.json"
        "e2e": {
          "builder": "playwright-ng-schematics:playwright",
          "options": {
            "devServerTarget": "my-app:serve",
            "port": 0
          }
        }
```

You still can make use of Playwright's `baseURL` option and mix it with `PLAYWRIGHT_TEST_BASE_URL` env variable.  
The example below shows projects using `PLAYWRIGHT_TEST_BASE_URL` (set by `devServerTarget`) or another base URL.

```ts title="playwright.config.ts"
  // ...
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://example.com' },
    },
  ]
```

### Create a test file

Create a new empty test
```bash
ng generate e2e <test name>
```

or with CLI prompt for the file name
```bash
ng generate e2e
```

To generate a new component story and test
```bash
ng generate component-test <component name>
```

or with CLI prompt for the component name
```bash
ng generate component-test
```

## Migrating from Protractor

Still using Protractor ?

Read the [Migrating from Protractor](https://playwright.dev/docs/protractor) guide on the official Playwright website.
