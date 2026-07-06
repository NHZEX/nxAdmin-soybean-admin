# v2.0.2 桥接基座说明

## 基线状态

- 当前分支：`dev/4.2`
- 已合入上游标签：
  - `v2.0.0`
  - `v2.0.2`
- 当前目标：把本项目先收敛为稳定的 v2 桥接基座，供后续业务项目升级复用，不在本轮强制迁移所有旧页面到上游 v2 新表格 API。

## 有意保留的兼容能力

- `Api.Auth.LoginToken` 兼容本地登录返回，保留 `uuid?` 与 `refreshToken?`。
- `Api.Auth.UserInfo` 对齐本地后端实际结构，保留 `user` 与 `permission`。
- `Api.Auth.AuthItem` 继续作为路由和组件权限输入类型。
- `NaiveUI.ComponentsBasicsType` 从 `naive-ui` 的 `TagProps['type']` 派生，避免手写类型与组件库漂移。
- `Api.Common.LegacyPaginatingQueryRecord` 专门描述旧后端分页结构。
- `src/hooks/common/table-v1.ts` 作为旧页面到 v2 基线之间的表格兼容层。

## 请求层约定

- `extractLevel` 继续保留：
  - `0`：返回原始 axios 响应。
  - `1`：返回后端统一响应包。
  - `2`：返回后端 `data`。
- `silentErrorNotify` 继续保留，给自行展示错误信息的调用方使用。
- `ApiResponseError` 继续保留，便于调用方识别和处理标准化后的请求错误。

## 表格兼容层边界

- 新代码优先使用上游 v2 表格 API。
- 存量系统管理页面可以继续使用 v1 兼容层导出的 `useTable`、`useTableOperate`、`wrapApiFn`。
- `wrapApiFn` 只负责旧分页协议适配：
  - 请求参数：`current/size` 转为 `page/limit`。
  - 响应结果：`data/page/total` 转为 `records/current/size/total`。
- 兼容层不继续扩大职责，避免后续业务项目升级时形成新的冲突面。

## 后续工作

- 补齐验证码支持。
- 补齐机器码支持。
- 补齐云配置拉取。
- 完善组件级权限展示与控制。
- 待下游项目完成迁移后，再统一评估 `Route.meta.roles` 是否改为 `permissions` 或 `auth`。

## 验证记录

- `git diff --check HEAD`：已通过。
- `pnpm typecheck`：已通过。
- `pnpm lint-diff`：已通过。
