import type { LayoutData } from "@/server/db/schema/layouts";

import type { Building } from "./game-data";

export type Mode = "select" | "place" | "delete" | "road" | "move";

export type Rotation = 0 | 45 | 90 | 135;

export const ROTATION_ANGLES: Rotation[] = [0, 45, 90, 135];

export type PlacedBuilding = {
  id: string;
  buildingId: number;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  rotation: Rotation;
  color: number;
};

export type BuildingPreview = {
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  isValid: boolean;
};

export type RoadType = "dirt" | "stone" | "marble";

export type RoadNode = {
  id: string;
  gridX: number;
  gridY: number;
  connectedEdges: string[];
  junctionType: JunctionType;
};

export type RoadEdge = {
  id: string;
  roadType: RoadType;
  startNodeId: string;
  endNodeId: string;
  // The "spine" of the road (center line) - grid coordinates
  centerLine: GridPoint[];
  // Direction of the edge (from start to end)
  direction: RoadDirection;
  // Pre-computed polygon vertices for rendering (screen coordinates are computed at render time)
  // These are in grid units, offset from center line
  polygonOffsets: { left: Point2D[]; right: Point2D[] };
};

export type RoadNetwork = {
  nodes: Record<string, RoadNode>;
  edges: Record<string, RoadEdge>;
};

export type RoadPreview = {
  waypoints: GridPoint[];
  edges: {
    startPoint: GridPoint;
    endPoint: GridPoint;
    direction: RoadDirection;
    centerLine: GridPoint[];
    isValid: boolean;
  }[];
  isValid: boolean;
  totalLength: number;
};

export type RoadDirection =
  | "N" // North (up)
  | "S" // South (down)
  | "E" // East (right)
  | "W" // West (left)
  | "NE" // Northeast (diagonal up-right)
  | "NW" // Northwest (diagonal up-left)
  | "SE" // Southeast (diagonal down-right)
  | "SW"; // Southwest (diagonal down-left)

export type JunctionType =
  | "endpoint" // Road ends here (1 connection)
  | "straight" // Straight through (2 connections, opposite directions)
  | "elbow" // 90° or 45° turn (2 connections, not opposite)
  | "T" // T-junction (3 connections)
  | "cross" // 4-way crossing (4 connections)
  | "multi"; // 5+ connections

export type Point2D = {
  x: number;
  y: number;
};

export type GridPoint = {
  gridX: number;
  gridY: number;
};

export type HistorySnapshot = {
  placedBuildings: PlacedBuilding[];
  roadNetwork: RoadNetwork;
};

export type EditorState = {
  mode: Mode;

  zoom: number;
  panX: number;
  panY: number;

  cellSize: number;

  selectedBuilding: number | null;
  placedBuildings: PlacedBuilding[];
  selectedBuildingIds: string[];

  ghostPosition: { x: number; y: number } | null;
  ghostRotation: Rotation;

  bulkStartPosition: { gridX: number; gridY: number } | null;
  bulkEndPosition: { gridX: number; gridY: number } | null;
  isBulkPlacing: boolean;

  selectedRoadType: RoadType | null;
  roadNetwork: RoadNetwork;
  roadStartPosition: { gridX: number; gridY: number } | null;
  roadEndPosition: { gridX: number; gridY: number } | null;
  isPlacingRoad: boolean;
  roadPreview: RoadPreview | null;

  movingBuildings: PlacedBuilding[];
  moveAnchorPoint: { gridX: number; gridY: number } | null;
  moveCursorPosition: { x: number; y: number } | null;
  moveRotationDelta: Rotation;
  isSelectingForMove: boolean;
  moveSelectionStart: { gridX: number; gridY: number } | null;
  moveSelectionEnd: { gridX: number; gridY: number } | null;
  showMoveConfirmDialog: boolean;
  pendingMoveResult: {
    valid: PlacedBuilding[];
    invalid: PlacedBuilding[];
  } | null;

  history: HistorySnapshot[];
  historyIndex: number;
  maxHistorySize: number;

  isDirty: boolean;

  setMode: (mode: Mode) => void;
  setZoom: (zoom: number) => void;
  incrementZoom: (delta: number) => void;
  setPan: (x: number, y: number) => void;
  adjustPan: (deltaX: number, deltaY: number) => void;
  selectBuilding: (building: number | null) => void;
  setGhostPosition: (position: { x: number; y: number } | null) => void;
  setGhostRotation: (rotation: Rotation) => void;
  cycleGhostRotation: (direction: 1 | -1) => void;
  placeBuilding: (building: PlacedBuilding) => void;
  placeBuildings: (buildings: PlacedBuilding[]) => void;
  removeBuilding: (id: string) => void;
  removeBuildings: (ids: string[]) => void;
  clearAllBuildings: () => void;
  toggleBuildingSelection: (id: string) => void;
  clearSelection: () => void;
  deleteSelectedBuildings: () => void;

  startBulkPlacement: (gridX: number, gridY: number) => void;
  updateBulkPlacement: (gridX: number, gridY: number) => void;
  finishBulkPlacement: (buildingsMap: Record<number, Building>) => void;
  cancelBulkPlacement: () => void;

  selectRoadType: (roadType: RoadType | null) => void;
  startRoadPlacement: (gridX: number, gridY: number) => void;
  updateRoadPlacement: (gridX: number, gridY: number) => void;
  finishRoadPlacement: () => void;
  cancelRoadPlacement: () => void;
  removeRoadEdge: (edgeId: string) => void;
  clearAllRoads: () => void;

  pickUpBuilding: (
    buildingId: string,
    anchorGridX: number,
    anchorGridY: number,
  ) => void;
  pickUpBuildings: (
    buildingIds: string[],
    anchorGridX: number,
    anchorGridY: number,
  ) => void;
  updateMoveCursor: (worldX: number, worldY: number) => void;
  cycleMoveRotation: (direction: 1 | -1) => void;
  startMoveSelection: (gridX: number, gridY: number) => void;
  updateMoveSelection: (gridX: number, gridY: number) => void;
  finishMoveSelection: () => void;
  attemptPlaceMovedBuildings: (buildingsMap: Record<number, Building>) => void;
  confirmMoveWithInvalid: () => void;
  cancelMoveConfirmDialog: () => void;
  cancelMove: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;

  restoreFromLayoutData: (
    layoutData: LayoutData | null | undefined,
    buildingsMap: Record<number, Building>,
  ) => void;

  markClean: () => void;
};
