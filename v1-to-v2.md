# v1 到 v2 迁移核对清单

## 已完成并收敛

- 认证类型已按本地后端协议恢复到独立声明文件，`LoginToken`、`AuthItem`、`UserInfo.user`、`UserInfo.permission` 等兼容项不再放在 `common.d.ts` 草稿里维护。
- 路由接口已拆分到独立路由类型声明，动态菜单和首页路由类型继续跟随当前 v2 结构。
- NaiveUI 兼容类型已收敛，`ComponentsBasicsType` 改为从 `naive-ui` 的 `TagProps['type']` 派生，避免手写枚举和组件库版本漂移。
- v1 表格能力已集中到兼容层，旧页面继续通过 `useHookTableV1`、`table-v1`、`wrapApiFn` 适配旧分页协议。
- 请求层已按当前基座保留兼容能力，包括 `extractLevel`、`getAuthorization`、`transformBackendResponse` 和标准化错误处理。

## 仍需确认或迁移

- 验证码、机器码、云配置拉取仍是业务适配项，当前文档不展开接口细节。
- 组件级权限仍需补齐展示和控制策略，当前路由权限仍保留 `Route.meta.roles`。
- `Route.meta.roles` 是否改为 `permissions` 或 `auth`，等下游项目迁移稳定后再统一评估。
- 主题抽屉简化模式已按 v2 当前结构恢复：保留主题明暗和布局模式，隐藏颜色、半径、页面功能、通用设置、预设等高级配置。
- 表单验证规则与正则迁移仍需逐页核对，优先参考当前 v2 的 `useFormRules()` 数组式声明。

## 已移除的过时备忘

- 移除 `common.d.ts` 中手写 `Auth`、`Route` 的大段代码片段；当前真实落点是 `src/typings/api/auth.d.ts` 和 `src/typings/api/route.d.ts`。
- 移除 `naive-ui.d.ts` 中旧的 `ComponentsBasicsType` 字面量定义；当前真实落点是 `src/typings/naive-ui.d.ts`。
- 移除 `theme-drawer` 旧片段，尤其 `PageFun` 相关内容；当前已映射到 v2 拆分后的主题抽屉结构，不恢复旧组件。
- 移除 `use-table.ts resetFirstPage` 草稿；当前旧表格重置分页能力已落到 `packages/hooks/src/use-table-v1.ts`。
- 移除 `axios/request` 探索性备注；请求层兼容结论已收敛到桥接基座说明。

## 迁移原则

- 新代码优先使用上游 v2 API 和当前 v2 类型结构。
- 旧页面只通过 `table-v1` 过渡，兼容层只处理旧分页协议和旧页面适配，不继续扩大职责。
- 基座说明放在 `v2-bridge-baseline.md`，业务待办放在 `TODO.md`，本文件只记录 v1 到 v2 的迁移核对状态。
- 不在本项目文档中记录 ERP 合并细节；ERP 只作为后续消费当前基座的项目。
