import type { CreateAxiosDefaults } from 'axios';
import type { IAxiosRetryConfig } from 'axios-retry';
import { stringify } from 'qs';
import { axiosRetryIsNetworkOrIdempotentRequestError, isHttpSuccess } from './shared';
import type { RequestOption } from './type';

export function createDefaultOptions<
  ResponseData,
  ApiData = ResponseData,
  State extends Record<string, unknown> = Record<string, unknown>
>(options?: Partial<RequestOption<ResponseData, ApiData, State>>) {
  const opts: RequestOption<ResponseData, ApiData, State> = {
    enableAutoRetry: true,
    defaultState: {} as State,
    transform: async response => response.data as unknown as ApiData,
    transformBackendResponse: async response => response.data as unknown as ApiData,
    onRequest: async config => config,
    onResponseValidation: () => true,
    isBackendSuccess: _response => true,
    onBackendFail: async () => {},
    onError: async () => Promise.resolve(null)
  };

  if (options?.transform) {
    opts.transform = options.transform;
  } else {
    opts.transform = options?.transformBackendResponse || opts.transform;
  }

  Object.assign(opts, options);

  return opts;
}

export function createRetryOptions(config?: Partial<CreateAxiosDefaults>) {
  const retryConfig: IAxiosRetryConfig = {
    retries: 1,
    // @ts-ignore 这里误报
    retryCondition: axiosRetryIsNetworkOrIdempotentRequestError
  };

  Object.assign(retryConfig, config);

  return retryConfig;
}

export function createAxiosConfig(config?: Partial<CreateAxiosDefaults>) {
  const TEN_SECONDS = 10 * 1000;

  const axiosConfig: CreateAxiosDefaults = {
    timeout: TEN_SECONDS,
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: isHttpSuccess,
    paramsSerializer: params => {
      return stringify(params);
    }
  };

  Object.assign(axiosConfig, config);

  return axiosConfig;
}
