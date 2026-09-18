import type { App } from 'vue';

let appInstance: App | null = null;

export function setupAppInstance(app: App) {
  if (appInstance) {
    throw new Error('appInstance already exists');
  }
  appInstance = app;
}

export function getAppInstance() {
  if (!appInstance) {
    throw new Error('appInstance not exists');
  }
  return appInstance;
}
