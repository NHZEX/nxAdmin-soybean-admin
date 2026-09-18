import type { Ref } from 'vue';
import { useTimeoutFn } from '@vueuse/core';

export interface DebouncedCommitControls {
  readonly isPending: Readonly<Ref<boolean>>;
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
}

/**
 * 延迟提交可频繁变化的输入，并允许在 Enter、失焦等明确提交时机立即执行。
 */
export function useDebouncedCommit(commit: () => void, delay = 150): DebouncedCommitControls {
  const { isPending, start, stop } = useTimeoutFn(commit, delay, { immediate: false });

  function flush(): void {
    stop();
    commit();
  }

  return {
    isPending,
    schedule: start,
    flush,
    cancel: stop
  };
}
