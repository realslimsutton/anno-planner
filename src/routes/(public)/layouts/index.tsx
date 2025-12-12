import type { REGION_IDS } from "@/lib/constants";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useDebounceCallback } from "usehooks-ts";

import {
  LayoutCard,
  LayoutCardsSkeleton,
} from "@/components/layouts/layout-card";
import { CreateLayoutModalTrigger } from "@/components/providers/create-layout-provider";
import { useGameData } from "@/components/providers/game-data-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { searchLayoutsSchema } from "@/lib/validation/layouts";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { LAYOUT_CATEGORIES } from "@/server/db/layout-categories";
import { layoutQueries } from "@/server/queries/layouts";

export const Route = createFileRoute("/(public)/layouts/")({
  component: RouteComponent,
  validateSearch: searchLayoutsSchema,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const toggleRegion = (region: (typeof REGION_IDS)[number]) => {
    void navigate({
      search: {
        ...search,
        page: 1,
        regions: search.regions.includes(region)
          ? search.regions.filter((r) => r !== region)
          : [...search.regions, region],
      },
    });
  };

  const toggleCategory = (category: string) => {
    void navigate({
      search: {
        ...search,
        page: 1,
        categories: search.categories.includes(category)
          ? search.categories.filter((c) => c !== category)
          : [...search.categories, category],
      },
    });
  };

  const clearFilters = () => {
    void navigate({
      search: {
        ...search,
        page: 1,
        search: undefined,
        categories: [],
        regions: [],
      },
    });
  };

  const hasActiveFilters =
    search.regions.length > 0 ||
    search.categories.length > 0 ||
    (search.search?.length ?? 0) > 0;

  const setDebouncedSearchQuery = useDebounceCallback((value: string) => {
    void navigate({
      search: {
        ...search,
        page: 1,
        search: value.length > 0 ? value : undefined,
      },
    });
  }, 500);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {m.browse_layouts_title()}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {m.browse_layouts_description()}
          </p>
        </div>
        <CreateLayoutModalTrigger className="gap-2">
          <Plus className="h-4 w-4" />
          {m.create_layout_button()}
        </CreateLayoutModalTrigger>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold text-foreground">
              {m.browse_layouts_title()}
            </h2>
            <FilterContent
              selectedCategories={search.categories}
              selectedRegions={search.regions}
              toggleCategory={toggleCategory}
              toggleRegion={toggleRegion}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search and Sort Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={m.layout_filter_search_placeholder()}
                defaultValue={search.search ?? ""}
                onChange={(e) => {
                  setDebouncedSearchQuery(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Sheet
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {search.regions.length + search.categories.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent
                      selectedCategories={search.categories}
                      selectedRegions={search.regions}
                      toggleCategory={toggleCategory}
                      toggleRegion={toggleRegion}
                      clearFilters={clearFilters}
                      hasActiveFilters={hasActiveFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Select
                value={search.sortBy}
                onValueChange={(value) => {
                  void navigate({
                    search: {
                      ...search,
                      page: 1,
                      sortBy: value as "recent" | "popular",
                    },
                  });
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">
                    {m.layout_sort_by_recent()}
                  </SelectItem>
                  <SelectItem value="popular">
                    {m.layout_sort_by_popular()}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ActiveFilters
            selectedCategories={search.categories}
            selectedRegions={search.regions}
            toggleCategory={toggleCategory}
            toggleRegion={toggleRegion}
            hasActiveFilters={hasActiveFilters}
            searchQuery={search.search ?? ""}
            setSearchQuery={(value) => {
              void navigate({
                search: {
                  ...search,
                  page: 1,
                  search: value,
                },
              });
            }}
          />

          <Suspense fallback={<LayoutCardsSkeleton count={6} />}>
            <LayoutCards clearFilters={clearFilters} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function FilterContent({
  selectedCategories,
  selectedRegions,
  toggleCategory,
  toggleRegion,
  clearFilters,
  hasActiveFilters,
}: {
  selectedCategories: string[];
  selectedRegions: (typeof REGION_IDS)[number][];
  toggleCategory: (category: string) => void;
  toggleRegion: (region: (typeof REGION_IDS)[number]) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  const locale = getLocale();

  const { assets, getRegionName } = useGameData();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-semibold text-foreground">
          {m.layout_filter_category_title()}
        </h3>
        <div className="space-y-2">
          {LAYOUT_CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label
                htmlFor={`category-${category.id}`}
                className="cursor-pointer text-sm font-normal"
              >
                {category.labels[locale]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-foreground">
          {m.layout_filter_region_title()}
        </h3>
        <div className="space-y-2">
          {assets?.regions.map((region) => (
            <div key={region.id} className="flex items-center gap-2">
              <Checkbox
                id={`region-${region.id}`}
                checked={selectedRegions.includes(
                  String(region.id) as (typeof REGION_IDS)[number],
                )}
                onCheckedChange={() =>
                  toggleRegion(String(region.id) as (typeof REGION_IDS)[number])
                }
              />
              <Label
                htmlFor={`region-${region.id}`}
                className="cursor-pointer text-sm font-normal"
              >
                {getRegionName(region.id)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full bg-transparent"
        >
          {m.layout_filter_clear_all_button()}
        </Button>
      )}
    </div>
  );
}

function ActiveFilters({
  selectedCategories,
  selectedRegions,
  toggleCategory,
  toggleRegion,
  hasActiveFilters,
  searchQuery,
  setSearchQuery,
}: {
  selectedCategories: string[];
  selectedRegions: (typeof REGION_IDS)[number][];
  toggleCategory: (category: string) => void;
  toggleRegion: (region: (typeof REGION_IDS)[number]) => void;
  hasActiveFilters: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const locale = getLocale();

  const { getRegionName } = useGameData();

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {selectedCategories.map((category) => (
        <Button
          key={category}
          variant="secondary"
          size="sm"
          onClick={() => toggleCategory(category)}
          className="gap-1"
        >
          {LAYOUT_CATEGORIES.find((c) => c.id === category)?.labels[locale]}
          <X className="h-3 w-3" />
        </Button>
      ))}
      {selectedRegions.map((region) => (
        <Button
          key={region}
          variant="secondary"
          size="sm"
          onClick={() => toggleRegion(region)}
          className="gap-1"
        >
          {getRegionName(Number(region))}
          <X className="h-3 w-3" />
        </Button>
      ))}
      {searchQuery && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSearchQuery("")}
          className="gap-1"
        >
          Search: {searchQuery}
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function LayoutCards({ clearFilters }: { clearFilters: () => void }) {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const { data } = useSuspenseQuery(layoutQueries.getLayouts(search));

  return (
    <>
      {data.rows.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.rows.map((layout) => (
              <LayoutCard key={layout.hash} {...layout} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void navigate({
                  search: {
                    ...search,
                    page: search.page - 1,
                  },
                })
              }
              disabled={search.page === 1}
            >
              {m.pagination_previous_button()}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: data.pageCount }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={search.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      void navigate({
                        search: {
                          ...search,
                          page,
                        },
                      })
                    }
                    className="w-9"
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void navigate({
                  search: {
                    ...search,
                    page: search.page + 1,
                  },
                })
              }
              disabled={search.page === data.pageCount}
            >
              {m.pagination_next_button()}
            </Button>
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            No layouts found matching your criteria.
          </p>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="mt-4 bg-transparent"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </>
  );
}
