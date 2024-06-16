import { localStg } from '@/utils/storage';

/** Get token */
export function getToken() {
  return localStg.get('token') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  localStg.remove('token');
  localStg.remove('refreshToken');
}

export function hasPermission(
  permissions: Set<string>,
  testAuth: Api.Auth.AuthItem,
  matchMode: 'some' | 'every' = 'some'
): boolean {
  if (testAuth === false || testAuth === null || undefined === testAuth) {
    return true;
  }
  if (testAuth === true && permissions.size > 0) {
    return true;
  }
  if (typeof testAuth === 'string' && permissions.has(testAuth)) {
    return true;
  }
  if (Array.isArray(testAuth)) {
    if (matchMode === 'some') {
      return testAuth.some(role => permissions.has(role));
    } else if (matchMode === 'every') {
      return testAuth.every(role => permissions.has(role));
    }
    return false;
  }
  return false;
}
