import type { getLayoutEditorDataFn } from "@/server/api/layouts";
import type { RoadType } from "@/types/editor";
import type { Building, BuildingCategory } from "@/types/game-data";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Route, Search } from "lucide-react";

import { ROAD_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { useGameData } from "../providers/game-data-provider";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Kbd } from "../ui/kbd";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useLayoutEditor } from "./provider";

const ROAD_TYPES: { id: RoadType; name: string; description: string }[] = [
  { id: "dirt", name: "Dirt Road", description: "Basic unpaved road" },
  { id: "stone", name: "Stone Road", description: "Sturdy cobblestone road" },
  {
    id: "marble",
    name: "Marble Road",
    description: "Elegant marble paved road",
  },
];

export function LayoutEditorSidebar({
  layout,
}: {
  layout: NonNullable<
    Awaited<ReturnType<typeof getLayoutEditorDataFn>>["layout"]
  >;
}) {
  const {
    isHeaderCollapsed,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    searchQuery,
    setSearchQuery,
  } = useLayoutEditor();

  const { assets, translations } = useGameData();

  const [selectedCategory, setSelectedCategory] = useState<
    BuildingCategory | "roads" | null
  >(null);

  const filteredBuildings = useMemo(
    () =>
      getFilteredBuildings(
        assets?.buildings ?? [],
        translations ?? {},
        searchQuery,
        selectedCategory === "roads" ? null : selectedCategory,
        Number(layout.region),
      ),
    [
      assets?.buildings,
      layout.region,
      searchQuery,
      selectedCategory,
      translations,
    ],
  );

  const availableCategories = [
    ...new Set(
      assets?.buildings
        .filter((b) => b.regions.includes(Number(layout.region)))
        .map((b) => b.category),
    ),
  ]
    .filter((c): c is NonNullable<BuildingCategory> => c !== null)
    .sort();

  return (
    <>
      <AnimatePresence>
        {!isSidebarCollapsed && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card lg:w-80"
            style={{ top: isHeaderCollapsed ? 0 : 56 }}
          >
            <div className="space-y-3 border-b border-border p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search buildings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-16 pl-9"
                />
                <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
              </div>
            </div>

            <Tabs
              value={selectedCategory ?? "all"}
              onValueChange={(v) =>
                setSelectedCategory(
                  v === "all" ? null : (v as BuildingCategory | "roads"),
                )
              }
              className="flex flex-1 flex-col overflow-hidden"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent px-3 py-2">
                <TabsTrigger
                  value="all"
                  className="h-8 px-3 text-xs hover:bg-accent data-[state=active]:bg-secondary data-[state=active]:hover:bg-secondary"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="roads"
                  className="h-8 px-2 text-xs hover:bg-accent data-[state=active]:bg-secondary data-[state=active]:hover:bg-secondary"
                >
                  <Route className="mr-1 h-3 w-3" />
                  Roads
                </TabsTrigger>
                {availableCategories.slice(0, 4).map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="h-8 px-2 text-xs hover:bg-accent data-[state=active]:bg-secondary data-[state=active]:hover:bg-secondary"
                  >
                    <span className="hidden lg:inline">{cat}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {selectedCategory === "roads" ? (
                    ROAD_TYPES.map((road) => (
                      <RoadTypeButton key={road.id} roadType={road} />
                    ))
                  ) : filteredBuildings.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No buildings found
                    </div>
                  ) : (
                    filteredBuildings.map((building) => (
                      <BuildingButton key={building.id} building={building} />
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-3 text-xs text-muted-foreground">
                {selectedCategory === "roads"
                  ? `${ROAD_TYPES.length} road types`
                  : `${filteredBuildings.length} buildings`}
              </div>
            </Tabs>
          </motion.aside>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={`fixed top-1/2 z-50 -translate-y-1/2 rounded-r-lg border border-border bg-card px-1 py-3 transition-all ${
          isSidebarCollapsed ? "left-0" : "left-72 lg:left-80"
        }`}
        style={{ top: isHeaderCollapsed ? "50%" : "calc(50% + 28px)" }}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </>
  );
}

function getFilteredBuildings(
  allBuildings: Building[],
  translations: Record<string, string>,
  searchQuery: string,
  selectedCategory: BuildingCategory | null,
  selectedRegionId: number | null = null,
): Building[] {
  let buildings = allBuildings;

  if (selectedRegionId !== null) {
    buildings = buildings.filter((s) => s.regions.includes(selectedRegionId));
  }

  if (selectedCategory) {
    buildings = buildings.filter((s) => s.category === selectedCategory);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    buildings = buildings.filter((s) => {
      const name = translations[String(s.id)] ?? "";
      return (
        name.toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query)
      );
    });
  }

  return buildings;
}

function BuildingButton({ building }: { building: Building }) {
  const { getBuildingName } = useGameData();

  const selectedBuilding = useEditorStore((state) => state.selectedBuilding);
  const selectBuilding = useEditorStore((state) => state.selectBuilding);

  const buildingName = getBuildingName(building.id);
  const isSelected = selectedBuilding === building.id;

  return (
    <button
      type="button"
      key={building.id}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:bg-accent",
        isSelected ? "border-primary bg-accent" : "hover:bg-accent",
      )}
      onClick={() =>
        selectBuilding(selectedBuilding === building.id ? null : building.id)
      }
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {building.icon && (
          <img
            src={building.icon}
            alt={buildingName}
            width={48}
            height={48}
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {buildingName}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant="outline" className="h-5 text-xs">
            {building.size.height}x{building.size.width}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function RoadTypeButton({
  roadType,
}: {
  roadType: { id: RoadType; name: string; description: string };
}) {
  const selectedRoadType = useEditorStore((state) => state.selectedRoadType);
  const selectRoadType = useEditorStore((state) => state.selectRoadType);

  const isSelected = selectedRoadType === roadType.id;
  const colors = ROAD_COLORS[roadType.id];

  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:bg-accent",
        isSelected ? "border-primary bg-accent" : "hover:bg-accent",
      )}
      onClick={() =>
        selectRoadType(selectedRoadType === roadType.id ? null : roadType.id)
      }
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md"
        style={{
          backgroundColor: `#${colors.fill.toString(16).padStart(6, "0")}`,
          border: `2px solid #${colors.border.toString(16).padStart(6, "0")}`,
        }}
      >
        <Route className="h-6 w-6 text-white/80" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {roadType.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {roadType.description}
        </p>
      </div>
    </button>
  );
}
