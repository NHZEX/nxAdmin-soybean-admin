import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { h } from 'vue';
import { NAlert } from 'naive-ui';
import { AxiosError } from 'axios';
import { localStg } from '@/utils/storage';
import { useAuthStore } from '@/store/modules/auth';
import { ApiResponseError } from '~/packages/axios/src/shared';
import { sanitizeHTML } from '~/packages/utils';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

/**
 * refresh token 当前对接用不上
 *
 * @param axiosConfig - request config when the token is expired
 */
export async function handleRefreshToken(axiosConfig: AxiosRequestConfig) {
  const { resetStore } = useAuthStore();

  const refreshToken = localStg.get('refreshToken') || '';
  const { error, data } = await fetchRefreshToken(refreshToken);
  if (!error) {
    localStg.set('token', data.token);
    localStg.set('refreshToken', data?.refreshToken ?? 'null');

    const config = { ...axiosConfig };
    if (config.headers) {
      config.headers.Authorization = data.token;
    }

    return config;
  }

  resetStore();

  return null;
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}

export function createResponseError<T = any, D = any>(
  message: string,
  state: {
    code: number | string;
    innerError: AxiosError<T, D> | Error | object | null;
    response?: AxiosResponse<T, D>;
    config?: AxiosRequestConfig<D>;
  },
  instance?: RequestInstanceState
): ApiResponseError {
  if (state.response === undefined && state.innerError instanceof AxiosError) {
    state.response = state.innerError.response;
  }
  if (state.config === undefined && state.innerError instanceof AxiosError) {
    state.config = state.innerError.config;
  }

  const error = new ApiResponseError(message, {
    code: state.code,
    innerError: state.innerError,
    response: state.response
  });

  if (instance !== undefined && state.innerError instanceof AxiosError) {
    const silentErrorNotify = state.innerError?.config?.silentErrorNotify ?? true;
    if (silentErrorNotify) {
      notifyResponseError(error, instance);
    }
  }

  return error;
}

function notifyResponseError(error: ApiResponseError, state: RequestInstanceState) {
  // todo errMsgStack 应当改为 Set 性能更好
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const content = error
    .toReportMessage()
    .split('\n')
    .map(v => `<p>${sanitizeHTML(v)}</p>`)
    .join('');

  const isExist = state.errMsgStack.includes(content);

  if (!isExist) {
    state.errMsgStack.push(content);

    window.$message?.error('请求失败', {
      render: props => {
        return h(
          NAlert,
          {
            closable: props.closable,
            onClose: props.onClose,
            type: 'error',
            title: props.content as string,
            style: {
              boxShadow: 'var(--n-box-shadow)',
              maxWidth: 'calc(100vw - 32px)',
              width: '480px'
            }
          },
          {
            default: () => h('div', { innerHTML: content })
          }
        );
      },
      onLeave() {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== content);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
