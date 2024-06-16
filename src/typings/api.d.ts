// 不要使用任何 import type 语句导入，会导致 ts 全局声明转变为模块，无法全局应用
// 正确例子: type SystemUserType = import('@/enum/system-manage').SystemUserType;

/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  namespace Common {
    /** common params of paginating */
    interface PaginatingCommonParams {
      /** current page number */
      current?: number; // 暂时兼容避免类型检测错误
      /** page size */
      size?: number; // 暂时兼容避免类型检测错误
      /** total count */
      total: number;
      // 新增参数声明
      /** current page number */
      page?: number;
      /** page size */
      limit?: number;
    }

    /** common params of paginating query list data 完成全部实现后再考虑如何融合该类 */
    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      records?: T[]; // 暂时兼容避免类型检测错误
      data?: T[];
    }
    interface LegacyPaginatingQueryRecord<T = any>
      extends Omit<PaginatingCommonParams, 'current' | 'size' | 'page' | 'limit'> {
      data: T[];
      page: {
        current: number;
        size: number;
        hasMore: boolean;
      };
    }

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '1' | '2';

    /** common record */
    type CommonRecord<T = any> = {
      /** record id */
      id: number;
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
      /** record status */
      status: EnableStatus | null;
    } & T;

    /** common record */
    type LegacyCommonRecord<T = any> = {
      id: number;
      readonly create_time: number;
      readonly update_time: number;
      readonly lock_version: number;
    } & T;
  }

  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      uuid: string;
      refreshToken?: string; // 目前用不上
    }

    interface LoginPermission {
      [key: string]: boolean;
    }

    type AuthItem = string[] | string | boolean | null;

    interface UserInfo {
      userId?: string;
      userName?: string;
      roles?: string[];
      buttons?: string[];
      user: SystemManage.User;
      permission: LoginPermission;
    }
  }

  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }
  }

  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  export namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size' | 'page' | 'limit'>;

    /** role */
    type Role = Common.CommonRecord<{
      /** role name */
      roleName: string;
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    type RoleOption = CommonType.OptionEx<
      number,
      {
        type: number;
      }
    >;

    /** all role */
    type AllRole = Pick<Role, 'id' | 'roleName' | 'roleCode'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '1' | '2';

    type SystemUserType = import('@/enum/system-manage').SystemUserType;

    /** user */
    type User = Common.LegacyCommonRecord<{
      id: number;
      genre: SystemUserType;
      status: number;
      role_id: number;
      role_ids: number[];
      nickname: string;
      username: string;
      email?: string;
      group_id?: number;
      readonly signup_ip?: string;
      readonly last_login_time?: number;
      readonly last_login_ip?: string;
      readonly status_desc?: string;
      readonly genre_desc?: string;
      avatar_data?: null;
      avatar?: string;
      readonly role_name?: string;
      readonly roles?: { id: number; name: string }[];
    }>;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'username' | 'nickname' | 'status' | 'genre'> & CommonSearchParams
    >;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /**
     * menu type
     *
     * - "1": directory
     * - "2": menu
     */
    type MenuType = '1' | '2';

    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    /**
     * icon type
     *
     * - "1": iconify icon
     * - "2": local icon
     */
    type IconType = '1' | '2';

    type MenuPropsOfRoute = Pick<
      import('vue-router').RouteMeta,
      | 'i18nKey'
      | 'keepAlive'
      | 'constant'
      | 'order'
      | 'href'
      | 'hideInMenu'
      | 'activeMenu'
      | 'multiTab'
      | 'fixedIndexInTab'
      | 'query'
    >;

    type Menu = Common.CommonRecord<{
      /** parent menu id */
      parentId: number;
      /** menu type */
      menuType: MenuType;
      /** menu name */
      menuName: string;
      /** route name */
      routeName: string;
      /** route path */
      routePath: string;
      /** component */
      component?: string;
      /** iconify icon name or local icon name */
      icon: string;
      /** icon type */
      iconType: IconType;
      /** buttons */
      buttons?: MenuButton[] | null;
      /** children menu */
      children?: Menu[] | null;
    }> &
      MenuPropsOfRoute;

    /** menu list */
    type MenuList = Common.PaginatingQueryRecord<Menu>;

    type MenuTree = {
      id: number;
      label: string;
      pId: number;
      children?: MenuTree[];
    };
  }
}
