import { computed, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';
import { useTabStore } from '@/store/modules/tab';
import { useRouteStore } from '@/store/modules/route';

export function useTab() {
  const vm = getCurrentInstance();
  const tabStore = useTabStore();
  const route = useRoute();
  const routeStore = useRouteStore();

  function queryCurrentTabId(): string | null {
    let inst = vm;
    console.log(vm);
    let tabId = null;
    let level = 0;
    while (inst && !tabId && level < 99) {
      console.debug({
        name: inst.type.name,
        id: inst.attrs?.id,
        attrs: { ...inst.attrs },
        level
      });
      if (Object.hasOwn(inst.attrs, '.:_tabId')) {
        tabId = inst.attrs['.:_tabId'] as string;
      }
      inst = inst.parent;
      level++;
    }
    return tabId;
  }

  const tabId = computed<string>(() => {
    const currentTabId = queryCurrentTabId();
    if (!currentTabId) {
      console.warn('未找到当前标签页的tabId', getCurrentInstance()?.type?.name);
    }
    return currentTabId ?? tabStore.getTabIdByRoute(route);
  });

  function getTabId(): string {
    return tabId.value;
  }

  function getTab(): App.Global.Tab | undefined {
    return tabStore.tabs.find(val => val.id === tabId.value);
  }

  function setTabLabel(label: string) {
    console.debug('setTabLabel', label, getTabId());
    tabStore.setTabLabel(label, getTabId());
  }

  async function closeTab() {
    const tab = getTab();
    if (tab) {
      await tabStore.removeTab(tab.id);
      await routeStore.resetRouteCache(tab.routeKey);
    }
  }

  return {
    getTab,
    getTabId,
    setTabLabel,
    closeTab
  };
}
