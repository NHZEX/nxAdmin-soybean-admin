import { h } from 'vue';
import { NButton } from 'naive-ui';
import { $t } from '@/locales';
import {
  type AppVersionHeadPrecheckState,
  type AppVersionMessage,
  createAppVersionMessage,
  createRemoteValidator,
  decideHeadPrecheck,
  normalizeBuildTime,
  parseAppVersionMessage,
  parseBuildTimeFromHtml,
  recordHeadGetResult,
  resolveNextPollDelay,
  shouldNotifyAppUpdate
} from './app-version-check-utils';

const checkUpdateLoopInterval = 5 * 60 * 1000;
const ignoredCheckUpdateLoopInterval = 15 * 60 * 1000;
const checkThrottleInterval = 30 * 1000;
const externalCheckDeferInterval = 60 * 1000;
const fallbackGetThreshold = 6;
const unstableHeadThreshold = 3;
const storagePrefix = import.meta.env.VITE_STORAGE_PREFIX || '';
const channelName = `${storagePrefix || 'app'}_APP_VERSION_CHANNEL`;
const storageBroadcastKey = `${storagePrefix}_APP_VERSION_BROADCAST`;

let isShowUpdateNotify = false;
let notifiedBuildTime = '';
let ignoredBuildTime = '';
let lastCheckTime = 0;
let lastExternalCheckTime = 0;
let latestDetectedBuildTime = '';
let timerId: number | null = null;
let versionChannel: BroadcastChannel | null = null;
let headPrecheckState: AppVersionHeadPrecheckState = {
  lastRemoteValidator: '',
  stableHeadSkipCount: 0,
  headChangedStreak: 0,
  headPrecheckDisabled: false,
  fallbackGetThreshold
};

type AppVersionCheckTrigger = 'timer' | 'visibility';

interface RemoteHeadResult {
  validator: string;
  ok: boolean;
}

export function registerUpdateCheck() {
  registerVersionBroadcast();
  scheduleNextTimerCheck();

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    await runUpdateCheck('visibility');
  });
}

function scheduleNextTimerCheck() {
  if (timerId !== null) {
    window.clearTimeout(timerId);
  }

  const delay = resolveNextPollDelay({
    now: Date.now(),
    ignoredBuildTime,
    lastExternalCheckTime,
    defaultInterval: checkUpdateLoopInterval,
    ignoredInterval: ignoredCheckUpdateLoopInterval,
    externalDeferInterval: externalCheckDeferInterval
  });

  timerId = window.setTimeout(() => {
    timerId = null;
    requestIdleCallback(async () => {
      try {
        await runUpdateCheck('timer');
      } finally {
        scheduleNextTimerCheck();
      }
    });
  }, delay);
}

async function runUpdateCheck(trigger: AppVersionCheckTrigger) {
  if (isShowUpdateNotify) {
    return;
  }
  if (Date.now() - lastCheckTime < checkThrottleInterval) {
    // 30 秒内不再重复检查，避免多种触发器短时间重复触发
    return;
  }
  lastCheckTime = Date.now();
  if (trigger !== 'timer') {
    lastExternalCheckTime = lastCheckTime;
    scheduleNextTimerCheck();
  }

  const remoteBuildTime = await checkRemoteBuildTime();
  if (!remoteBuildTime) return;

  if (!handleDetectedBuildTime(remoteBuildTime)) {
    return;
  }

  broadcastVersionDetected(remoteBuildTime);
}

async function checkRemoteBuildTime(): Promise<string> {
  if (headPrecheckState.headPrecheckDisabled) {
    return await fetchRemoteBuildTime();
  }

  const headResult = await fetchRemoteHeadValidator();
  if (!headResult.ok) return '';

  const previousValidator = headPrecheckState.lastRemoteValidator;
  const decision = decideHeadPrecheck(headPrecheckState, headResult.validator);
  headPrecheckState = decision.nextState;

  if (!decision.shouldGetHtml) return '';

  const remoteBuildTime = await fetchRemoteBuildTime();
  const validatorChanged = Boolean(
    previousValidator && headResult.validator && previousValidator !== headResult.validator
  );
  headPrecheckState = recordHeadGetResult(headPrecheckState, {
    validatorChanged,
    remoteBuildTime,
    currentBuildTime: getCurrentBuildTime(),
    unstableThreshold: unstableHeadThreshold
  });

  return remoteBuildTime;
}

