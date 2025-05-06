declare namespace Api {
  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size' | 'page' | 'limit'>;

    type PermissionNode = {
      name: string;
      children?: PermissionNode[];
      isLeaf: boolean;
      [allow: number]: string;
      title: string;
      desc: string;
      pid: string;
      sort: number;
      spread: boolean;
      valid: boolean;
    };

    type PermissionNodeEx = Omit<PermissionNode, 'allow'> & {
      allow: {
        name: string;
        desc: string;
      }[];
    };

    type PermissionTree = PermissionNode[];
    type PermissionSet = string[];

    type PermissionBatchUpdateParams = {
      [name: string]: { sort: number; desc: string };
    };

    /** role */
    type Role = Common.LegacyCommonRecord<{
      readonly id: number;
      readonly pid: number;
      genre: number;
      status: number;
      name: string;
      description: string;
      readonly status_desc?: string;
      readonly genre_desc?: string;
      ext?: {
        permission?: string[];
      };
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'name' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    type RoleOption = CommonType.OptionEx<
      number,
      {
        type: number;
      }
    >;

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
  }
}
