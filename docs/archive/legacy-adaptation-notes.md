# 历史适配计划与备忘

归档日期：2026-10-16。

本记录来自早期适配阶段，已搁置，仅供追溯。以下勾选状态保留原始记录，未经当前分支复核，不代表当前待办或功能完成情况。

## 历史适配计划

- 系统
  - [x] 用户登录
  - [ ] 机器码支持
  - [ ] 验证码支持
  - [ ] 云配置拉取

- 权限控制
  - [x] 权限管理适配
  - [x] 路由访问适配
  - [ ] 组件访问适配

- 框架请求封装
  - [x] 协议逻辑适配
  - [ ] 协议支持代码优化

- 系统管理
  - 系统用户管理
    - [x] 基本管理功能移植
  - 系统角色管理
    - [x] 基本管理功能移植
    - [ ] 页面优化（参考 menu-operate-modal.vue）
  - 系统权限管理
  - 系统信息查看
  - 关于页面优化

## 历史后端问题备注

- `/auth/login` 比现有的 `/v2/login` 似乎更好

## 备忘录

### 路由权限字段命名

当时考虑将 `Route.meta.roles` 更名为 `Route.meta.permissions` 或 `Route.meta.auth`，暂时保留 `roles`。

### 类型检查与提交钩子

早期移植曾因大量不兼容更改而暂时禁用类型检查。旧记录中的 `lint-staged` 恢复命令已不适用于当前脚本，予以移除。

当前可执行 `pnpm typecheck` 检查类型；提交钩子以根目录 `package.json` 的 `simple-git-hooks` 配置为准。

### 请求重试

历史记录曾提示自动重试可能误判后端的 500 code，具体条件与当前实现需另行核实。

### 表单验证与正则需要重新适配

当时尚未确定表单验证与正则的适配方案。

### 验证器规则响应方案

[Lazy validation trigger · Issue #2249 · tusen-ai/naive-ui](https://github.com/tusen-ai/naive-ui/issues/2249)

当时计划将 `useFormRules()` 的预置规则迁移为数组声明。

> 看提交记录有一定参考价值 [Rascal-Coder/soybean-admin](https://github.com/Rascal-Coder/soybean-admin)
