import type { AxiosResponse } from 'axios';
import { isPlainObject } from 'lodash-es';
import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';
import { createResponseError } from '@/service/request/shared';
import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { $t } from '@/locales';
import { getAuthorization } from './shared';
import type { RequestInstanceState } from './type';
import { RESPONSE_UNRECOGNIZED } from '~/packages/axios/src/constant';
import { truncateString } from '~/packages/utils';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

function handleLogoutEx() {
  const authStore = useAuthStore();
  authStore.resetStore();
}

export const request = createFlatRequest(
  {
    baseURL,
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  {
    defaultState: {
      errMsgStack: [],
      refreshTokenPromise: null
    } as RequestInstanceState,
    transform(response: AxiosResponse<App.Service.Response<any>>) {
      const extractLevel = response.config.extractLevel ?? 1;
      switch (extractLevel) {
        case 1:
          return response.data;
        case 2:
          if (response.status === 204 || !isPlainObject(response.data)) {
            return response;
          }
          return response.data?.data;

        default:
          return response;
      }
    },
    async onRequest(config) {
      const Authorization = getAuthorization();
      if (Authorization) {
        Object.assign(config.headers, { Authorization });
      }

      return config;
    },
    isBackendSuccess() {
      // 已经弃用，该 hook 无实际用途
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onBackendFail(response, instance) {
      // 该钩子不会在请求成功时被调用了（非 4xx 5xx）
      const authStore = useAuthStore();

      function handleLogout() {
        authStore.resetStore();
      }

      function logoutAndCleanup() {
        handleLogout();
        window.removeEventListener('beforeunload', handleLogout);

        request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.msg);
      }

      if (response.status === 401) {
        handleLogout();
        return null;
      }

      // 确认重新登录当前是死代码，但具有一定的参考价值
      if (response.status === 401 && !request.state.errMsgStack?.includes(response.data.msg)) {
        request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.msg];

        // prevent the user from refreshing the page
        window.addEventListener('beforeunload', handleLogout);

        window.$dialog?.error({
          title: $t('common.error'),
          content: response.data.msg,
          positiveText: $t('common.confirm'),
          maskClosable: false,
          closeOnEsc: false,
          onPositiveClick() {
            logoutAndCleanup();
          },
          onClose() {
            logoutAndCleanup();
          }
        });

        return null;
      }

      // RefreshingToken 当前不使用，但具有一定的参考价值
      // // when the backend response code is in `expiredTokenCodes`, it means the token is expired, and refresh token
      // // the api `refreshToken` can not return error code in `expiredTokenCodes`, otherwise it will be a dead loop, should return `logoutCodes` or `modalLogoutCodes`
      // const expiredTokenCodes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',') || [];
      // if (expiredTokenCodes.includes(response.data.code) && !request.state.isRefreshingToken) {
      //   request.state.isRefreshingToken = true;
      //
      //   const refreshConfig = await handleRefreshToken(response.config);
      //
      //   request.state.isRefreshingToken = false;
      //
      //   if (refreshConfig) {
      //     return instance.request(refreshConfig) as Promise<AxiosResponse>;
      //   }
      // }

      return null;
    },
    transformBackendResponse(response) {
      return response.data;
    },
    async onError(error) {
      if (error.code === RESPONSE_UNRECOGNIZED) {
        return null;
      }
      const response = error.response;
      const respData = response?.data;
      const httpCode = response?.status;
      const requestState: RequestInstanceState = request.state;
      try {
        if (isPlainObject(respData)) {
          const errno = respData?.code || -1;
          const message = respData?.msg || respData?.message || 'unknown';
          return createResponseError(
            message,
            {
              code: errno,
              innerError: error
            },
            requestState
          );
        } else if (respData instanceof Blob) {
          const result = await respData.text();
          let message = 'unknown';
          let errno = -1;
          try {
            const data = JSON.parse(result);
            if (isPlainObject(data)) {
              errno = data.errno;
              message = data.message;
            }
          } catch {
            message = truncateString(result, 128, '[omit...]');
          }
          return createResponseError(
            message,
            {
              code: errno,
              innerError: error
            },
            requestState
          );
        }
        return createResponseError(
          `unknown error: ${error.code}, ${error.message}`,
          {
            code: -1,
            innerError: error
          },
          requestState
        );
      } finally {
        if (httpCode === 401) {
          // 会话过期
          handleLogoutEx();
        }
      }
    }
  }
);

/** @deprecated */
export const demoRequest = createRequest(
  {
    baseURL: otherBaseURL.demo
  },
  {
    transform(response: AxiosResponse<App.Service.DemoResponse>) {
      return response.data.result;
    },
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    onError: error => {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
      return Promise.resolve(null);
    }
  }
);
