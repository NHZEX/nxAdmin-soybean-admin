import { computed, onMounted, ref } from 'vue';
import { fetchPermissionAll } from '@/service/api';

interface Options {
  enableMountedLoader: boolean;
}

type PermissionNode = Api.SystemManage.PermissionNode;
type PermissionTree = Api.SystemManage.PermissionTree;
type PermissionSet = Api.SystemManage.PermissionSet;

export function usePermissionTree(
  options: Options = {
    enableMountedLoader: false
  }
) {
  const loading = ref(false);
  const permissionData = ref<PermissionTree>([]);
  const permissionNodes = computed(() => {
    const resultNodes = new Map<string, PermissionNode>();
    const r = (nodes: PermissionTree) => {
      for (const node of nodes) {
        resultNodes.set(node.name, node);
        if (Array.isArray(node.children)) {
          r(node.children);
        }
      }
    };
    r(permissionData.value);
    return resultNodes;
  });

  const loadData = async () => {
    loading.value = true;
    const { data, error } = await fetchPermissionAll();
    loading.value = false;
    if (error) {
      return;
    }
    permissionData.value = data ?? [];
  };

  if (options.enableMountedLoader) {
    onMounted(async () => {
      await loadData();
    });
  }

  const filterParentNodes = (data: PermissionSet) => {
    return data.filter(node => {
      const permission = permissionNodes.value.get(node);
      if (!permission) {
        return false;
      }
      return (permission.children?.length ?? 0) > 0;
    });
  };

  const filterLeafNodes = (data: PermissionSet) => {
    return data.filter(node => {
      const permission = permissionNodes.value.get(node);
      if (!permission) {
        return false;
      }
      return (permission.children?.length ?? 0) === 0;
    });
  };

  return {
    // data
    loading,
    treeData: permissionData,
    nodes: permissionNodes,
    // func
    reload: loadData,
    filterParentNodes,
    filterLeafNodes
  };
}
