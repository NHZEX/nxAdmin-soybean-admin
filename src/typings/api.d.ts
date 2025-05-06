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
      total: number;
      page: {
        current: number;
        size: number;
        hasMore: boolean;
      };
    }

    /** common search params of table */
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

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
}
