import type { App } from 'vue';
import { registerUpdateCheck } from '@/plugins/app-version-check';

export function setupAppErrorHandle(app: App) {
  app.config.errorHandler = (err, vm, info) => {
    // eslint-disable-next-line no-console
    console.error(err, vm, info);
  };
}

export function setupAppVersionNotification() {
  const canAutoUpdateApp = import.meta.env.VITE_AUTOMATICALLY_DETECT_UPDATE === 'Y';

  if (!canAutoUpdateApp || Boolean(import.meta.env.DEV)) {
    return;
  }

  registerUpdateCheck();
}
