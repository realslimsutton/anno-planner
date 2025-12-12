import { z } from "zod";

import { ALL_LAYOUT_CATEGORY_VALUES } from "@/server/db/layout-categories";
import { REGION_IDS } from "../constants";
import { nullableString } from "./utils";

export const createLayoutSchema = z.object({
  title: z.string().max(255).trim(),
  description: nullableString(z.string().max(500)),
  category: z.enum(ALL_LAYOUT_CATEGORY_VALUES),
  region: z.enum(REGION_IDS),
});

const rotationSchema = z.union([
  z.literal(0),
  z.literal(45),
  z.literal(90),
  z.literal(135),
]);

const roadTypeSchema = z.enum(["dirt", "stone", "marble"]);

export const updateLayoutSchema = createLayoutSchema.extend({
  hash: z.string(),
  data: z.object({
    buildings: z.array(
      z.object({
        id: z.string(),
        buildingId: z.number(),
        x: z.number(),
        y: z.number(),
        rotation: rotationSchema,
        color: z.number(),
      }),
    ),
    roads: z.array(
      z.object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
      }),
    ),
    roadEdges: z
      .array(
        z.object({
          id: z.string(),
          startNodeId: z.string(),
          endNodeId: z.string(),
          roadType: roadTypeSchema,
          centerLine: z.array(
            z.object({
              x: z.number(),
              y: z.number(),
            }),
          ),
        }),
      )
      .optional(),
  }),
});

export const searchLayoutsSchema = z.object({
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
  search: z.string().trim().nullable().optional(),
  categories: z
    .array(z.enum(ALL_LAYOUT_CATEGORY_VALUES))
    .optional()
    .default([]),
  regions: z.array(z.enum(REGION_IDS)).optional().default([]),
  sortBy: z.enum(["recent", "popular"]).optional().default("recent"),
});
