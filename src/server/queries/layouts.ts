import type { searchLayoutsSchema } from "@/lib/validation/layouts";
import type { z } from "zod";
import { queryOptions } from "@tanstack/react-query";

import {
  getFeaturedLayoutFn,
  getLayoutByHashFn,
  getLayoutEditorDataFn,
  getLayoutsFn,
  getPopularLayoutsFn,
  getRecentLayoutsFn,
  getRelatedLayoutsFn,
} from "../api/layouts";

export const layoutQueries = {
  getLayoutByHash: (hash: string) =>
    queryOptions({
      queryKey: ["layouts", "getLayoutByHash", hash],
      queryFn: () => getLayoutByHashFn({ data: { hash } }),
    }),
  getLayouts: (data: z.infer<typeof searchLayoutsSchema>) =>
    queryOptions({
      queryKey: ["layouts", "getLayouts", data],
      queryFn: () => getLayoutsFn({ data }),
    }),
  getFeaturedLayout: queryOptions({
    queryKey: ["layouts", "getFeaturedLayout"],
    queryFn: () => getFeaturedLayoutFn(),
  }),
  getPopularLayouts: queryOptions({
    queryKey: ["layouts", "getPopularLayouts"],
    queryFn: () => getPopularLayoutsFn(),
  }),
  getRecentLayouts: queryOptions({
    queryKey: ["layouts", "getRecentLayouts"],
    queryFn: () => getRecentLayoutsFn(),
  }),
  getRelatedLayouts: (hash: string) =>
    queryOptions({
      queryKey: ["layouts", "getRelatedLayouts", hash],
      queryFn: () => getRelatedLayoutsFn({ data: { hash } }),
    }),
  getLayoutEditorData: (hash: string) =>
    queryOptions({
      queryKey: ["layouts", "getLayoutEditorData", hash],
      queryFn: () => getLayoutEditorDataFn({ data: { hash } }),
    }),
};
