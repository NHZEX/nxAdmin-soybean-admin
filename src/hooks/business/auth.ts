import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    return authStore.testAccessPermission(codes);
  }

  function getUserInfo() {
    if (!authStore.isLogin) {
      return undefined;
    }

    return authStore.userInfo;
  }

  return {
    hasAuth,
    getUserInfo
  };
}
