import path from 'node:path';
import type { PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import VueDevtools from 'vite-plugin-vue-devtools';
import progress from 'vite-plugin-progress';
import zipPack from 'vite-plugin-zip-pack';
import { setupElegantRouter } from './router';
import { setupUnocss } from './unocss';
import { setupUnplugin } from './unplugin';
import { setupHtmlPlugin } from './html';

export function setupVitePlugins(viteEnv: Env.ImportMeta, buildTime: string, mode: string) {
  const plugins: PluginOption = [
    vue({
      script: {
        defineModel: true
      }
    }),
    vueJsx(),
    VueDevtools(),
    setupElegantRouter(),
    setupUnocss(viteEnv),
    ...setupUnplugin(viteEnv),
    progress(),
    setupHtmlPlugin(buildTime)
  ];
  if (
    ['prod', 'production'].includes(mode) &&
    viteEnv.VITE_DIST_ARCHIVE_ENABLE === 'Y' &&
    viteEnv.VITE_DIST_ZIP_FILENAME
  ) {
    plugins.push(
      zipPack({
        inDir: 'dist',
        outDir: path.resolve(__dirname, '..', '..'),
        outFileName: viteEnv.VITE_DIST_ZIP_FILENAME || 'release.zip'
      })
    );
  }

  return plugins;
}
