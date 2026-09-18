import { type App, inject } from 'vue';
import { type Pinia, createPinia } from 'pinia';
import { getAppInstance } from '@/plugins/app-instance';
import { resetSetupStore } from './plugins';

export const storeId = Symbol('storeId');

/** Setup Vue store plugin pinia */
export function setupStore(app: App) {
  const store = createPinia();

  store.use(resetSetupStore);

  app.use(store);
  app.provide(storeId, store);
}

export function useStoreHook(): Pinia {
  return getAppInstance().runWithContext(() => {
    return inject(storeId) as Pinia;
  });
}
