import type { REGION_IDS } from "@/lib/constants";
import type { ALL_LAYOUT_CATEGORY_VALUES } from "@/server/db/layout-categories";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { HeartIcon, UserIcon } from "lucide-react";

import { getLayoutSlug } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";
import { LAYOUT_CATEGORIES } from "@/server/db/layout-categories";
import { useGameData } from "../providers/game-data-provider";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export function LayoutCard({
  title,
  hash,
  authorName,
  image,
  category,
  region,
  likesCount,
}: {
  title: string;
  hash: string;
  authorId: number | null;
  authorName: string | null;
  image: string | null;
  category: (typeof ALL_LAYOUT_CATEGORY_VALUES)[number];
  region: (typeof REGION_IDS)[number];
  likesCount: number;
  publishedAt?: Date | null;
}) {
  const locale = getLocale();

  const { regionsMap, getRegionName } = useGameData();

  const categoryColors = {
    production: "bg-accent text-accent-foreground",
    city: "bg-primary text-primary-foreground",
    other: "bg-secondary text-secondary-foreground",
  };

  const regionIcon = useMemo(
    () => regionsMap[Number(region)]?.icon ?? "",
    [region, regionsMap],
  );

  return (
    <Link to="/layouts/$slug" params={{ slug: getLayoutSlug(title, hash) }}>
      <Card className="group overflow-hidden p-0 transition-all hover:border-primary/50 hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden">
          {image && (
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )}
          <div className="absolute top-6 left-6">
            <Badge
              className={
                categoryColors[category as keyof typeof categoryColors]
              }
            >
              {LAYOUT_CATEGORIES.find((c) => c.id === category)?.labels[locale]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6">
          <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <UserIcon className="h-3.5 w-3.5" />
              <span>{authorName ?? "Unknown"}</span>
            </div>

            <div className="flex items-center gap-1">
              {regionIcon && (
                <img
                  src={regionIcon}
                  alt={getRegionName(Number(region))}
                  className="h-3.5 w-3.5"
                />
              )}
              <span>{getRegionName(Number(region))}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <HeartIcon className="h-3.5 w-3.5" />
              <span>{likesCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function LayoutCardsSkeleton({ count }: { count: number }) {
  if (count === 1) {
    return <Skeleton className="h-[408px] w-full" />;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-[408px] w-full" />
      ))}
    </div>
  );
}
