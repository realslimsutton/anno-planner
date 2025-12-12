import { queryOptions } from "@tanstack/react-query";

import { getCurrentUserFn } from "../api/auth";

export const userQueries = {
  getCurrentUser: queryOptions({
    queryKey: ["auth", "currentUser"],
    queryFn: getCurrentUserFn,
  }),
};
