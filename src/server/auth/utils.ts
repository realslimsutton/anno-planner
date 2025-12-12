import type { getSession } from ".";
import type { Permission } from "../db/permissions";

export function userHasPermission(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"],
  permission: Permission,
) {
  return user.role?.permissions?.includes(permission) ?? false;
}

export function userHasAllPermissions(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"],
  permissions: Permission[],
) {
  return permissions.every((permission) => userHasPermission(user, permission));
}

export function userHasAnyPermission(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"],
  permissions: Permission[],
) {
  return permissions.some((permission) => userHasPermission(user, permission));
}
