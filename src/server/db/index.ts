import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

const relations = defineRelations(schema, (r) => ({
  users: {
    role: r.one.roles({
      from: r.users.roleId,
      to: r.roles.id,
    }),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
  layouts: {
    author: r.one.users({
      from: r.layouts.authorId,
      to: r.users.id,
    }),
  },
  layoutLikes: {
    layout: r.one.layouts({
      from: r.layoutLikes.layoutId,
      to: r.layouts.id,
    }),
    user: r.one.users({
      from: r.layoutLikes.userId,
      to: r.users.id,
    }),
  },
}));

// eslint-disable-next-line no-restricted-properties
export const db = drizzle(process.env.DATABASE_URL!, { schema, relations });
