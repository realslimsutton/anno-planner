import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTableCreator,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { Permission } from "../permissions";

const createTable = pgTableCreator((name) => `anno-planner_${name}`);

export const roles = createTable(
  "auth_roles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    permissions: jsonb("permissions").$type<Permission[]>(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("roles_name_idx").on(table.name),
    index("roles_created_at_idx").on(table.createdAt),
    index("roles_updated_at_idx").on(table.updatedAt),
  ],
);

export const users = createTable(
  "auth_users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    roleId: bigint("role_id", { mode: "number" }),
    image: text("image"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("users_name_idx").on(table.name),
    index("users_email_idx").on(table.email),
    index("users_role_id_idx").on(table.roleId),
    index("users_email_verified_idx").on(table.emailVerified),
    index("users_deleted_at_idx").on(table.deletedAt),
    index("users_created_at_idx").on(table.createdAt),
    index("users_updated_at_idx").on(table.updatedAt),
  ],
);

export const sessions = createTable(
  "auth_sessions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_idx").on(table.token),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const accounts = createTable(
  "auth_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    index("accounts_account_id_idx").on(table.accountId),
    index("accounts_provider_id_idx").on(table.providerId),
    index("accounts_provider_user_idx").on(table.providerId, table.userId),
  ],
);

export const verifications = createTable(
  "auth_verifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
    index("verifications_expires_at_idx").on(table.expiresAt),
  ],
);

export const rateLimits = createTable(
  "auth_rate_limit",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: text("key").notNull().unique(),
    count: integer("count").default(0).notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rate_limits_key_idx").on(table.key),
    index("rate_limits_last_request_idx").on(table.lastRequest),
  ],
);
