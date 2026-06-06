declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      uuid?: string;
      refreshToken?: string;
    }

    interface LoginPermission {
      [key: string]: boolean;
    }

    type AuthItem = string[] | string | boolean | null | undefined;

    interface UserInfo {
      userId?: string;
      userName?: string;
      roles?: string[];
      buttons?: string[];
      user: Api.SystemManage.User;
      permission: LoginPermission;
    }
  }
}
