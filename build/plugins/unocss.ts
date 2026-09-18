import process from 'node:process';
import path from 'node:path';
import unocss from '@unocss/vite';
import presetIcons from '@unocss/preset-icons';
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders';

/**
 * Cursor / VS Code inject VSCODE_CWD into integrated-terminal processes.
 * @unocss/preset-icons treats that as the VS Code extension host and skips the
 * Node filesystem loader, so class icons like `icon-mdi:plus` generate no CSS.
 * Vite itself is a normal Node process and must keep the local @iconify/json path.
 */
function ensurePresetIconsNodeLoader() {
  if (process.env.VSCODE_CWD) {
    delete process.env.VSCODE_CWD;
  }
}

export function setupUnocss(viteEnv: Env.ImportMeta) {
  ensurePresetIconsNodeLoader();

  const { VITE_ICON_PREFIX, VITE_ICON_LOCAL_PREFIX } = viteEnv;

  const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon');

  /** The name of the local icon collection */
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, '');

  return unocss({
    presets: [
      presetIcons({
        prefix: `${VITE_ICON_PREFIX}-`,
        scale: 1,
        extraProperties: {
          display: 'inline-block'
        },
        collections: {
          [collectionName]: FileSystemIconLoader(localIconPath, svg =>
            svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')
          )
        },
        warn: true,
        // Resolve icon JSON from the app root even under pnpm nested layouts.
        collectionsNodeResolvePath: process.cwd()
      })
    ]
  });
}
