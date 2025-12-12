import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getSession } from "../auth";

export const getCurrentUserFn = createServerFn().handler(async () => {
  const session = await getSession(getRequestHeaders());
  return session?.user ?? null;
});
