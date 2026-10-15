import { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { isPlainObject } from 'lodash-es';
import { truncateString } from '@sa/utils';
import { ApiResponseError } from '~/packages/axios/src/shared';

function getPayloadMessage(data: Record<string, unknown>): string {
  if (typeof data.msg === 'string' && data.msg) return data.msg;
  return typeof data.message === 'string' ? data.message : '';
}

function normalizePayload(data: Record<string, unknown>): { code: number | string; message: string } {
  const code = data.code ?? data.errno ?? -1;
  return {
    code: typeof code === 'string' || (typeof code === 'number' && Number.isFinite(code)) ? code : -1,
    message: getPayloadMessage(data)
  };
}

/** 普通响应和下载请求的 Blob 错误共用相同的字段兼容规则，保留 code: 0。 */
export async function normalizeResponseErrorData(data: unknown): Promise<{ code: number | string; message: string }> {
  if (isPlainObject(data)) return normalizePayload(data as Record<string, unknown>);

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    const text = await data.text();
    try {
      const payload: unknown = JSON.parse(text);
      if (isPlainObject(payload)) return normalizePayload(payload as Record<string, unknown>);
    } catch {
      return { code: -1, message: truncateString(text, 128, '[omit...]') };
    }
  }

  return { code: -1, message: '' };
}

/** 适用于调用方静默全局通知后，在表单等位置自行展示错误。 */
export function getResponseErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof ApiResponseError) return error.message || fallback;
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data;
    if (isPlainObject(data)) return getPayloadMessage(data as Record<string, unknown>) || error.message || fallback;
    return error.message || fallback;
  }
  if (isPlainObject(error)) return getPayloadMessage(error as Record<string, unknown>) || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function shouldSilenceError(error: ApiResponseError, policy: AxiosRequestConfig['silentErrorNotify']): boolean {
  if (typeof policy !== 'function') return policy === true;
  try {
    return policy(error) === true;
  } catch {
    return false;
  }
}
