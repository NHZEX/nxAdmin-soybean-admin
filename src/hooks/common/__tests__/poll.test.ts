import { effectScope, ref, watch } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type UsePollFnReturn, usePollFn } from '../poll';

interface PollTestContext extends UsePollFnReturn {
  stop: () => void;
}

function createPoll(
  cb: () => Promise<void> | void,
  interval = 10,
  options: Parameters<typeof usePollFn>[2] = {}
): PollTestContext {
  const scope = effectScope();
  const poll = scope.run(() =>
    usePollFn(cb, interval, {
      immediate: false,
      pauseWhenHidden: false,
      pauseWhenDeactivated: false,
      ...options
    })
  );

  if (!poll) {
    throw new Error('poll 创建失败');
  }

  return {
    ...poll,
    stop: () => scope.stop(),
    resume: poll.resume,
    pause: poll.pause,
    execute: poll.execute
  };
}

describe('usePollFn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('skip 模式下不会并发重入', async () => {
    let running = 0;
    let maxRunning = 0;
    let callCount = 0;

    const poll = createPoll(
      async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise<void>(resolve => {
          setTimeout(resolve, 50);
        });
        callCount += 1;
        running -= 1;
      },
      10,
      { mode: 'skip' }
    );

    poll.resume();
    await vi.advanceTimersByTimeAsync(220);

    expect(maxRunning).toBe(1);
    expect(callCount).toBeGreaterThan(0);
    expect(callCount).toBeLessThanOrEqual(5);

    poll.stop();
  });

  it('serial 模式按“执行完成 + 间隔”串行调度', async () => {
    const startTimes: number[] = [];

    const poll = createPoll(
      async () => {
        startTimes.push(Date.now());
        await new Promise<void>(resolve => {
          setTimeout(resolve, 30);
        });
      },
      20,
      { mode: 'serial' }
    );

    poll.resume();
    await vi.advanceTimersByTimeAsync(180);

    expect(startTimes.length).toBeGreaterThanOrEqual(3);
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(50);
    expect(startTimes[2] - startTimes[1]).toBeGreaterThanOrEqual(50);

    poll.stop();
  });

  it('coalesce 模式在忙时会合并并触发 trailing', async () => {
    const startTimes: number[] = [];

    const poll = createPoll(
      async () => {
        startTimes.push(Date.now());
        await new Promise<void>(resolve => {
          setTimeout(resolve, 30);
        });
      },
      10,
      { mode: 'coalesce' }
    );

    poll.resume();
    await vi.advanceTimersByTimeAsync(75);

    expect(startTimes.length).toBeGreaterThanOrEqual(2);
    expect(startTimes[1] - startTimes[0]).toBe(30);

    poll.stop();
  });

  it('pause/resume 可以正确暂停与恢复', async () => {
    let callCount = 0;

    const poll = createPoll(async () => {
      callCount += 1;
    }, 20);

    poll.resume();
    await vi.advanceTimersByTimeAsync(65);
    const beforePause = callCount;

    poll.pause();
    await vi.advanceTimersByTimeAsync(100);
    expect(callCount).toBe(beforePause);

    poll.resume();
    await vi.advanceTimersByTimeAsync(45);
    expect(callCount).toBeGreaterThan(beforePause);

    poll.stop();
  });

  it('无 document 环境不会抛错', () => {
    const globalObj = globalThis as { document?: Document };
    const hasDocument = Object.hasOwn(globalObj, 'document');
    const originalDocument = globalObj.document;

    try {
      if (hasDocument) {
        Object.defineProperty(globalObj, 'document', {
          configurable: true,
          writable: true,
          value: undefined
        });
      }

      const scope = effectScope();
      expect(() => {
        scope.run(() => {
          usePollFn(
            async () => {
              await Promise.resolve();
            },
            20,
            { immediate: false, pauseWhenHidden: true }
          );
        });
      }).not.toThrow();
      scope.stop();
    } finally {
      if (hasDocument) {
        Object.defineProperty(globalObj, 'document', {
          configurable: true,
          writable: true,
          value: originalDocument
        });
      } else {
        Reflect.deleteProperty(globalObj, 'document');
      }
    }
  });

  it('execute 可手动触发一次回调', async () => {
    let callCount = 0;

    const poll = createPoll(async () => {
      callCount += 1;
    }, 20);

    await poll.execute();
    expect(callCount).toBe(1);

    poll.stop();
  });

  it('stop 后 resume 不会重新启动轮询', async () => {
    let callCount = 0;

    const poll = createPoll(async () => {
      callCount += 1;
    }, 20);

    poll.stop();
    poll.resume();
    await vi.advanceTimersByTimeAsync(100);

    expect(callCount).toBe(0);
  });

  it('stop 后 execute 为 no-op', async () => {
    let callCount = 0;

    const poll = createPoll(async () => {
      callCount += 1;
    }, 20);

    poll.stop();
    await poll.execute();

    expect(callCount).toBe(0);
  });

  it('默认手动execute仍不改变既有轮询倒计时，也允许暂停时显式执行', async () => {
    const callback = vi.fn();
    const poll = createPoll(callback, 15);
    poll.resume();
    await vi.advanceTimersByTimeAsync(14);
    await poll.execute();
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(2);
    poll.pause();
    await poll.execute();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(poll.isActive.value).toBe(false);
    poll.stop();
  });

  it.each(['serial', 'skip', 'coalesce', 'overlap'] as const)(
    '%s手动执行完成后顺延，旧定时器不重复触发，活动状态保持稳定',
    async mode => {
      const callback = vi.fn(
        () =>
          new Promise<void>(resolve => {
            setTimeout(resolve, 5);
          })
      );
      const poll = createPoll(callback, 15, { mode, resetIntervalOnExecute: true });
      poll.resume();
      const states: boolean[] = [];
      const unwatch = watch(poll.isActive, value => states.push(value), { flush: 'sync' });
      await vi.advanceTimersByTimeAsync(14);
      const reading = poll.execute();
      await vi.advanceTimersByTimeAsync(5);
      await reading;
      expect(callback).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(14);
      expect(callback).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(states).toEqual([]);
      unwatch();
      poll.stop();
      await vi.advanceTimersByTimeAsync(5);
    }
  );

  it('执行失败也从结束后顺延，并只报告一次错误', async () => {
    const error = new Error('offline');
    const onError = vi.fn();
    const callback = vi.fn().mockRejectedValue(error);
    const poll = createPoll(callback, 15, { resetIntervalOnExecute: true, onError });
    poll.resume();
    await vi.advanceTimersByTimeAsync(14);
    await poll.execute();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    await vi.advanceTimersByTimeAsync(14);
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(2);
    poll.stop();
  });

  it.each(['serial', 'skip'] as const)(
    '%s的resetInterval只顺延倒计时，不额外执行immediateCallback或恢复暂停',
    async mode => {
      const callback = vi.fn();
      const poll = createPoll(callback, 15, { mode, immediateCallback: true });
      poll.resume();
      await vi.advanceTimersByTimeAsync(14);
      expect(callback).toHaveBeenCalledTimes(1);
      poll.resetInterval();
      expect(callback).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(14);
      expect(callback).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(callback).toHaveBeenCalledTimes(2);
      poll.pause();
      poll.resetInterval();
      await vi.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledTimes(2);
      poll.stop();
    }
  );

  it('enabled响应式控制启停，不能覆盖手动暂停，resume也不能绕过禁用', async () => {
    const enabled = ref(false);
    const callback = vi.fn();
    const poll = createPoll(callback, 15, { immediate: true, immediateCallback: true, enabled: () => enabled.value });
    expect(callback).not.toHaveBeenCalled();
    enabled.value = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenCalledTimes(1);
    poll.pause();
    enabled.value = false;
    enabled.value = true;
    await vi.advanceTimersByTimeAsync(30);
    expect(callback).toHaveBeenCalledTimes(1);
    poll.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenCalledTimes(2);
    enabled.value = false;
    poll.resume();
    await vi.advanceTimersByTimeAsync(30);
    expect(poll.isActive.value).toBe(false);
    expect(callback).toHaveBeenCalledTimes(2);
    poll.stop();
  });

  it('多次trigger防抖为一批，共享等待实际执行结束的promise', async () => {
    const callback = vi.fn(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 50);
        })
    );
    const poll = createPoll(callback, 15000);
    poll.resume();
    const first = poll.trigger({ debounce: 300 });
    await vi.advanceTimersByTimeAsync(100);
    const second = poll.trigger({ debounce: 300 });
    expect(second).toBe(first);
    let settled = false;
    first.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(299);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(50);
    await first;
    expect(settled).toBe(true);
    poll.stop();
  });

  it.each(['serial', 'skip', 'coalesce', 'overlap'] as const)(
    '%s执行中的多个trigger只补一次，await等待后续刷新而非当前请求',
    async mode => {
      const finishes: (() => void)[] = [];
      const callback = vi.fn(
        () =>
          new Promise<void>(resolve => {
            finishes.push(resolve);
          })
      );
      const poll = createPoll(callback, 15000, { mode, resetIntervalOnExecute: true });
      poll.resume();
      const current = poll.execute();
      const trailing = poll.trigger();
      expect(poll.trigger()).toBe(trailing);
      let settled = false;
      trailing.then(() => {
        settled = true;
      });
      expect(callback).toHaveBeenCalledTimes(1);
      finishes[0]();
      await current;
      expect(callback).toHaveBeenCalledTimes(2);
      expect(settled).toBe(false);
      finishes[1]();
      await trailing;
      expect(settled).toBe(true);
      poll.stop();
    }
  );

  it('skip触发策略在忙时不追加后续刷新', async () => {
    let finish!: () => void;
    const callback = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const poll = createPoll(callback, 15000);
    poll.resume();
    const current = poll.execute();
    await poll.trigger({ whenRunning: 'skip' });
    finish();
    await current;
    expect(callback).toHaveBeenCalledTimes(1);
    poll.stop();
  });

  it.each(['serial', 'skip'] as const)('%s等待trigger后可再次执行，不会被尚未释放的锁跳过', async mode => {
    const callback = vi.fn();
    const poll = createPoll(callback, 15000, { mode, resetIntervalOnExecute: true });
    poll.resume();
    await poll.trigger();
    await poll.execute();
    expect(callback).toHaveBeenCalledTimes(2);
    poll.stop();
  });

  it('enabled禁用期间保留最新触发，恢复后重新防抖，并等待请求结束', async () => {
    const enabled = ref(true);
    const callback = vi.fn();
    const poll = createPoll(callback, 15000, { enabled });
    poll.resume();
    const request = poll.trigger({ debounce: 300 });
    await vi.advanceTimersByTimeAsync(100);
    enabled.value = false;
    expect(poll.trigger({ debounce: 300 })).toBe(request);
    await vi.advanceTimersByTimeAsync(15000);
    expect(callback).not.toHaveBeenCalled();
    enabled.value = true;
    await vi.advanceTimersByTimeAsync(299);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await request;
    expect(callback).toHaveBeenCalledTimes(1);
    poll.stop();
  });

  it.each(['serial', 'skip', 'coalesce', 'overlap'] as const)(
    '%s自动读取满足防抖请求时也从完成后顺延，不重复读取',
    async mode => {
      const callback = vi.fn(
        () =>
          new Promise<void>(resolve => {
            setTimeout(resolve, 20);
          })
      );
      const poll = createPoll(callback, 100, { mode, resetIntervalOnExecute: true });
      poll.resume();
      await vi.advanceTimersByTimeAsync(90);
      const request = poll.trigger({ debounce: 30 });
      await vi.advanceTimersByTimeAsync(30);
      await request;
      expect(callback).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(99);
      expect(callback).toHaveBeenCalledTimes(1);
      poll.stop();
    }
  );

  it('手动暂停和卸载取消待执行触发并结清promise，恢复不会补旧触发', async () => {
    const callback = vi.fn();
    const poll = createPoll(callback, 15000);
    poll.resume();
    const canceled = poll.trigger({ debounce: 300 });
    poll.pause();
    await canceled;
    poll.resume();
    await vi.advanceTimersByTimeAsync(300);
    expect(callback).not.toHaveBeenCalled();
    const disposed = poll.trigger({ debounce: 300 });
    poll.stop();
    await disposed;
    await poll.trigger();
    await vi.advanceTimersByTimeAsync(15000);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('显式execute可绕过enabled，但不会消耗禁用期间排队的trigger', async () => {
    const enabled = ref(false);
    const callback = vi.fn();
    const poll = createPoll(callback, 15000, { immediate: true, enabled });
    const pending = poll.trigger();
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await poll.execute();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    enabled.value = true;
    await pending;
    expect(callback).toHaveBeenCalledTimes(2);
    expect(settled).toBe(true);
    poll.stop();
  });

  it('coalesce忙时由后续定时读取满足触发后，停止旧ticker并从完成后重新计时', async () => {
    const callback = vi.fn(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 20);
        })
    );
    const poll = createPoll(callback, 10, { mode: 'coalesce', resetIntervalOnExecute: true });
    poll.resume();
    await vi.advanceTimersByTimeAsync(15);
    const pending = poll.trigger();
    await vi.advanceTimersByTimeAsync(35);
    await pending;
    expect(callback).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(9);
    expect(callback).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(3);
    poll.stop();
    await vi.advanceTimersByTimeAsync(20);
  });

  it('coalesce未开启顺延且持续忙碌时，已完成批次不会等待无关后续轮次', async () => {
    const callback = vi.fn(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 30);
        })
    );
    const poll = createPoll(callback, 10, { mode: 'coalesce' });
    poll.resume();
    await vi.advanceTimersByTimeAsync(15);
    const pending = poll.trigger();
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(54);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(poll.isRunning.value).toBe(true);
    poll.pause();
    await vi.advanceTimersByTimeAsync(30);
    poll.stop();
  });
});
