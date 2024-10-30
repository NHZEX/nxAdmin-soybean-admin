import { h } from 'vue';
import { NButton } from 'naive-ui';
import { $t } from '@/locales';

const checkUpdateLoopInterval = 5 * 60 * 1000;
const storagePrefix = import.meta.env.VITE_STORAGE_PREFIX || '';

let isShowUpdateNotify = false;
let lastCheckTime = 0;

export function registerUpdateCheck() {
  triggerTimeout();

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    await runUpdateCheck();
  });
}

function triggerTimeout() {
  setTimeout(() => {
    requestIdleCallback(async () => {
      try {
        await runUpdateCheck();
      } finally {
        triggerTimeout();
      }
    });
  }, checkUpdateLoopInterval);
}

async function runUpdateCheck() {
  if (isShowUpdateNotify) {
    return;
  }
  if (Date.now() - lastCheckTime < 30 * 1000) {
    // 30 秒内不再重复检查，避免多种触发器短时间重复触发
    return;
  }
  lastCheckTime = Date.now();
  if (!(await checkHtmlUpdate())) {
    // 当前没有可用更新
    return;
  }

  // 显示更新通知
  showUpdateNotify();
}

function showUpdateNotify() {
  isShowUpdateNotify = true;
  const n = window.$notification?.create({
    title: $t('system.updateTitle'),
    content: $t('system.updateContent'),
    action() {
      return h('div', { style: { display: 'flex', justifyContent: 'end', gap: '12px', width: '325px' } }, [
        h(
          NButton,
          {
            onClick() {
              n?.destroy();
            }
          },
          () => $t('system.updateCancel')
        ),
        h(
          NButton,
          {
            type: 'primary',
            onClick() {
              location.reload();
            }
          },
          () => $t('system.updateConfirm')
        )
      ]);
    },
    onClose() {
      isShowUpdateNotify = false;
    }
  });
}

async function checkHtmlUpdate(): Promise<boolean> {
  const location = window.location;
  const indexUrl = `${location.protocol}//${location.host}${location.pathname}`;

  const resp = await fetch(`${indexUrl}?time=${Date.now()}`, {
    method: 'HEAD'
  });

  if (resp.status >= 400) {
    return false;
  }
  if ((resp.headers.get('content-type')?.indexOf('text/html') ?? -1) === -1) {
    return false;
  }

  const date = resp.headers.get('last-modified') || resp.headers.get('date');
  const etag = resp.headers.get('etag');
  if (!etag) {
    return false;
  }

  const keyDate = `${storagePrefix}_APP_RELEASE_DATE`;
  const keyEtag = `${storagePrefix}_APP_RELEASE_ETAG`;

  const localReleaseDate = localStorage.getItem(keyDate);
  const localReleaseEtag = localStorage.getItem(keyEtag);

  try {
    // localReleaseDate 包含数据代表非首次加载
    if (localReleaseDate && etag !== localReleaseEtag) {
      console.debug('checkHtmlUpdate: new version', date, etag);
      return true;
    }
  } finally {
    localStorage.setItem(keyDate, date ?? '-1');
    localStorage.setItem(keyEtag, etag);
  }
  return false;
}
