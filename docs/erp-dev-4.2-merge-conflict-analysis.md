# ERP 合入 nxAdmin dev/4.2 冲突分析与演练报告

归档日期：2026-10-16。原始记录未注明演练日期。

本文保留针对下列固定提交的历史演练结果。分支指向、未提交改动、验证结果和 worktree 状态均为演练时快照，本次归档未重新执行 ERP 合并或验证。实际合入前需重新核对目标提交、工作区状态和验证结果。

## 1. 结论摘要

- 演练时 ERP 分支：`dev/main-v2@464e3c734c31296805c640e02549c23ec9aa6a7d`。
- 演练基线：`upstream/dev/4.1@05cef5344a26b9953f6a1c50c74842f5471a37c4`。
- 目标版本：`upstream/dev/4.2@9d2910e4c161337aeb3d0f66edde3b1721a958fd`。
- 已在独立 worktree `erp-s619-web-dev42-rehearsal`、分支 `codex/erp-dev-4.2-rehearsal` 完成无提交模拟合并。
- Git 实际产生 12 个内容冲突；上游另外删除或迁移 12 个旧文件，需要确认下游不再引用。
- 冲突解决后生产构建通过，lockfile 可由 pnpm 10.34.1 自动重建并通过 frozen-lockfile 校验。
- ERP 原工作区未被修改：演练前后 HEAD 相同，`git status --porcelain` 逐行相同。
- 结论：**4.2 可以平滑合入，但不能采用简单 ours/theirs；应保留 v1 表格兼容层、ERP 请求错误处理和业务依赖，并接受 4.2 的布局、主题、Tab 与类型拆分。**

## 2. 分支与变更规模

```text
共同祖先 05cef534 (upstream/dev/4.1)
├─ ERP dev/main-v2: 2455 commits -> 464e3c73
└─ nxAdmin dev/4.2:   93 commits -> 9d2910e4
```

- `4.1 -> 4.2`：113 个路径发生变化，约 5752 行新增、3153 行删除。
- `4.1 -> ERP HEAD`：2704 个路径发生变化，其中 `src` 1787 个、`packages` 300 个。
- 两侧同路径修改：22 个文件。
- 最终演练合并结果：112 个文件变化，6194 行新增、2842 行删除。
- 演练时 ERP 有 55 个未提交路径，其中只有 `src/typings/components.d.ts` 与上游直接冲突；该文件应通过构建重新生成，不能手工选边。

## 3. 实际内容冲突

| 文件 | 风险 | ERP 意图 | 4.2 变化 | 演练解法 |
| --- | --- | --- | --- | --- |
| `.gitignore` | 低 | 忽略 ERP 文档归档、临时文件和大体积设计资产 | 增加 `.waylog` | 取并集 |
| `package.json` | 高 | 大量 ERP 业务依赖、Vitest、归档脚本、pnpm 10.34.1 | 框架与构建依赖升级至 v2.0.2 组合 | 保留 ERP 依赖，框架包采用 4.2 版本，`@vueuse/components/core` 同步为 14.1.0 |
| `packages/hooks/src/use-table.ts` | 高 | ERP 在旧 hook 中增加 debounce 和 AbortSignal | 4.2 将该文件重构为全新 v2 表格 API | 文件采用 4.2；ERP 增强由新增 `use-table-v1.ts` 承接 |
| `pnpm-lock.yaml` | 高 | 记录 13 个 workspace 项目和业务依赖 | 大规模依赖升级、移除 ofetch | 不手工拼接；解决 manifests 后由 pnpm 10.34.1 重建 |
| `src/service/request/index.ts` | 高 | 错误 payload 规范化、标准错误通知、ERP 后端契约 | 新 `transform`、`extractLevel`、`getAuthorization` 和请求类型 | 组合双方能力；保留 ERP normalize，采用 4.2 transform；401 清理保持单路径语义 |
| `src/service/request/shared.ts` | 高 | `silentErrorNotify`、错误消息提取、Blob 错误、文件下载 | `getAuthorization`、请求状态/配置传递调整 | 保留 ERP 能力并加入 4.2 authorization；refresh token 缺失时执行 remove，不写入字符串 `null` |
| `src/store/modules/tab/index.ts` | 中 | ERP 将 refresh 纳入旧缓存重置策略 | 4.2 删除策略字段并统一清理缓存，同时增加固定标签页 | 接受 4.2 行为，移除 `resetCacheStrategy` 依赖 |
| `src/theme/settings.ts` | 中 | 蓝色主色和 refresh 策略 | 增加圆角、标签中键关闭、菜单自动选择、水印时间等字段 | 保留 `#3b82f6`，接收新字段，删除废弃策略和 override |
| `src/typings/api/common.d.ts` | 高 | 分页 scene/nextToken、可选 records、CommonRecordV2、进度类型 | 将旧 `api.d.ts` 拆分并收紧公共类型 | 接受拆分结构，保留 ERP 扩展；`records` 保持可选并在消费者处默认 `[]` |
| `src/typings/components.d.ts` | 中 | 276 个 ERP 业务/图标组件声明 | 4.2 增加 TSX global declarations | 由 Vite 实际扫描重新生成，得到 569 行声明；不复制旧生成文件 |
| `src/typings/naive-ui.d.ts` | 高 | v1/v2 表格业务类型与分页辅助类型 | 组件类型改为从 Naive UI 派生，列 key 放宽 | 组合双方类型；列 key 限定为 string/number，排除 symbol |
| `src/views/home/index.vue` | 低 | 隐藏上游分支提示 | warning 文案改为 tip | 继续隐藏，采用新 i18n key |

