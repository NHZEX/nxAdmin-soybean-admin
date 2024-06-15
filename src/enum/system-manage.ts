export enum SystemUserLegacyStatus {
  NORMAL = 0,
  DISABLE = 1
}

export const SystemUserLegacyStatusLabel = new Map<number, string>([
  [SystemUserLegacyStatus.NORMAL, '激活'],
  [SystemUserLegacyStatus.DISABLE, '禁用']
]);

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
