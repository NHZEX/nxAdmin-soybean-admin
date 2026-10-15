import 'axios';
import type { ApiResponseError } from './shared';

export interface NxAxiosRequestConfig {
  // 是否启用鉴权流程
  authorization?: boolean;
  // 是否直接导出响应数据 0: axios.resp 1: resp.data 2: resp.data.data
  extractLevel?: 0 | 1 | 2;
  /** 返回 true 时静默全局错误通知，错误仍正常返回给调用方。策略抛错时保留通知。 */
  silentErrorNotify?: boolean | ((error: ApiResponseError) => boolean);
}

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AxiosRequestConfig extends NxAxiosRequestConfig {}
}
