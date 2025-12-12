import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getSession } from ".";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getSession(getRequestHeaders());
  if (!session) {
    throw redirect({ to: "/auth/login" });
  }
  return next({ context: { auth: session.user } });
});