## 4. 删除与迁移决策点

上游删除或迁移了 12 个旧文件。演练后全仓扫描未发现旧引用，均接受上游删除/迁移：

```text
packages/hooks/src/use-signal.ts
packages/ofetch/package.json
packages/ofetch/src/index.ts
packages/ofetch/tsconfig.json
src/layouts/context/index.ts
src/layouts/modules/global-menu/modules/horizontal-mix-menu.vue
src/layouts/modules/global-menu/modules/reversed-horizontal-mix-menu.vue
src/layouts/modules/theme-drawer/modules/dark-mode.vue
src/layouts/modules/theme-drawer/modules/layout-mode.vue
src/layouts/modules/theme-drawer/modules/page-fun.vue
src/layouts/modules/theme-drawer/modules/theme-color.vue
src/typings/api.d.ts
```

替代关系：

- 布局 context 移至 `src/layouts/modules/global-menu/context`。
- 混合菜单拆分为 `top-hybrid-*` 与 `vertical-hybrid-header-first`。
- 主题抽屉拆分为 appearance/layout/general/preset 模块。
- API 类型拆分为 `api/common.d.ts`、`api/auth.d.ts`、`api/route.d.ts`。
- 旧表格能力移至 `packages/hooks/src/use-table-v1.ts` 和 `src/hooks/common/table-v1.ts`。

## 5. 兼容提交 9d2910e4 的价值

ERP 仓库原先的 `upstream/dev/4.2` 只到 `4327ef57`。演练前已刷新到 `9d2910e4`，后者增加四项下游兼容：

1. 导出 `useHookTableV1 as useHookTable`，ERP 现有导入无需批量修改。
2. 将 `TableColumnCheck.visible` 改为可选，减少旧列配置类型错误。
3. 登录时清除 refresh token，而不是保存字面量字符串 `null`。
4. 清理请求层不可达的 401/refresh token 旧代码。

该提交不减少 Git 的 12 个文本冲突，但显著降低冲突解决后的业务迁移量。演练时 ERP 约 28 个页面依赖旧 `useTableOperate` 能力，演练方案未批量迁移到 v2 API。

## 6. pnpm lockfile 处理结论

执行顺序：

```powershell
pnpm install --lockfile-only --no-frozen-lockfile
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
```

结果：

- pnpm 10.34.1 成功根据最终 manifests 重建 `pnpm-lock.yaml`。
- frozen-lockfile 复验通过。
- 不需要也不建议手工解决 lockfile 内部冲突。
- 安装期出现两类依赖告警：`jsdom` 期望 canvas 3、旧 `@typescript-eslint` peer 范围未覆盖 TS 5.9.3。
- worktree 中 `.git` 是文件，`simple-git-hooks` 尝试创建 `.git/hooks` 会记录 ENOTDIR，但安装退出码为 0；正式主工作区不会有此 worktree 特有问题。

## 7. 验证结果

### 7.1 标准合并结果

