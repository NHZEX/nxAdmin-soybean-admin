import { request } from '@/service/request';

export function fetchResetCache() {
  return request<null>({
    url: '/v2/system/resetCache',
    method: 'post',
    extractLevel: 2
  });
}
