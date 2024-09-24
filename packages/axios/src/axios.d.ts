import 'axios';

export interface NxAxiosRequestConfig {
  // 是否启用鉴权流程
  authorization?: boolean;
  // 是否直接导出响应数据 0: axios.resp 1: resp.data 2: resp.data.data
  extractLevel?: 0 | 1 | 2;
  // 是否静默错误通知
  silentErrorNotify?: boolean;
}

declare module 'axios' {
  export interface AxiosRequestConfig extends NxAxiosRequestConfig {}
}
