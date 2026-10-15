// @vitest-environment jsdom
import { Blob as NodeBlob } from 'node:buffer';
import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getResponseErrorMessage, normalizeResponseErrorData } from '../error-message';
import { createResponseError } from '../shared';
import type { RequestInstanceState } from '../type';
import { ApiResponseError } from '~/packages/axios/src/shared';

vi.mock('@/store/modules/auth', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/utils/storage', () => ({ localStg: {} }));
vi.mock('../../api', () => ({ fetchRefreshToken: vi.fn() }));

describe('请求错误归一化', () => {
  beforeEach(() => {
    vi.stubGlobal('Blob', NodeBlob);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [
      { code: 0, errno: 5, msg: '校验失败' },
      { code: 0, message: '校验失败' }
    ],
    [
      { errno: 400, message: '参数错误' },
      { code: 400, message: '参数错误' }
    ],
    [
      { code: 'INVALID', msg: '', message: '详细错误' },
      { code: 'INVALID', message: '详细错误' }
    ],
    [
      { code: null, errno: 7, msg: null, message: '兼容字段' },
      { code: 7, message: '兼容字段' }
    ],
    [
      { code: {}, msg: { error: true } },
      { code: -1, message: '' }
    ],
    [{}, { code: -1, message: '' }]
  ])('对象与 Blob 使用一致的字段规则：%j', async (payload, expected) => {
    expect(await normalizeResponseErrorData(payload)).toEqual(expected);
    expect(await normalizeResponseErrorData(new Blob([JSON.stringify(payload)]))).toEqual(expected);
  });

  it('下载失败的非 JSON 文本受长度限制', async () => {
    const { code, message } = await normalizeResponseErrorData(new Blob(['x'.repeat(200)]));
    expect(code).toBe(-1);
    expect(message).toHaveLength(128);
    expect(message.endsWith('[omit...]')).toBe(true);
  });

  it.each([null, undefined, [], 'text', 0])('不支持的数据保留空消息供请求层回退：%j', async payload => {
    expect(await normalizeResponseErrorData(payload)).toEqual({ code: -1, message: '' });
  });

  it('合法但非对象的 Blob JSON 使用回退值', async () => {
    expect(await normalizeResponseErrorData(new Blob(['[]']))).toEqual({ code: -1, message: '' });
  });

  it('调用方可以从包装错误、AxiosError、普通错误及对象提取消息', () => {
    const wrapped = new ApiResponseError('业务校验失败', { code: 0, innerError: null });
    const response = { data: { msg: '后端消息' } } as AxiosResponse;
    const axiosError = new AxiosError('HTTP error', 'ERR_BAD_REQUEST', undefined, undefined, response);
    expect(getResponseErrorMessage(wrapped)).toBe('业务校验失败');
    expect(getResponseErrorMessage(axiosError)).toBe('后端消息');
    expect(getResponseErrorMessage(new AxiosError('Network Error'))).toBe('Network Error');
    expect(getResponseErrorMessage(new Error('本地错误'))).toBe('本地错误');
    expect(getResponseErrorMessage({ message: '表单错误' })).toBe('表单错误');
    expect(getResponseErrorMessage({ msg: {} }, '默认提示')).toBe('默认提示');
    expect(getResponseErrorMessage(null)).toBe('请求失败');
  });
});

describe('条件静默通知', () => {
  let notify = vi.fn();
  let instance: RequestInstanceState;

  beforeEach(() => {
    notify = vi.fn();
    window.$message = { error: notify } as unknown as NonNullable<Window['$message']>;
    instance = { errMsgStack: [], refreshTokenPromise: null };
  });
  afterEach(() => {
    delete window.$message;
  });

  function createError(policy?: AxiosRequestConfig['silentErrorNotify'], withResponse = true) {
    const config = { headers: new AxiosHeaders(), url: '/example', silentErrorNotify: policy };
    const response = withResponse
      ? ({ status: 422, statusText: 'Unprocessable Entity', data: {}, config } as AxiosResponse)
      : undefined;
    const innerError = new AxiosError('failure', 'ERR_BAD_REQUEST', config, undefined, response);
    return createResponseError('错误信息', { code: 0, innerError }, instance);
  }

  it.each([undefined, false])('未静默时展示通知：%s', policy => {
    const error = createError(policy);
    expect(notify).toHaveBeenCalledOnce();
    expect(error.code).toBe(0);
    expect(error.config?.url).toBe('/example');
    expect(error.response?.status).toBe(422);
  });

  it('布尔静默保留返回错误和请求配置', () => {
    const error = createError(true);
    expect(notify).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(ApiResponseError);
    expect(error.config?.silentErrorNotify).toBe(true);
  });

  it('只静默业务校验失败，网络错误继续通知', () => {
    const policy = vi.fn((error: ApiResponseError) => error.response?.status === 422 && error.code === 0);
    const validationError = createError(policy);
    expect(policy).toHaveBeenCalledWith(validationError);
    expect(notify).not.toHaveBeenCalled();
    createError(policy, false);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('静默策略抛错时仍返回原始错误并展示通知', () => {
    const error = createError(() => {
      throw new Error('bad policy');
    });
    expect(error.message).toBe('错误信息');
    expect(notify).toHaveBeenCalledOnce();
  });

  it('显式配置适用于非 Axios 错误', () => {
    const policy = vi.fn(() => true);
    const config = { silentErrorNotify: policy };
    const error = createResponseError('业务失败', { code: 10, innerError: null, config }, instance);
    expect(error.config).toBe(config);
    expect(policy).toHaveBeenCalledWith(error);
    expect(notify).not.toHaveBeenCalled();
  });

  it('取消的请求不通知，也不调用静默策略', () => {
    const policy = vi.fn(() => false);
    const innerError = new CanceledError('cancelled');
    const error = createResponseError(
      '取消',
      { code: -1, innerError, config: { silentErrorNotify: policy } },
      instance
    );
    expect(error.isCancel()).toBe(true);
    expect(policy).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
