export type PermissionData = {
  id: string;
  name: string;
  description: string;
};

export const ALL_PERMISSIONS: PermissionData[] = [];

export const ALL_PERMISSION_VALUES = ALL_PERMISSIONS.map(
  (permission) => permission.id,
);

export type Permission = (typeof ALL_PERMISSION_VALUES)[number];
