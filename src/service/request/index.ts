import { BACKEND_ERROR_CODE, type FlatRequestInstance, createFlatRequest, createRequest } from '@sa/axios';
import { isPlainObject } from 'lodash-es';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { RESPONSE_UNRECOGNIZED } from '~/packages/axios/src/constant';
import { createResponseError } from '@/service/request/shared';
import { truncateString } from '~/packages/utils';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

function handleLogoutEx() {
  const authStore = useAuthStore();
  authStore.resetStore();
}

// request 重新声明临时解决错误 Vue: request implicitly has type any because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
export const request: FlatRequestInstance<RequestInstanceState, App.Service.Response> = createFlatRequest<
  App.Service.Response,
  RequestInstanceState
>(
  {
    baseURL,
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  {
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      if (token) {
        const Authorization = token ? `Bearer TK="${token}"` : null;
        Object.assign(headers, { Authorization });
      }

      return config;
    },
    isBackendSuccess() {
      // 已经弃用，该 hook 无实际用途
      return true;
    },

    async onBackendFail(response) {
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
    async onError(error) {
      if (error.code === RESPONSE_UNRECOGNIZED) {
        return null;
      }
      const response = error.response;
      const respData = response?.data;
      const httpCode = response?.status;
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
            request.state
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
          } catch (e) {
            message = truncateString(result, 128, '[omit...]');
          }
          return createResponseError(
            message,
            {
              code: errno,
              innerError: error
            },
            request.state
          );
        }
        return createResponseError(
          `unknown error: ${error.code}, ${error.message}`,
          {
            code: -1,
            innerError: error
          },
          request.state
        );
      } finally {
        if (httpCode === 401) {
          // 会话过期
          handleLogoutEx();
        }
      }
      // showErrorMsg(request.state, message);
    }
  }
);

/** @deprecated */
export const demoRequest = createRequest<App.Service.DemoResponse>(
  {
    baseURL: otherBaseURL.demo
  },
  {
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
    transformBackendResponse(response) {
      return response.data.result;
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
