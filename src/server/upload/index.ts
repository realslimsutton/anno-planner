import { cloudflare } from "@better-upload/server/clients";

import { env } from "@/env";

export const client = cloudflare({
  accountId: env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
});
