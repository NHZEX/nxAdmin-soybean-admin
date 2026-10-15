import { effectScope } from 'vue';
import { AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTable } from '../table-v1';

vi.mock('@/store/modules/app', () => ({ useAppStore: () => ({ isMobile: false, locale: 'zh-CN' }) }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@sa/hooks', async () => ({
  useHookTableV1: (await import('~/packages/hooks/src/use-table-v1')).default,
  useBoolean: (await import('~/packages/hooks/src/use-boolean')).default
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function response(id: number) {
  const data = { records: [{ id }], current: id, size: 10, total: 20 };
  return {
    data,
    error: null,
    response: { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } }
  };
}

describe('Naive UI v1 表格请求调度', () => {
  const scopes: ReturnType<typeof effectScope>[] = [];

  afterEach(() => {
    scopes.splice(0).forEach(scope => scope.stop());
    vi.useRealTimers();
  });

  function createTable(
    apiFn: (params: Api.Common.CommonSearchParams, signal?: AbortSignal) => Promise<ReturnType<typeof response>>,
    options: { abortPrevious?: boolean; debounce?: { ms?: number; maxWait?: number } } = {}
  ) {
    const scope = effectScope();
    scopes.push(scope);
    return scope.run(() =>
      useTable({ apiFn, apiParams: { current: 1, size: 10 }, columns: () => [], immediate: false, ...options })
    )!;
  }

  it('透传取消选项，并忽略无视取消信号的迟到响应', async () => {
    const oldRead = deferred<ReturnType<typeof response>>();
    const newRead = deferred<ReturnType<typeof response>>();
    const api = vi.fn().mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise);
    const table = createTable(api, { abortPrevious: true });
    const first = table.getData();
    table.updateSearchParams({ current: 2 });
    const second = table.getData();
    expect(api.mock.calls[0][1].aborted).toBe(true);
    expect(api.mock.calls[1][1].aborted).toBe(false);
    expect(api.mock.calls[0][0].current).toBe(1);
    expect(api.mock.calls[1][0].current).toBe(2);

    newRead.resolve(response(2));
    await second;
    oldRead.resolve(response(1));
    await first;
    expect(table.data.value[0].id).toBe(2);
    expect(table.pagination.page).toBe(2);
    expect(table.loading.value).toBe(false);
  });

  it('旧请求结束不能关闭新请求的加载状态，当前请求失败后正常结束加载', async () => {
    const oldRead = deferred<ReturnType<typeof response>>();
    const newRead = deferred<ReturnType<typeof response>>();
    const api = vi.fn().mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise);
    const table = createTable(api, { abortPrevious: true });
    const first = table.getData();
    const second = table.getData();
    oldRead.resolve(response(1));
    await first;
    expect(table.loading.value).toBe(true);
    expect(table.data.value).toEqual([]);
    newRead.reject(new Error('network failure'));
    await expect(second).rejects.toThrow('network failure');
    expect(table.loading.value).toBe(false);
  });

  it('透传防抖和 maxWait，持续搜索也会在最大等待时间内读取最新参数', async () => {
    vi.useFakeTimers();
    const api = vi.fn().mockResolvedValue(response(1));
    const table = createTable(api, { debounce: { ms: 100, maxWait: 250 } });
    table.getData();
    await vi.advanceTimersByTimeAsync(80);
    table.updateSearchParams({ current: 2 });
    table.getData();
    await vi.advanceTimersByTimeAsync(80);
    table.getData();
    await vi.advanceTimersByTimeAsync(80);
    table.getData();
    expect(api).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10);
    expect(api).toHaveBeenCalledOnce();
    expect(api.mock.calls[0][0]).toEqual({ current: 2, size: 10 });
    await vi.advanceTimersByTimeAsync(200);
    expect(api).toHaveBeenCalledOnce();
  });
});
