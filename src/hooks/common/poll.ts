import { computed, getCurrentInstance, onActivated, onDeactivated, onScopeDispose, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

type Awaitable<T> = T | PromiseLike<T>;

type AutoPauseReason = 'hidden' | 'deactivated';

const DEFAULT_INTERVAL_MS = 1000;

export type PollMode = 'serial' | 'skip' | 'coalesce' | 'overlap';

export interface UsePollFnOptions {
  mode?: PollMode;
  immediate?: boolean;
  immediateCallback?: boolean;
  pauseWhenHidden?: boolean;
  pauseWhenDeactivated?: boolean;
  onError?: (error: unknown) => void;
}

export interface UsePollFnReturn {
  isActive: Ref<boolean>;
  isRunning: Ref<boolean>;
  pause: () => void;
  resume: () => void;
  execute: () => Promise<void>;
}

export function usePollFn(
  cb: () => Awaitable<void>,
  interval: MaybeRefOrGetter<number> = DEFAULT_INTERVAL_MS,
  options: UsePollFnOptions = {}
): UsePollFnReturn {
  const {
    mode = 'serial',
    immediate = true,
    immediateCallback = false,
    pauseWhenHidden = true,
    pauseWhenDeactivated = true,
    onError
  } = options;

  const isActive = ref(false);
  const runningCount = ref(0);
  const isRunning = computed(() => runningCount.value > 0);
  const manualEnabled = ref(immediate);

  const autoPauseReasons = new Set<AutoPauseReason>();

  let locked = false;
  let coalesced = false;
  let disposed = false;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let serialTimer: ReturnType<typeof setTimeout> | null = null;
  let serialRunToken = 0;

  function resolveIntervalMs() {
    const raw = Number(toValue(interval));
    if (!Number.isFinite(raw)) return DEFAULT_INTERVAL_MS;
    return Math.max(0, raw);
  }

  function clearTimers() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
    if (serialTimer) {
      clearTimeout(serialTimer);
      serialTimer = null;
    }
  }

  function canSchedule() {
    return !disposed && manualEnabled.value && autoPauseReasons.size === 0;
  }

  function stopScheduler() {
    clearTimers();
    isActive.value = false;
    serialRunToken += 1;
    coalesced = false;
  }

  function handleError(error: unknown) {
    if (onError) {
      onError(error);
    } else {
      console.error('[usePollFn] poll callback error', error);
    }
  }

  async function runCallback() {
    if (disposed) return;

    runningCount.value += 1;
    try {
      await cb();
    } catch (error) {
      handleError(error);
    } finally {
      runningCount.value -= 1;
    }
  }

  async function runExclusive() {
    if (locked) return;
    locked = true;
    try {
      await runCallback();
    } finally {
      locked = false;
    }
  }

  async function runCoalesced() {
    if (locked) {
      coalesced = true;
      return;
    }

    locked = true;
    try {
      const runTrailing = async (): Promise<void> => {
        coalesced = false;
        await runCallback();
        if (!canSchedule() || !coalesced) return;
        await runTrailing();
      };

      await runTrailing();
    } finally {
      locked = false;
    }
  }

  async function execute() {
    if (disposed) return;

    switch (mode) {
      case 'overlap':
        await runCallback();
        break;
      case 'coalesce':
        await runCoalesced();
        break;
      case 'serial':
      case 'skip':
      default:
        await runExclusive();
        break;
    }
  }

  function startTickerScheduler() {
    isActive.value = true;
    intervalTimer = setInterval(() => {
      execute().catch(handleError);
    }, resolveIntervalMs());

    if (immediateCallback) {
      execute().catch(handleError);
    }
  }

  function startSerialScheduler() {
    const token = ++serialRunToken;

    async function runLoop() {
      if (!canSchedule() || token !== serialRunToken) return;
      await runExclusive();
      if (!canSchedule() || token !== serialRunToken) return;
      scheduleNext(resolveIntervalMs());
    }

    function scheduleNext(delay: number) {
      if (!canSchedule() || token !== serialRunToken) return;
      serialTimer = setTimeout(() => {
        serialTimer = null;
        runLoop().catch(handleError);
      }, delay);
    }

    isActive.value = true;

    if (immediateCallback) {
      runLoop().catch(handleError);
      return;
    }

    scheduleNext(resolveIntervalMs());
  }

  function startScheduler() {
    if (isActive.value || !canSchedule()) return;

    if (mode === 'serial') {
      startSerialScheduler();
      return;
    }

    startTickerScheduler();
  }

  function syncScheduler() {
    if (canSchedule()) {
      startScheduler();
    } else {
      stopScheduler();
    }
  }

  function pause() {
    manualEnabled.value = false;
    stopScheduler();
  }

  function resume() {
    if (disposed) return;

    manualEnabled.value = true;
    syncScheduler();
  }

  function setAutoPauseReason(reason: AutoPauseReason, paused: boolean) {
    if (disposed) return;

    const hasReason = autoPauseReasons.has(reason);

    if (paused && !hasReason) {
      autoPauseReasons.add(reason);
      syncScheduler();
      return;
    }

    if (!paused && hasReason) {
      autoPauseReasons.delete(reason);
      syncScheduler();
    }
  }

  if (pauseWhenHidden && typeof document !== 'undefined') {
    const handleVisibilityChange = () => {
      setAutoPauseReason('hidden', document.visibilityState !== 'visible');
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    onScopeDispose(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  const vm = getCurrentInstance();
  if (pauseWhenDeactivated && vm) {
    onDeactivated(() => {
      setAutoPauseReason('deactivated', true);
    });

    onActivated(() => {
      setAutoPauseReason('deactivated', false);
    });
  }

  watch(
    () => toValue(interval),
    () => {
      if (!isActive.value) return;
      stopScheduler();
      startScheduler();
    }
  );

  if (manualEnabled.value) {
    syncScheduler();
  }

  onScopeDispose(() => {
    disposed = true;
    manualEnabled.value = false;
    stopScheduler();
  });

  return {
    isActive,
    isRunning,
    pause,
    resume,
    execute
  };
}
