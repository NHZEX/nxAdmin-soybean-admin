// @vitest-environment jsdom
import { KeepAlive, defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type UsePollFnReturn, usePollFn } from '../poll';

function createPoll(callback = vi.fn()) {
  const enabled = ref(true);
  const visible = ref(true);
  let poll!: UsePollFnReturn;
  const view = defineComponent({
    setup() {
      poll = usePollFn(callback, 15000, { enabled, resetIntervalOnExecute: true });
      return () => h('div');
    }
  });
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, () => (visible.value ? h(view) : null)) }));
  return { poll, wrapper, enabled, visible, callback };
}

describe('usePollFn触发生命周期', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('标签页隐藏保留待触发批次，enabled变化和resume不能绕过隐藏状态', async () => {
    const { poll, wrapper, callback, enabled } = createPoll();
    const pending = poll.trigger({ debounce: 300 });
    await vi.advanceTimersByTimeAsync(100);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    enabled.value = false;
    enabled.value = true;
    poll.resume();
    expect(poll.isActive.value).toBe(false);
    expect(poll.trigger({ debounce: 300 })).toBe(pending);
    await vi.advanceTimersByTimeAsync(30000);
    expect(callback).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(299);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14999);
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('KeepAlive停用时合并触发，返回后补一次，手动暂停仍具有独立效力', async () => {
    const { poll, wrapper, callback, visible } = createPoll();
    const pending = poll.trigger({ debounce: 300 });
    visible.value = false;
    await flushPromises();
    expect(poll.trigger({ debounce: 300 })).toBe(pending);
    await vi.advanceTimersByTimeAsync(30000);
    expect(callback).not.toHaveBeenCalled();
    visible.value = true;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(300);
    await pending;
    expect(callback).toHaveBeenCalledTimes(1);
    poll.pause();
    visible.value = false;
    await flushPromises();
    visible.value = true;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(30000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(poll.isActive.value).toBe(false);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('卸载取消隐藏页的待执行触发并解除事件监听，迟到回调不重新调度', async () => {
    let finish!: () => void;
    const callback = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const { poll, wrapper } = createPoll(callback);
    const reading = poll.trigger();
    expect(callback).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    const queued = poll.trigger({ debounce: 300 });
    wrapper.unmount();
    await queued;
    finish();
    await reading;
    await flushPromises();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    poll.resume();
    await poll.trigger();
    await vi.advanceTimersByTimeAsync(30000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(poll.isRunning.value).toBe(false);
    expect(poll.isActive.value).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
