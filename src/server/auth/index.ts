import { cache } from "react";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "@/env";
import { db } from "../db";
import {
  accounts,
  rateLimits,
  sessions,
  users,
  verifications,
} from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  user: {
    additionalFields: {
      roleId: {
        type: "number",
        required: false,
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    customSession(
      async ({ user, session }) => {
        const role = user.roleId
          ? await db.query.roles.findFirst({
              where: {
                id: user.roleId,
              },
            })
          : undefined;

        return {
          user: {
            ...user,
            role,
          },
          session,
        };
      },
      {
        user: {
          additionalFields: {
            roleId: {
              type: "number",
              required: false,
              input: false,
            },
            deletedAt: {
              type: "date",
              required: false,
              input: false,
            },
          },
        },
      },
    ),
  ],
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  rateLimit: {
    storage: "database",
    modelName: "rateLimit",
  },
  advanced: {
    cookiePrefix: "anno-planner",
    database: {
      useNumberId: true,
    },
  },
  telemetry: {
    enabled: false,
  },
});

export const getSession = cache(async (headers: Headers) => {
  return await auth.api.getSession({
    headers,
  });
});