async function fetchRemoteHeadValidator(): Promise<RemoteHeadResult> {
  const location = window.location;
  const indexUrl = `${location.protocol}//${location.host}${location.pathname}`;

  try {
    const resp = await fetch(`${indexUrl}?time=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store'
    });

    if (resp.status >= 400) return { ok: false, validator: '' };
    if ((resp.headers.get('content-type')?.indexOf('text/html') ?? -1) === -1) {
      return { ok: false, validator: '' };
    }

    return {
      ok: true,
      validator: createRemoteValidator({
        etag: resp.headers.get('etag'),
        lastModified: resp.headers.get('last-modified') || resp.headers.get('date')
      })
    };
  } catch {
    return { ok: false, validator: '' };
  }
}

async function fetchRemoteBuildTime(): Promise<string> {
  const location = window.location;
  const indexUrl = `${location.protocol}//${location.host}${location.pathname}`;

  try {
    const resp = await fetch(`${indexUrl}?time=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (resp.status >= 400) return '';
    if ((resp.headers.get('content-type')?.indexOf('text/html') ?? -1) === -1) return '';

    return parseBuildTimeFromHtml(await resp.text());
  } catch {
    return '';
  }
}

function handleDetectedBuildTime(remoteBuildTime: string): boolean {
  const nextBuildTime = normalizeBuildTime(remoteBuildTime);
  if (nextBuildTime && nextBuildTime !== ignoredBuildTime) {
    ignoredBuildTime = '';
  }
  if (
    !shouldNotifyAppUpdate(
      {
        currentBuildTime: getCurrentBuildTime(),
        notifiedBuildTime,
        ignoredBuildTime,
        isShowing: isShowUpdateNotify
      },
      nextBuildTime
    )
  ) {
    return false;
  }

  latestDetectedBuildTime = nextBuildTime;
  notifiedBuildTime = nextBuildTime;
  showUpdateNotify();

  return true;
}

function getCurrentBuildTime(): string {
  return normalizeBuildTime(
    typeof BUILD_TIME === 'string'
      ? BUILD_TIME
      : document.querySelector<HTMLMetaElement>('meta[name="buildTime"]')?.content
  );
}

function registerVersionBroadcast() {
  if ('BroadcastChannel' in window) {
    versionChannel = new BroadcastChannel(channelName);
    versionChannel.addEventListener('message', event => {
      handleBroadcastMessage(event.data as AppVersionMessage);
    });
  }

  window.addEventListener('storage', event => {
    if (event.key !== storageBroadcastKey) return;

    const message = parseAppVersionMessage(event.newValue);
    if (message) handleBroadcastMessage(message);
  });
}

function handleBroadcastMessage(message: AppVersionMessage) {
  if (message.type !== 'app-version-detected') return;

  handleDetectedBuildTime(message.buildTime);
}

function broadcastVersionDetected(buildTime: string) {
  const message = createAppVersionMessage(buildTime);
  versionChannel?.postMessage(message);

  try {
    localStorage.setItem(storageBroadcastKey, JSON.stringify(message));
  } catch {
    // localStorage 可能被浏览器策略禁用；BroadcastChannel 已覆盖现代浏览器。
  }
}

function showUpdateNotify() {
  isShowUpdateNotify = true;
  let ignoreHandled = false;

  function ignoreCurrentBuildTime() {
    if (ignoreHandled) return;
    ignoreHandled = true;
    ignoredBuildTime = latestDetectedBuildTime;
    scheduleNextTimerCheck();
  }

  const n = window.$notification?.create({
    title: $t('system.updateTitle'),
    content: $t('system.updateContent'),
    action() {
      return h('div', { style: { display: 'flex', justifyContent: 'end', gap: '12px', width: '325px' } }, [
        h(
          NButton,
          {
            onClick() {
              ignoreCurrentBuildTime();
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
      ignoreCurrentBuildTime();
    }
  });
}
