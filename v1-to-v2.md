// common.d.ts 中被删了
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


// naive-ui.d.ts 中被删除/大改

  type TableDataWithIndex<T> = import('@sa/hooks').TableDataWithIndex<T>;
  type FlatResponseData<T> = import('@sa/axios').FlatResponseData<T>;

  /**
   * the custom column key
   *
   * if you want to add a custom column, you should add a key to this type
   */
  type CustomColumnKey = 'operate' | '_dateInfo';

  type ComponentsBasicsType = 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary';


// theme-drawer\index.vue 简化模式需要重新支持
import { useThemeStore } from '@/store/modules/theme';
const themeStore = useThemeStore();
<ThemeColor v-if="!themeStore.simplifyMode" />
<PageFun v-if="!themeStore.simplifyMode" />

// hooks\common\table.ts 的兼容性修改

type TableData = NaiveUI.LegacyTableData;
type GetTableData<A extends NaiveUI.TableApiFn> = NaiveUI.GetTableData<A>;
type TableColumn<T> = NaiveUI.TableColumn<T>;

// hooks\src\use-table.ts 的 resetFirstPage 实现

async function getData(options?: { resetFirstPage?: boolean }) {
startLoading();

if (options?.resetFirstPage === true) {
  searchParams.current = 1;
}

const formattedParams = formatSearchParams(searchParams);


// axios\src\type.ts

有个 ApiData 的新定义，注意看一下

考虑重新实现 cancelRequest

// transformBackendResponse: ResponseTransform<AxiosResponse<ResponseData>, ApiData>;

// service\request\index.ts

检查 transform 与 transformBackendResponse 的区别

onRequest 使用 const Authorization = getAuthorization();
