import type { App } from 'vue';
import {
  VxeButton,
  VxeButtonGroup,
  VxeDrawer,
  VxeForm,
  VxeFormGroup,
  VxeFormItem,
  VxeIcon,
  VxeLoading,
  VxeModal,
  VxePager,
  VxePrint,
  VxeTooltip,
  VxeUI,
  VxeUpload
} from 'vxe-pc-ui';
import { VxeColgroup, VxeColumn, VxeGrid, VxeTable, VxeToolbar } from 'vxe-table';
// 导入主题变量，也可以重写主题变量
import 'vxe-table/styles/cssvar.scss';
import 'vxe-pc-ui/styles/cssvar.scss';
// 导入默认的语言
import zhCN from 'vxe-table/lib/locale/lang/zh-CN';

VxeUI.setI18n('zh-CN', zhCN);
VxeUI.setLanguage('zh-CN');

function lazyVxeUI(app: App) {
  app.use(VxeButton);
  app.use(VxeButtonGroup);
  app.use(VxeDrawer);
  app.use(VxeForm);
  app.use(VxeFormGroup);
  app.use(VxeFormItem);
  app.use(VxeIcon);
  app.use(VxeLoading);
  app.use(VxeModal);
  app.use(VxePager);
  app.use(VxePrint);
  app.use(VxeTooltip);
  app.use(VxeUpload);
}

function lazyVxeTable(app: App) {
  app.use(VxeTable);
  app.use(VxeColumn);
  app.use(VxeColgroup);
  app.use(VxeGrid);
  app.use(VxeToolbar);
}

export function setupVxeTable(app: App) {
  app.use(lazyVxeUI);
  app.use(lazyVxeTable);
}
