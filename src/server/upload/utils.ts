import { putObject } from "@better-upload/server/helpers";

import { env } from "@/env";
import { client } from ".";

export async function uploadScreenshot(
  buffer: Buffer,
  hash: string,
): Promise<string> {
  const key = `screenshots/${hash}.webp`;

  await putObject(client, {
    bucket: env.CLOUDFLARE_UPLOADS_BUCKET_NAME,
    key,
    body: new Uint8Array(buffer),
    contentType: "image/webp",
  });

  return `${env.UPLOADS_URL}/${key}`;
}
