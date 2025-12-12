import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { env } from "@/env";
import {
  createLayoutSchema,
  searchLayoutsSchema,
  updateLayoutSchema,
} from "@/lib/validation/layouts";
import { getSession } from "../auth";
import { authMiddleware } from "../auth/middleware";
import { db } from "../db";
import { layoutLikes, layouts, users } from "../db/schema";

export const createLayoutFn = createServerFn()
  .inputValidator(createLayoutSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const hash = nanoid();

    const id = await db
      .insert(layouts)
      .values({
        ...data,
        hash: hash,
        authorId: Number(context.auth.id),
      })
      .returning({ id: layouts.id })
      .then((rows) => rows[0]?.id);

    if (id) {
      await db.insert(layoutLikes).values({
        layoutId: id,
        userId: Number(context.auth.id),
      });
    }

    return { hash };
  });

export const updateLayoutFn = createServerFn()
  .inputValidator(updateLayoutSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(layouts)
      .set({
        title: data.title,
        description: data.description,
        category: data.category,
        region: data.region,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(layouts.hash, data.hash),
          eq(layouts.authorId, Number(context.auth.id)),
        ),
      );
  });

export const getLayoutByHashFn = createServerFn()
  .inputValidator(z.object({ hash: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSession(getRequestHeaders());
    const userId = session?.user.id ? Number(session.user.id) : null;

    const likesAgg = db
      .select({
        layoutId: layoutLikes.layoutId,
        likeCount: count(layoutLikes.id).as("like_count"),
      })
      .from(layoutLikes)
      .groupBy(layoutLikes.layoutId)
      .as("likes_agg");

    const layout = await db
      .select({
        hash: layouts.hash,
        title: layouts.title,
        description: layouts.description,
        category: layouts.category,
        region: layouts.region,
        image: layouts.image,
        authorId: layouts.authorId,
        authorName: users.name,
        authorImage: users.image,
        publishedAt: layouts.publishedAt,
        updatedAt: layouts.updatedAt,
        likesCount: sql<number>`COALESCE(${likesAgg.likeCount}, 0)`,
        isLiked:
          userId !== null
            ? sql<boolean>`EXISTS (
            SELECT 1
            FROM ${layoutLikes}
            WHERE ${layoutLikes.layoutId} = ${layouts.id}
              AND ${layoutLikes.userId} = ${userId}
          )`
            : sql<boolean>`false`,
        authorLayoutCount: db.$count(
          db.select().from(layouts).where(eq(layouts.authorId, users.id)),
        ),
      })
      .from(layouts)
      .leftJoin(likesAgg, eq(likesAgg.layoutId, layouts.id))
      .leftJoin(users, eq(layouts.authorId, users.id))
      .where(
        and(
          isNull(layouts.deletedAt),
          eq(layouts.hash, data.hash),
          or(
            and(
              lte(layouts.publishedAt, sql`NOW()`),
              isNotNull(layouts.publishedAt),
            ),
            userId !== null ? eq(layouts.authorId, userId) : undefined,
          ),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return { layout };
  });

export const getLayoutsFn = createServerFn()
  .inputValidator(searchLayoutsSchema)
  .handler(async ({ data }) => {
    const { page, perPage, search, categories, regions, sortBy } = data;

    const filters = and(
      isNull(layouts.deletedAt),
      and(isNotNull(layouts.publishedAt), lte(layouts.publishedAt, sql`NOW()`)),
      search && search.length > 0
        ? ilike(layouts.title, `%${search}%`)
        : undefined,
      categories.length > 0 ? inArray(layouts.category, categories) : undefined,
      regions.length > 0 ? inArray(layouts.region, regions) : undefined,
    );

    const rowsQuery = db
      .select({
        hash: layouts.hash,
        title: layouts.title,
        category: layouts.category,
        region: layouts.region,
        image: layouts.image,
        authorId: layouts.authorId,
        authorName: users.name,
        updatedAt: layouts.updatedAt,
        likesCount: count(layoutLikes.id),
      })
      .from(layouts)
      .leftJoin(layoutLikes, eq(layouts.id, layoutLikes.layoutId))
      .leftJoin(users, eq(layouts.authorId, users.id))
      .where(filters)
      .limit(perPage)
      .offset((page - 1) * perPage)
      .orderBy(
        sortBy === "recent"
          ? desc(layouts.updatedAt)
          : desc(count(layoutLikes.id)),
      )
      .groupBy(
        layouts.hash,
        layouts.title,
        layouts.category,
        layouts.region,
        layouts.image,
        layouts.authorId,
        users.name,
        layouts.updatedAt,
      );

    const rowCountQuery = db.$count(
      db
        .select({
          1: sql<number>`1`,
        })
        .from(layouts)
        .where(filters),
    );

    const [rows, rowCount] = await Promise.all([rowsQuery, rowCountQuery]);

    return { rows, pageCount: Math.ceil(rowCount / perPage) };
  });

export const getFeaturedLayoutFn = createServerFn().handler(async () => {
  const layout = await db
    .select({
      hash: layouts.hash,
      title: layouts.title,
      category: layouts.category,
      region: layouts.region,
      image: layouts.image,
      authorId: layouts.authorId,
      authorName: users.name,
      updatedAt: layouts.updatedAt,
      likesCount: count(layoutLikes.id),
    })
    .from(layouts)
    .leftJoin(layoutLikes, eq(layouts.id, layoutLikes.layoutId))
    .leftJoin(users, eq(layouts.authorId, users.id))
    .where(
      and(
        isNull(layouts.deletedAt),
        and(
          isNotNull(layouts.publishedAt),
          lte(layouts.publishedAt, sql`NOW()`),
        ),
        gte(layoutLikes.createdAt, sql`NOW() - INTERVAL '1 week'`),
      ),
    )
    .orderBy(desc(count(layoutLikes.id)), desc(layouts.updatedAt))
    .groupBy(
      layouts.hash,
      layouts.title,
      layouts.category,
      layouts.region,
      layouts.image,
      layouts.authorId,
      users.name,
      layouts.updatedAt,
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return { layout };
});

export const getPopularLayoutsFn = createServerFn().handler(async () => {
  const rows = await db
    .select({
      hash: layouts.hash,
      title: layouts.title,
      category: layouts.category,
      region: layouts.region,
      image: layouts.image,
      authorId: layouts.authorId,
      authorName: users.name,
      publishedAt: layouts.publishedAt,
      likesCount: count(layoutLikes.id),
    })
    .from(layouts)
    .leftJoin(layoutLikes, eq(layouts.id, layoutLikes.layoutId))
    .leftJoin(users, eq(layouts.authorId, users.id))
    .where(
      and(
        isNull(layouts.deletedAt),
        and(
          isNotNull(layouts.publishedAt),
          lte(layouts.publishedAt, sql`NOW()`),
        ),
      ),
    )
    .orderBy(desc(count(layoutLikes.id)))
    .groupBy(
      layouts.hash,
      layouts.title,
      layouts.category,
      layouts.region,
      layouts.image,
      layouts.authorId,
      users.name,
      layouts.publishedAt,
    )
    .limit(4);

  return { rows };
});

export const getRecentLayoutsFn = createServerFn().handler(async () => {
  const rows = await db
    .select({
      hash: layouts.hash,
      title: layouts.title,
      category: layouts.category,
      region: layouts.region,
      image: layouts.image,
      authorId: layouts.authorId,
      authorName: users.name,
      publishedAt: layouts.publishedAt,
      likesCount: count(layoutLikes.id),
    })
    .from(layouts)
    .leftJoin(layoutLikes, eq(layouts.id, layoutLikes.layoutId))
    .leftJoin(users, eq(layouts.authorId, users.id))
    .where(
      and(
        isNull(layouts.deletedAt),
        and(
          isNotNull(layouts.publishedAt),
          lte(layouts.publishedAt, sql`NOW()`),
        ),
      ),
    )
    .orderBy(desc(layouts.publishedAt))
    .groupBy(
      layouts.hash,
      layouts.title,
      layouts.category,
      layouts.region,
      layouts.image,
      layouts.authorId,
      users.name,
      layouts.publishedAt,
    )
    .limit(4);

  return { rows };
});

export const likeLayoutFn = createServerFn()
  .inputValidator(z.object({ hash: z.string() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = Number(context.auth.id);

    const layout = await db
      .select()
      .from(layouts)
      .where(eq(layouts.hash, data.hash))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    if (!layout) {
      throw new Error("Not Found");
    }

    const isLiked = await db
      .select({ one: sql<number>`1` })
      .from(layoutLikes)
      .where(
        and(
          eq(layoutLikes.layoutId, layout.id),
          eq(layoutLikes.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]?.one === 1);

    if (isLiked) {
      await db
        .delete(layoutLikes)
        .where(
          and(
            eq(layoutLikes.layoutId, layout.id),
            eq(layoutLikes.userId, userId),
          ),
        );
    } else {
      await db.insert(layoutLikes).values({
        layoutId: layout.id,
        userId,
      });
    }
  });

export const deleteLayoutFn = createServerFn()
  .inputValidator(z.object({ hash: z.string() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(layouts)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(layouts.hash, data.hash),
          eq(layouts.authorId, Number(context.auth.id)),
        ),
      );
  });

export const getRelatedLayoutsFn = createServerFn()
  .inputValidator(z.object({ hash: z.string() }))
  .handler(async ({ data }) => {
    const layout = await db
      .select()
      .from(layouts)
      .where(eq(layouts.hash, data.hash))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    if (!layout) {
      throw new Error("Not Found");
    }

    const rows = await db
      .select({
        hash: layouts.hash,
        title: layouts.title,
        category: layouts.category,
        region: layouts.region,
        image: layouts.image,
        authorId: layouts.authorId,
        authorName: users.name,
        publishedAt: layouts.publishedAt,
        likesCount: count(layoutLikes.id),
      })
      .from(layouts)
      .leftJoin(layoutLikes, eq(layouts.id, layoutLikes.layoutId))
      .leftJoin(users, eq(layouts.authorId, users.id))
      .where(
        and(
          isNull(layouts.deletedAt),
          and(
            isNotNull(layouts.publishedAt),
            lte(layouts.publishedAt, sql`NOW()`),
          ),
          ne(layouts.id, layout.id),
          eq(layouts.category, layout.category),
          eq(layouts.region, layout.region),
        ),
      )
      .orderBy(desc(count(layoutLikes.id)))
      .groupBy(
        layouts.hash,
        layouts.title,
        layouts.category,
        layouts.region,
        layouts.image,
        layouts.authorId,
        users.name,
        layouts.publishedAt,
      )
      .limit(4);

    return { rows };
  });

export const getLayoutEditorDataFn = createServerFn()
  .inputValidator(z.object({ hash: z.string() }))
  .handler(async ({ data }) => {
    const layout = await db
      .select({
        hash: layouts.hash,
        title: layouts.title,
        description: layouts.description,
        category: layouts.category,
        region: layouts.region,
        data: layouts.data,
        authorId: layouts.authorId,
        publishedAt: layouts.publishedAt,
      })
      .from(layouts)
      .where(eq(layouts.hash, data.hash))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return { layout };
  });

export const saveLayoutDraftFn = createServerFn({ method: "POST" })
  .inputValidator(updateLayoutSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(layouts)
      .set({
        title: data.title,
        description: data.description,
        category: data.category,
        region: data.region,
        data: data.data,
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(layouts.hash, data.hash),
          eq(layouts.authorId, Number(context.auth.id)),
        ),
      );
  });

export const publishLayoutFn = createServerFn({ method: "POST" })
  .inputValidator(updateLayoutSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(layouts)
      .set({
        title: data.title,
        description: data.description,
        category: data.category,
        region: data.region,
        data: data.data,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(layouts.hash, data.hash),
          eq(layouts.authorId, Number(context.auth.id)),
        ),
      );

    // Fire-and-forget screenshot generation
    void fetch(`${env.APP_URL}/api/screenshot/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Screenshot-Secret": env.SCREENSHOT_SECRET,
      },
      body: JSON.stringify({ hash: data.hash, title: data.title }),
    }).catch(() => console.error("Failed to trigger screenshot"));
  });
