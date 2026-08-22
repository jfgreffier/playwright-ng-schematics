/// <reference types="vite/client" />
import '@angular/compiler';
import {
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  type Type,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';

const stories = import.meta.glob([
  '/**/*.story.{tsx,jsx,ts,js,vue}',
  '!/node_modules/**',
  '!/dist/**',
  '!/playwright-report/**',
  '!/test-results/**',
]);

const id = (f: string) =>
  f.replace(/^(\.\.\/)+src\//, '').replace(/\.story\.\w+$/, '');

export async function resolve(storyId: string) {
  const sep = storyId.lastIndexOf('/');
  const [path, name] = [storyId.slice(0, sep), storyId.slice(sep + 1)];
  const file = Object.keys(stories).find(
    (f) => id(f) === path || id(f).endsWith('/' + path),
  );
  const mod = (file && (await stories[file]())) as
    | Record<string, any>
    | undefined;
  return mod?.[name] ?? mod?.default;
}

const rootEl = document.getElementById('root')!;
let app: ApplicationRef | undefined;
let component: ComponentRef<any> | undefined;
let mountedStory: Type<unknown> | undefined;

(window as any).mount = async ({
  story,
  props,
}: {
  story: string;
  props?: Record<string, any>;
}) => {
  const resolved = await resolve(story);
  if (!resolved) throw new Error(`Unknown story: ${story}`);
  if (!app) {
    app = await createApplication();
  }
  if (mountedStory !== resolved) {
    if (component) {
      app.detachView(component.hostView);
      component.destroy();
    }
    component = createComponent(resolved, {
      environmentInjector: app.injector,
      hostElement: rootEl,
    });
    app.attachView(component.hostView);
    mountedStory = resolved;
  }
  if (props) {
    Object.assign(component.instance, props);
  }
  component.changeDetectorRef.detectChanges();
};

(window as any).unmount = async () => {
  app?.destroy();
  app = undefined;
  component = undefined;
  mountedStory = undefined;
};

// Import styles, initialize component theme here.
// import '../src/common.css';
