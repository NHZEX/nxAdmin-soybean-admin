import type {
  AxiosError,
  AxiosHeaderValue,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import { isIdempotentRequestError, isNetworkError } from 'axios-retry';
import { sanitizeHTML } from '@sa/utils';
import axios from 'axios';

export function getContentType(config: InternalAxiosRequestConfig) {
  const contentType: AxiosHeaderValue = config.headers?.['Content-Type'] || 'application/json';

  return contentType;
}

/**
 * check if http status is success
 *
 * @param status
 */
export function isHttpSuccess(status: number) {
  const isSuccessCode = status >= 200 && status < 300;
  return isSuccessCode || status === 304;
}

/**
 * is response json
 *
 * @param response axios response
 */
export function isResponseJson(response: AxiosResponse) {
  const { responseType } = response.config;

  return responseType === 'json' || responseType === undefined;
}

// 重新包装请求失败异常信息
export class ApiResponseError<T = any, D = any> extends Error implements Error {
  public readonly code: number | string;
  public readonly innerError: AxiosError<T, D> | Error | object | null;
  public readonly response?: AxiosResponse<T, D>;
  public readonly url: string | null;
  public readonly config?: AxiosRequestConfig<D>;

  constructor(
    message: string,
    state: {
      code: number | string;
      innerError: AxiosError<T, D> | Error | object | null;
      response?: AxiosResponse<T, D>;
      config?: AxiosRequestConfig<D> | InternalAxiosRequestConfig<D>;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = state.code;
    this.innerError = state.innerError;
    this.response = state.response;
    this.config = state.config;
    this.url = state.response?.request?.responseURL;

    // 设置原型链
    Object.setPrototypeOf(this, ApiResponseError.prototype);
  }

  public isAxiosError(): boolean {
    return axios.isAxiosError(this.innerError);
  }

  public isCancel(): boolean {
    return axios.isCancel(this.innerError);
  }

  public toReportMessage(): string {
    let url = this.url ? new URL(this.url) : '';
    if (url instanceof URL) {
      url = url.pathname + url.search + url.hash;
    }
    const responseStatus = `${this.response?.status} ${httpStatusToText(this.response?.status ?? 0) ?? this.response?.statusText}`;
    return [sanitizeHTML(this.message), `at status (${responseStatus})`, `at settle (${sanitizeHTML(url)})`].join('\n');
  }
}

export function httpStatusToText(code: number): string {
  switch (code) {
    case 400:
      return '请求错误';
    case 401:
      return '登录状态被拒绝';
    case 403:
      return '拒绝访问';
    case 404:
      return '请求地址出错';
    case 408:
      return '请求超时';
    case 500:
      return '服务器内部错误';
    case 501:
      return '服务未实现';
    case 502:
      return '网关错误';
    case 503:
      return '服务不可用';
    case 504:
      return '网关超时';
    case 505:
      return 'HTTP 版本不受支持';
    default:
      return `unknown-${code}`;
  }
}

export function axiosRetryIsNetworkOrIdempotentRequestError(error: AxiosError): boolean {
  // http-code 500 不是可重试的状态
  return isNetworkError(error) || (error.response?.status !== 500 && isIdempotentRequestError(error));
}
