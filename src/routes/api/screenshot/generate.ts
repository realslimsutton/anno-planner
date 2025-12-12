import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { db } from "@/server/db";
import { layouts } from "@/server/db/schema";
import { captureLayoutScreenshot } from "@/server/upload/screenshot";
import { uploadScreenshot } from "@/server/upload/utils";

const requestSchema = z.object({
  hash: z.string(),
  title: z.string(),
});

export const Route = createFileRoute("/api/screenshot/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("X-Screenshot-Secret");
        if (secret !== env.SCREENSHOT_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const body = (await request.json()) as Record<string, unknown>;
          const { hash, title } = requestSchema.parse(body);

          const imageBuffer = await captureLayoutScreenshot(hash, title);
          const imageUrl = await uploadScreenshot(imageBuffer, hash);

          await db
            .update(layouts)
            .set({ image: imageUrl })
            .where(eq(layouts.hash, hash));

          return Response.json({ success: true, imageUrl });
        } catch (error) {
          console.error("Screenshot generation failed:", error);
          return new Response("Screenshot generation failed", { status: 500 });
        }
      },
    },
  },
});
