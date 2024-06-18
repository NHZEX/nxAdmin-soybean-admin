export enum CommonLegacyStatus {
  NORMAL = 0,
  DISABLE = 1
}

export const CommonLegacyStatusLabel = new Map<number, string>([
  [CommonLegacyStatus.NORMAL, '激活'],
  [CommonLegacyStatus.DISABLE, '禁用']
]);

export function toTabTypeByCommonLegacyStatus(
  key: number,
  defValue: NaiveUI.ComponentsBasicsType = 'default'
): NaiveUI.ComponentsBasicsType | undefined {
  switch (key) {
    case CommonLegacyStatus.NORMAL:
      return 'info';
    case CommonLegacyStatus.DISABLE:
      return 'warning';
    default:
      return defValue;
  }
}

export const SystemUserLegacyStatusLabel = CommonLegacyStatusLabel;

export enum SystemUserType {
  SUPER_ADMIN = 1,
  USER_ADMIN = 2,
  OPERATOR = 5
}

export const SystemUserTypeLabel = new Map<number, string>([
  [SystemUserType.SUPER_ADMIN, '超级管理员'],
  [SystemUserType.USER_ADMIN, '系统管理员'],
  [SystemUserType.OPERATOR, '普通用户']
]);
