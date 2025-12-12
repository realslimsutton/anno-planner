import type { Rotation } from "@/types/editor";
import {
  bigint,
  bigserial,
  index,
  jsonb,
  pgEnum,
  pgTableCreator,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `anno-planner_${name}`);

export const regionEnum = pgEnum("region", ["3225", "6626"]);

export type DatabaseBuilding = {
  id: string;
  buildingId: number;
  x: number;
  y: number;
  rotation: Rotation;
  color: number;
};

export type DatabaseRoadNode = {
  id: string;
  x: number;
  y: number;
};

export type DatabaseRoadEdge = {
  id: string;
  startNodeId: string;
  endNodeId: string;
  roadType: "dirt" | "stone" | "marble";
  centerLine: { x: number; y: number }[];
};

export type LayoutData = {
  buildings: DatabaseBuilding[];
  roads: DatabaseRoadNode[];
  roadEdges?: DatabaseRoadEdge[];
};

export const layouts = createTable(
  "layouts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hash: text("hash").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    region: regionEnum("region").notNull(),
    authorId: bigint("author_id", { mode: "number" }),
    data: jsonb("data").$type<LayoutData>(),
    image: text("image"),
    publishedAt: timestamp("published_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("layouts_hash_unique").on(table.hash),
    index("layouts_title_idx").on(table.title),
    index("layouts_author_id_idx").on(table.authorId),
    index("layouts_category_idx").on(table.category),
    index("layouts_region_idx").on(table.region),
    index("layouts_published_at_idx").on(table.publishedAt),
    index("layouts_deleted_at_idx").on(table.deletedAt),
    index("layouts_updated_at_idx").on(table.updatedAt),
  ],
);

export const layoutLikes = createTable(
  "layout_likes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    layoutId: bigint("layout_id", { mode: "number" }),
    userId: bigint("user_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("layout_likes_layout_id_user_id_unique").on(
      table.layoutId,
      table.userId,
    ),
    index("layout_likes_layout_id_idx").on(table.layoutId),
  ],
);
