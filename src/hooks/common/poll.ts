import { computed, getCurrentInstance, onActivated, onDeactivated, onScopeDispose, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

type Awaitable<T> = T | PromiseLike<T>;
interface PollExecution {
  restartCountdown: boolean;
  completedTriggers: (() => void)[];
}

type AutoPauseReason = 'hidden' | 'deactivated';

const DEFAULT_INTERVAL_MS = 1000;

export type PollMode = 'serial' | 'skip' | 'coalesce' | 'overlap';

export interface UsePollFnOptions {
  mode?: PollMode;
  immediate?: boolean;
  immediateCallback?: boolean;
  /** Reactive scheduling gate; resume() cannot override it or automatic lifecycle pauses. */
  enabled?: MaybeRefOrGetter<boolean>;
  /** Restart the countdown after an actual execute()/trigger() run, including failures. Defaults to false. */
  resetIntervalOnExecute?: boolean;
  pauseWhenHidden?: boolean;
  pauseWhenDeactivated?: boolean;
  onError?: (error: unknown) => void;
}

export interface PollTriggerOptions {
  /** Trailing debounce in milliseconds. Automatic pauses restart the debounce on resume. */
  debounce?: number;
  /** Keep one pending refresh while busy (default), or skip this trigger. */
  whenRunning?: 'trailing' | 'skip';
}

export interface UsePollFnReturn {
  isActive: Ref<boolean>;
  isRunning: Ref<boolean>;
  pause: () => void;
  resume: () => void;
  /** Legacy explicit execution bypasses scheduling gates; serial/skip calls made while busy are skipped. */
  execute: () => Promise<void>;
  /** Obeys scheduling gates; resolves after the requested refresh or cancellation of a queued trigger. */
  trigger: (options?: PollTriggerOptions) => Promise<void>;
  /** Restart the active countdown without executing or changing pause state. */
  resetInterval: () => void;
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
    enabled = true,
    resetIntervalOnExecute = false,
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
  let triggerTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingTrigger: {
    promise: Promise<void>;
    resolve: () => void;
    debounce: number;
    ready: boolean;
  } | null = null;

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
    return !disposed && manualEnabled.value && Boolean(toValue(enabled)) && autoPauseReasons.size === 0;
  }

  function clearTriggerTimer() {
    if (triggerTimer !== null) clearTimeout(triggerTimer);
    triggerTimer = null;
  }

  function cancelTrigger() {
    clearTriggerTimer();
    const pending = pendingTrigger;
    pendingTrigger = null;
    pending?.resolve();
  }

  function flushTrigger() {
    if (!pendingTrigger?.ready || !canSchedule() || locked || isRunning.value) return;
    execute().catch(handleError);
  }

  function armTrigger() {
    clearTriggerTimer();
    if (!pendingTrigger || !canSchedule()) return;
    if (pendingTrigger.debounce === 0) {
      pendingTrigger.ready = true;
      flushTrigger();
      return;
    }
    triggerTimer = setTimeout(() => {
      triggerTimer = null;
      if (pendingTrigger) pendingTrigger.ready = true;
      flushTrigger();
    }, pendingTrigger.debounce);
  }

  function trigger(triggerOptions: PollTriggerOptions = {}): Promise<void> {
    if (disposed || (triggerOptions.whenRunning === 'skip' && isRunning.value)) return Promise.resolve();
    if (!pendingTrigger) {
      let resolve!: () => void;
      const promise = new Promise<void>(done => {
        resolve = done;
      });
      pendingTrigger = { promise, resolve, debounce: 0, ready: false };
    }
    const pending = pendingTrigger;
    const delay = Number(triggerOptions.debounce ?? 0);
    pending.debounce = Number.isFinite(delay) ? Math.max(0, delay) : 0;
    pending.ready = false;
    armTrigger();
    return pending.promise;
  }

  function stopScheduler() {
    clearTimers();
    clearTriggerTimer();
    if (pendingTrigger) pendingTrigger.ready = false;
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

  async function runCallback(execution: PollExecution) {
    if (disposed) return;

    // Any new read can satisfy pending triggers, including a periodic read that starts before the debounce expires.
    // Triggers received during that read form a separate trailing batch with their own completion promise.
    const pending = canSchedule() ? pendingTrigger : null;
    if (pending) {
      pendingTrigger = null;
      clearTriggerTimer();
      // A scheduled read satisfying a trigger also adopts its countdown-reset policy.
      if (resetIntervalOnExecute && !execution.restartCountdown) {
        execution.restartCountdown = true;
        clearTimers();
        serialRunToken += 1;
      }
    }
    runningCount.value += 1;
    try {
      await cb();
    } catch (error) {
      handleError(error);
    } finally {
      runningCount.value -= 1;
      if (pending) execution.completedTriggers.push(pending.resolve);
    }
  }

  async function runExclusive(execution: PollExecution) {
    if (locked) return;
    locked = true;
    try {
      await runCallback(execution);
    } finally {
      locked = false;
    }
  }

  async function runCoalesced(execution: PollExecution) {
    if (locked) {
      coalesced = true;
      return;
    }

    locked = true;
    try {
      const runTrailing = async (): Promise<void> => {
        coalesced = false;
        await runCallback(execution);
        if (!canSchedule() || !coalesced) return;
        // A continuously busy ticker must not keep completed trigger batches waiting for unrelated rounds.
        execution.completedTriggers.splice(0).forEach(resolve => resolve());
        await runTrailing();
      };

      await runTrailing();
    } finally {
      locked = false;
    }
  }

  async function performExecution(resetCountdown: boolean) {
    if (disposed) return;
    const execution: PollExecution = {
      restartCountdown: resetCountdown && (mode === 'overlap' || !locked),
      completedTriggers: []
    };
    if (execution.restartCountdown) {
      clearTimers();
      serialRunToken += 1;
    }
    try {
      switch (mode) {
        case 'overlap':
          await runCallback(execution);
          break;
        case 'coalesce':
          await runCoalesced(execution);
          break;
        case 'serial':
        case 'skip':
        default:
          await runExclusive(execution);
          break;
      }
    } finally {
      if (execution.restartCountdown) resetInterval();
      // Exclusive/coalesced locks are released before a trailing trigger can start.
      flushTrigger();
      // In exclusive modes, awaiting a trigger must also wait for lock release and countdown reset.
      execution.completedTriggers.forEach(resolve => resolve());
    }
  }

  function execute() {
    return performExecution(resetIntervalOnExecute);
  }

  function startTickerScheduler(runImmediately = immediateCallback) {
    isActive.value = true;
    intervalTimer = setInterval(() => {
      performExecution(false).catch(handleError);
    }, resolveIntervalMs());

    if (runImmediately) {
      performExecution(false).catch(handleError);
    }
  }

  function startSerialScheduler(runImmediately = immediateCallback) {
    const token = ++serialRunToken;

    async function runLoop() {
      if (!canSchedule() || token !== serialRunToken) return;
      await performExecution(false);
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

    if (runImmediately) {
      runLoop().catch(handleError);
      return;
    }

    scheduleNext(resolveIntervalMs());
  }

  function startScheduler() {
    if (isActive.value || !canSchedule()) return;

    if (mode === 'serial') {
      startSerialScheduler();
    } else {
      startTickerScheduler();
    }
    armTrigger();
  }

  function resetInterval() {
    if (!isActive.value || !canSchedule()) return;
    clearTimers();
    // Keep isActive stable: postponing a timer must not look like a lifecycle pause to consumers.
    if (mode === 'serial') startSerialScheduler(false);
    else startTickerScheduler(false);
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
    cancelTrigger();
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

  watch(() => Boolean(toValue(enabled)), syncScheduler, { flush: 'sync' });

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
    cancelTrigger();
    stopScheduler();
  });

  return {
    isActive,
    isRunning,
    pause,
    resume,
    execute,
    trigger,
    resetInterval
  };
}