| 验证 | 结果 | 说明 |
| --- | --- | --- |
| `git diff --check` | 通过 | 无空白错误 |
| 冲突标记扫描 | 通过 | 无 `<<<<<<<` 等残留 |
| 旧引用扫描 | 通过 | 删除文件/API 引用数量为 0 |
| `pnpm install --frozen-lockfile` | 通过 | lockfile 可复现 |
| `pnpm build` | 通过 | 生产构建成功，两次重复验证通过 |
| 请求/系统管理定向测试 | 通过 | 4 文件、29 个测试全部通过 |
| `pnpm test` | 部分通过 | 336/340 个文件通过，2746/2750 个测试通过 |
| `pnpm typecheck` | 未通过 | 186 条错误；ERP 保存的基线日志已有 194 条 |
| `pnpm lint-diff` | 未通过 | 3 个 error，均来自上游 axios/hooks 的 no-shadow 规则；另有 4 个 warning |

全量测试失败项：

- `production-flow-qrcode-print.test.ts` 两项断言未包含新增 `flowShortNo` 字段。
- `gallery-task-designer-workbench-page.test.ts` 仍断言已重构前的 CSS 文本。
- `style-size-measurement-drawer.test.ts` 仍断言已重构前的源码片段。
- `styles-assistant-pattern-paint-detail.test.ts` 因 `pica-gpu@0.2.0` 的 ESM import 缺少可解析的 `dist/resize` 入口而无法加载。

这些失败与 4.2 冲突文件无直接交集，第二轮叠加演练时未提交功能后失败集合保持不变。

### 7.2 Typecheck 差分

- ERP 原 `.tmp-typecheck.log`：194 条错误，按“文件 + TS 错误码 + 首行消息”归一后 144 个签名。
- 标准合并：186 条错误，归一后 141 个签名。
- 对比得到 20 个新签名、23 个旧签名消失。
- 新签名主要集中在：axios `FlatResponseData` 泛型顺序/必填 response、旧 table2 页面推断、可选 `records`、少量业务模型漂移。
- 这表明 4.2 没有让全仓类型错误数量恶化，但仍需单独安排“请求泛型 + table2 页面”类型治理，不能把全量 typecheck 作为本次合并唯一闸门。

## 8. 演练时未提交前端功能叠加验证

叠加内容：

- 7 个已跟踪路由、locale、API 导出和 Elegant Router 类型文件。
- 18 个未跟踪 ETS-DXF conversion 源码/测试文件。
- 未复制 `components.d.ts`，由构建重新生成。

结果：

- `pnpm build`：通过。
- ETS-DXF + 请求层定向测试：5 个文件、33 个测试全部通过。
- 全量测试：340/344 个文件通过，2762/2766 个测试通过；失败集合与标准合并相同。
- typecheck：200 条错误，比标准合并多 14 条，新增项主要是未提交测试 mock 缺少 axios `response` 字段，以及 Naive UI drawer slot 类型。
- 验证结束后叠加层已完整撤销，演练 worktree 保持纯 4.2 合并方案。

## 9. 当时的正式合入建议

以下建议针对上述固定提交；重新合入时应先复核与演练快照的差异。

1. 先把 ERP 待合入时的未提交改动形成可恢复提交或完整 stash，包括 untracked 文件。
2. 确认待合入目标为本次演练的 `9d2910e4`；若分支已变化，应重新评估差异，旧的 `4327ef57` 缺少本报告所述兼容提交。
3. 复用演练分支中的冲突解法，避免重新人工选边。
4. manifests 解决后删除 lockfile 冲突状态并由 pnpm 10.34.1 重建，不手工拼 YAML。
5. 构建生成 `components.d.ts`；模板中的图标组件使用 PascalCase，避免带冒号组件名生成非法 TSX global 声明。
6. 合入闸门建议采用：生产构建通过、关键路径测试通过、无新增高风险 typecheck 签名。
7. 全仓历史 typecheck、4 个失败测试文件（含陈旧断言和 `pica-gpu` ESM 加载问题）、上游 lint no-shadow 应建立独立治理任务，不与合并冲突处理混在同一提交。

## 10. 演练结束时的现场快照

以下目录名用于辨识历史工作区，绝对路径依本机环境而定；快照不保证这些目录、分支或暂存状态仍然存在。

```text
ERP 原仓库:
erp-s619-web

演练 worktree:
erp-s619-web-dev42-rehearsal

演练分支:
codex/erp-dev-4.2-rehearsal

演练结束时状态:
- HEAD 仍为 464e3c73
- MERGE_HEAD 为 9d2910e4
- 冲突全部解决并已暂存
- 未创建 merge commit
- 未推送远端
```
