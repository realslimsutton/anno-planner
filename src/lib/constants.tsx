import type { Mode, RoadNetwork, RoadType } from "@/types/editor";
import type { ReactNode } from "react";
import { Hammer, MousePointer2, Move, Route, Trash2 } from "lucide-react";

export const REGION_IDS = ["3225", "6626"] as const;

export const ASSETS_KEY = "assets";
export const ASSETS_VERSION_KEY = "assets_version";
export const TRANSLATIONS_VERSION_PREFIX = "translations_version_";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.0;
export const ZOOM_STEP = 0.1;

export const GRID_COLOR_MAJOR = 0x505050;
export const SUB_TILE_COLOR = 0x2a2a2a;
export const BACKGROUND_COLOR = 0x1a1a1a;
export const SELECTION_COLOR = 0x4a9eff;
export const DELETE_HIGHLIGHT_COLOR = 0xff4444;
export const MOVE_HIGHLIGHT_COLOR = 0x4aff9e;

export const ROAD_COLORS: Record<
  RoadType,
  { fill: number; stroke: number; border: number }
> = {
  dirt: { fill: 0x8b7355, stroke: 0x6b5344, border: 0x5a4233 },
  stone: { fill: 0x808080, stroke: 0x606060, border: 0x505050 },
  marble: { fill: 0xf0f0f0, stroke: 0xd0d0d0, border: 0xc0c0c0 },
};

export const MODES: {
  id: Mode;
  label: string;
  icon: ReactNode;
  shortcut?: string;
}[] = [
  {
    id: "select",
    label: "Select",
    icon: <MousePointer2 className="h-4 w-4" />,
  },
  {
    id: "move",
    label: "Move",
    icon: <Move className="h-4 w-4" />,
    shortcut: "⌘M",
  },
  {
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    shortcut: "⌘D",
  },
];

export const SELECT_MODE = {
  id: "select" as Mode,
  label: "Select",
  icon: <MousePointer2 className="h-4 w-4" />,
};

export const PLACE_MODE = {
  id: "place" as Mode,
  label: "Place",
  icon: <Hammer className="h-4 w-4" />,
};

export const ROAD_MODE = {
  id: "road" as Mode,
  label: "Road",
  icon: <Route className="h-4 w-4" />,
};

export const MOVE_MODE = {
  id: "move" as Mode,
  label: "Move",
  icon: <Move className="h-4 w-4" />,
};

export const INITIAL_ROAD_NETWORK: RoadNetwork = {
  nodes: {},
  edges: {},
};

export const MAX_HISTORY_SIZE = 50;

export const ROAD_WIDTH = 1.0;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
export const MIN_ROAD_LENGTH = 2;
