import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponseError } from './shared';
import type { NxAxiosRequestConfig } from './axios';

export type ContentType =
  | 'text/html'
  | 'text/plain'
  | 'multipart/form-data'
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'application/octet-stream';

export interface RequestOption<ResponseData = any> {
  /** 是否开启自动重试 */
  enableAutoRetry: boolean;
  /**
   * The hook before request
   *
   * For example: You can add header token in this hook
   *
   * @param config Axios config
   */
  onRequest: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  /**
   * The hook to check backend response is success or not
   *
   * @deprecated 当前不再使用
   * @param response Axios response
   */
  isBackendSuccess: (response: AxiosResponse<ResponseData>) => boolean;
  /**
   * The hook after backend request fail
   *
   * For example: You can handle the expired token in this hook
   *
   * @deprecated 当前不再使用
   * @param response Axios response
   * @param instance Axios instance
   */
  onBackendFail: (
    response: AxiosResponse<ResponseData>,
    instance: AxiosInstance
  ) => Promise<AxiosResponse | null> | Promise<void>;
  /**
   * transform backend response when the responseType is json
   *
   * @param response Axios response
   */
  transformBackendResponse(response: AxiosResponse<ResponseData>): any | Promise<any>;
  /**
   * The hook to handle error
   *
   * For example: You can show error message in this hook
   *
   * @param error
   */
  onError: (error: AxiosError<ResponseData>) => Promise<void> | Promise<AxiosError | ApiResponseError | Error | null>;
}

interface ResponseMap {
  blob: Blob;
  text: string;
  arrayBuffer: ArrayBuffer;
  stream: ReadableStream<Uint8Array>;
  document: Document;
}
export type ResponseType = keyof ResponseMap | 'json';

export type MappedType<R extends ResponseType, JsonType = any> = R extends keyof ResponseMap
  ? ResponseMap[R]
  : JsonType;

export type CustomAxiosRequestConfig<R extends ResponseType = 'json'> = Omit<AxiosRequestConfig, 'responseType'> & {
  responseType?: R;
} & NxAxiosRequestConfig;

export interface RequestInstanceCommon<T> {
  /**
   * cancel the request by request id
   *
   * if the request provide abort controller sign from config, it will not collect in the abort controller map
   *
   * @param requestId
   */
  cancelRequest: (requestId: string) => void;
  /**
   * cancel all request
   *
   * if the request provide abort controller sign from config, it will not collect in the abort controller map
   */
  cancelAllRequest: () => void;
  /** you can set custom state in the request instance */
  state: T;
}

/** The request instance */
export interface RequestInstance<S = Record<string, unknown>> extends RequestInstanceCommon<S> {
  <T = any, R extends ResponseType = 'json'>(config: CustomAxiosRequestConfig<R>): Promise<MappedType<R, T>>;
}

export type FlatResponseSuccessData<T = any, ResponseData = any> = {
  data: T;
  error: null;
  response: AxiosResponse<ResponseData>;
};

export type FlatResponseFailData<ResponseData = any> = {
  data: null;
  error: AxiosError<ResponseData>;
  response: AxiosResponse<ResponseData>;
};

export type FlatResponseData<T = any, ResponseData = any> =
  | FlatResponseSuccessData<T, ResponseData>
  | FlatResponseFailData<ResponseData>;

export interface FlatRequestInstance<S = Record<string, unknown>, ResponseData = any> extends RequestInstanceCommon<S> {
  <T = any, R extends ResponseType = 'json'>(
    config: CustomAxiosRequestConfig<R>
  ): Promise<FlatResponseData<MappedType<R, T>, ResponseData>>;
}
