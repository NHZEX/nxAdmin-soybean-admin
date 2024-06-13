import type {
  AxiosRequestConfig,
  AxiosResponse,
  CancelTokenSource,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig
} from 'axios';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { nanoid } from '@sa/utils';
import { isNumber, isObject } from 'radash';
import { createAxiosConfig, createDefaultOptions, createRetryOptions } from './options';
import { BACKEND_ERROR_CODE, REQUEST_ID_KEY, RESPONSE_UNRECOGNIZED } from './constant';
import type {
  CustomAxiosRequestConfig,
  FlatRequestInstance,
  MappedType,
  RequestInstance,
  RequestOption,
  ResponseType
} from './type';
import { ApiResponseError } from './shared';

function createCommonRequest<ResponseData = any>(
  axiosConfig?: CreateAxiosDefaults,
  options?: Partial<RequestOption<ResponseData>>
) {
  const opts = createDefaultOptions<ResponseData>(options);

  const axiosConf = createAxiosConfig(axiosConfig);
  const instance = axios.create(axiosConf);

  const cancelTokenSourceMap = new Map<string, CancelTokenSource>();

  // config axios retry
  if (opts.enableAutoRetry) {
    const retryOptions = createRetryOptions(axiosConf);
    axiosRetry(instance, retryOptions);
  }

  instance.interceptors.request.use(conf => {
    const config: InternalAxiosRequestConfig = { ...conf };

    // set request id
    const requestId = nanoid();
    config.headers.set(REQUEST_ID_KEY, requestId);

    // config cancel token
    const cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;
    cancelTokenSourceMap.set(requestId, cancelTokenSource);

    // handle config by hook
    return opts.onRequest?.(config) || config;
  });

  instance.interceptors.response.use(
    async response => {
      const requestConfig = response.request as AxiosRequestConfig;

      /**
       * 弃用判断，不在支持通过 responseType !== json 来判断是否失败
       *
       * const responseType: ResponseType = (response.config?.responseType as ResponseType) || 'json'; true ===
       * (responseType !== 'json' || opts.isBackendSuccess(response)) 完成响应验证
       */

      // 二进制数据则直接返回原始结果
      if (requestConfig.responseType === 'blob' || requestConfig.responseType === 'arraybuffer') {
        return Promise.resolve(response);
      }
      // 204 空响应直接返回原始结果
      if (response.status === 204) {
        return Promise.resolve(response);
      }
      // 响应结果是一个符合预期的结构
      if (isNumber(response.data?.code) && response.data?.code >= 0) {
        return Promise.resolve(response);
      }

      const backendError = new AxiosError<ResponseData>(
        '无法识别的响应',
        RESPONSE_UNRECOGNIZED,
        response.config,
        response.request,
        response
      );

      await opts.onError(backendError);

      return Promise.reject(backendError);
    },
    async (error: AxiosError<ResponseData>) => {
      if (!axios.isAxiosError(error)) {
        return new ApiResponseError(`fault: ${error}`, {
          code: -1,
          innerError: error
        });
      }
      if (axios.isCancel(error)) {
        error.message = `request canceled: ${error.message}`;
        return new ApiResponseError(`request canceled: ${error.message}`, {
          code: -1,
          innerError: error
        });
      }
      const result = await opts.onError(error);

      if (result && isObject(result)) {
        return Promise.reject(result);
      }

      return Promise.reject(error);
    }
  );

  function cancelRequest(requestId: string) {
    const cancelTokenSource = cancelTokenSourceMap.get(requestId);
    if (cancelTokenSource) {
      cancelTokenSource.cancel();
      cancelTokenSourceMap.delete(requestId);
    }
  }

  function cancelAllRequest() {
    cancelTokenSourceMap.forEach(cancelTokenSource => {
      cancelTokenSource.cancel();
    });
    cancelTokenSourceMap.clear();
  }

  return {
    instance,
    opts,
    cancelRequest,
    cancelAllRequest
  };
}

/**
 * create a request instance
 *
 * @param axiosConfig axios config
 * @param options request options
 */
export function createRequest<ResponseData = any, State = Record<string, unknown>>(
  axiosConfig?: CreateAxiosDefaults,
  options?: Partial<RequestOption<ResponseData>>
) {
  const { instance, opts, cancelRequest, cancelAllRequest } = createCommonRequest<ResponseData>(axiosConfig, options);

  const request: RequestInstance<State> = async function request<T = any, R extends ResponseType = 'json'>(
    config: CustomAxiosRequestConfig
  ) {
    const response: AxiosResponse<ResponseData> = await instance(config);

    const responseType = response.config?.responseType || 'json';

    if (responseType === 'json') {
      return opts.transformBackendResponse(response);
    }

    return response.data as MappedType<R, T>;
  } as RequestInstance<State>;

  request.cancelRequest = cancelRequest;
  request.cancelAllRequest = cancelAllRequest;
  request.state = {} as State;

  return request;
}

/**
 * create a flat request instance
 *
 * The response data is a flat object: { data: any, error: AxiosError }
 *
 * @param axiosConfig axios config
 * @param options request options
 */
export function createFlatRequest<ResponseData = any, State = Record<string, unknown>>(
  axiosConfig?: CreateAxiosDefaults,
  options?: Partial<RequestOption<ResponseData>>
): FlatRequestInstance<State, ResponseData> {
  const { instance, opts, cancelRequest, cancelAllRequest } = createCommonRequest<ResponseData>(axiosConfig, options);

  const flatRequest: FlatRequestInstance<State, ResponseData> = async function flatRequest<
    T = any,
    R extends ResponseType = 'json'
  >(config: CustomAxiosRequestConfig) {
    try {
      const response: AxiosResponse<ResponseData> = await instance(config);

      const responseType = response.config?.responseType || 'json';

      if (responseType === 'json') {
        const data = opts.transformBackendResponse(response);

        return { data, error: null };
      }

      return { data: response.data as MappedType<R, T>, error: null };
    } catch (error) {
      return { data: null, error };
    }
  } as FlatRequestInstance<State, ResponseData>;

  flatRequest.cancelRequest = cancelRequest;
  flatRequest.cancelAllRequest = cancelAllRequest;
  flatRequest.state = {} as State;

  return flatRequest;
}

export { BACKEND_ERROR_CODE, REQUEST_ID_KEY };
export type * from './type';
export type { CreateAxiosDefaults, AxiosError };
