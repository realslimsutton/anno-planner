import type { Router } from "@better-upload/server";
import { createFileRoute } from "@tanstack/react-router";
import { handleRequest, RejectUpload, route } from "@better-upload/server";

import { env } from "@/env";
import { getSession } from "@/server/auth";
import { client } from "@/server/upload";

const router: Router = {
  client,
  bucketName: env.CLOUDFLARE_UPLOADS_BUCKET_NAME,
  routes: {
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      onBeforeUpload: async ({ req }) => {
        const user = await getSession(req.headers);
        if (!user) {
          throw new RejectUpload("Unauthorized");
        }
      },
    }),
  },
};

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleRequest(request, router);
      },
    },
  },
});
