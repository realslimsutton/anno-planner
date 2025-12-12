import type { LayoutData } from "@/server/db/schema/layouts";
import type {
  EditorState,
  GridPoint,
  Mode,
  PlacedBuilding,
  RoadEdge,
  RoadNetwork,
  RoadNode,
  Rotation,
} from "@/types/editor";
import type { Building } from "@/types/game-data";
import { create } from "zustand";

import {
  INITIAL_ROAD_NETWORK,
  MAX_HISTORY_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
} from "@/lib/constants";
import {
  buildingsOverlap,
  calculateBulkBuildings,
  cloneRoadNetwork,
  createSnapshot,
  getAdjustedSize,
  getDirectionFromDelta,
  isValidPlacement,
} from "@/lib/editor";
import {
  calculateRoadPreview,
  computeEdgePolygonOffsets,
  createRoadEdgesFromPreview,
  determineJunctionType,
  removeEdgeFromNetwork,
} from "@/lib/editor/road";
import { ROTATION_ANGLES } from "@/types/editor";

export const useEditorStore = create<EditorState>()((set, get) => ({
  // Initial state
  mode: "select",
  zoom: 1,
  panX: 0,
  panY: 0,
  cellSize: 40, // Smaller cells
  selectedBuilding: null,
  placedBuildings: [],
  selectedBuildingIds: [],
  ghostPosition: null,
  ghostRotation: 0,
  bulkStartPosition: null,
  bulkEndPosition: null,
  isBulkPlacing: false,

  // Road state
  selectedRoadType: null,
  roadNetwork: INITIAL_ROAD_NETWORK,
  roadStartPosition: null,
  roadEndPosition: null,
  isPlacingRoad: false,
  roadPreview: null,

  // Move mode state
  movingBuildings: [],
  moveAnchorPoint: null,
  moveCursorPosition: null,
  moveRotationDelta: 0,
  isSelectingForMove: false,
  moveSelectionStart: null,
  moveSelectionEnd: null,
  showMoveConfirmDialog: false,
  pendingMoveResult: null,

  // History state for undo/redo
  history: [],
  historyIndex: -1,
  maxHistorySize: MAX_HISTORY_SIZE,

  // Dirty state - tracks unsaved changes
  isDirty: false,

  sidebarCollapsed: false,
  searchQuery: "",
  selectedCategory: null,

  // Actions
  setMode: (mode: Mode) => {
    const clearMoveState = {
      movingBuildings: [] as PlacedBuilding[],
      moveAnchorPoint: null,
      moveCursorPosition: null,
      moveRotationDelta: 0 as Rotation,
      isSelectingForMove: false,
      moveSelectionStart: null,
      moveSelectionEnd: null,
      showMoveConfirmDialog: false,
      pendingMoveResult: null,
    };

    if (mode === "select") {
      set({
        mode,
        selectedBuilding: null,
        ghostPosition: null,
        bulkStartPosition: null,
        bulkEndPosition: null,
        isBulkPlacing: false,
        selectedRoadType: null,
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
        ...clearMoveState,
      });
    } else if (mode === "delete") {
      set({
        mode,
        selectedBuilding: null,
        ghostPosition: null,
        selectedBuildingIds: [],
        selectedRoadType: null,
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
        ...clearMoveState,
      });
    } else if (mode === "road") {
      set({
        mode,
        selectedBuilding: null,
        ghostPosition: null,
        bulkStartPosition: null,
        bulkEndPosition: null,
        isBulkPlacing: false,
        selectedBuildingIds: [],
        ...clearMoveState,
      });
    } else if (mode === "move") {
      set({
        mode,
        selectedBuilding: null,
        ghostPosition: null,
        bulkStartPosition: null,
        bulkEndPosition: null,
        isBulkPlacing: false,
        selectedRoadType: null,
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
        selectedBuildingIds: [],
        ...clearMoveState,
      });
    } else {
      set({ mode });
    }
  },

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom });
  },

  incrementZoom: (delta: number) => {
    const { zoom } = get();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    set({ zoom: newZoom });
  },

  setPan: (x, y) => set({ panX: x, panY: y }),

  adjustPan: (deltaX, deltaY) => {
    const { panX, panY } = get();
    set({ panX: panX + deltaX, panY: panY + deltaY });
  },

  selectBuilding: (building) => {
    if (building) {
      set({
        selectedBuilding: building,
        ghostPosition: null,
        mode: "place",
        selectedBuildingIds: [],
      });
    } else {
      set({
        selectedBuilding: null,
        ghostPosition: null,
        mode: "select",
      });
    }
  },

  setGhostPosition: (position) => set({ ghostPosition: position }),

  setGhostRotation: (rotation) => set({ ghostRotation: rotation }),

  cycleGhostRotation: (direction) => {
    const { ghostRotation } = get();
    const currentIndex = ROTATION_ANGLES.indexOf(ghostRotation);
    const newIndex =
      (currentIndex + direction + ROTATION_ANGLES.length) %
      ROTATION_ANGLES.length;
    set({ ghostRotation: ROTATION_ANGLES[newIndex] });
  },

  placeBuilding: (building) => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    const hasCollision = placedBuildings.some((existing) =>
      buildingsOverlap(existing, building),
    );
    if (!hasCollision) {
      // Push current state to history before modifying
      const snapshot = createSnapshot(placedBuildings, roadNetwork);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      set({
        placedBuildings: [...placedBuildings, building],
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });
    }
  },

  placeBuildings: (buildings) => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    const newBuildings: PlacedBuilding[] = [];
    const allBuildings = [...placedBuildings];

    for (const building of buildings) {
      const hasCollision = allBuildings.some((existing) =>
        buildingsOverlap(existing, building),
      );
      if (!hasCollision) {
        newBuildings.push(building);
        allBuildings.push(building);
      }
    }

    if (newBuildings.length > 0) {
      // Push current state to history before modifying
      const snapshot = createSnapshot(placedBuildings, roadNetwork);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      set({
        placedBuildings: allBuildings,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });
    }
  },

  removeBuilding: (id) => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      placedBuildings: placedBuildings.filter((s) => s.id !== id),
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  removeBuildings: (ids) => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      placedBuildings: placedBuildings.filter((s) => !ids.includes(s.id)),
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  clearAllBuildings: () => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      placedBuildings: [],
      selectedBuildingIds: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  toggleBuildingSelection: (id) => {
    const { selectedBuildingIds } = get();
    if (selectedBuildingIds.includes(id)) {
      set({ selectedBuildingIds: selectedBuildingIds.filter((i) => i !== id) });
    } else {
      set({ selectedBuildingIds: [...selectedBuildingIds, id] });
    }
  },

  clearSelection: () => set({ selectedBuildingIds: [] }),

  deleteSelectedBuildings: () => {
    const {
      placedBuildings,
      selectedBuildingIds,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    if (selectedBuildingIds.length === 0) return;

    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      placedBuildings: placedBuildings.filter(
        (s) => !selectedBuildingIds.includes(s.id),
      ),
      selectedBuildingIds: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  // Bulk placement actions
  startBulkPlacement: (gridX, gridY) => {
    set({
      bulkStartPosition: { gridX, gridY },
      bulkEndPosition: { gridX, gridY },
      isBulkPlacing: true,
    });
  },

  updateBulkPlacement: (gridX, gridY) => {
    set({ bulkEndPosition: { gridX, gridY } });
  },

  finishBulkPlacement: (buildingsMap: Record<number, Building>) => {
    const {
      selectedBuilding,
      bulkStartPosition,
      bulkEndPosition,
      ghostRotation,
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();

    if (!selectedBuilding || !bulkStartPosition || !bulkEndPosition) {
      set({
        bulkStartPosition: null,
        bulkEndPosition: null,
        isBulkPlacing: false,
      });
      return;
    }

    const buildingDef = buildingsMap[selectedBuilding];
    if (!buildingDef) {
      set({
        bulkStartPosition: null,
        bulkEndPosition: null,
        isBulkPlacing: false,
      });
      return;
    }

    const { adjustedWidth, adjustedHeight } = getAdjustedSize(
      buildingDef.size.width,
      buildingDef.size.height,
      ghostRotation,
    );

    const buildings = calculateBulkBuildings(
      bulkStartPosition,
      bulkEndPosition,
      adjustedWidth,
      adjustedHeight,
      ghostRotation,
      buildingDef.color,
      selectedBuilding,
      placedBuildings,
      roadNetwork,
    );

    if (buildings.length > 0) {
      // Push current state to history before modifying
      const snapshot = createSnapshot(placedBuildings, roadNetwork);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      const allBuildings = [...placedBuildings, ...buildings];
      set({
        placedBuildings: allBuildings,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });
    }

    set({
      bulkStartPosition: null,
      bulkEndPosition: null,
      isBulkPlacing: false,
    });
  },

  cancelBulkPlacement: () => {
    set({
      bulkStartPosition: null,
      bulkEndPosition: null,
      isBulkPlacing: false,
    });
  },

  // Road actions
  selectRoadType: (roadType) => {
    if (roadType) {
      set({
        selectedRoadType: roadType,
        mode: "road",
        selectedBuilding: null,
        ghostPosition: null,
        selectedBuildingIds: [],
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
      });
    } else {
      set({
        selectedRoadType: null,
        mode: "select",
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
      });
    }
  },

  startRoadPlacement: (gridX, gridY) => {
    set({
      roadStartPosition: { gridX, gridY },
      roadEndPosition: { gridX, gridY },
      isPlacingRoad: true,
      roadPreview: null,
    });
  },

  updateRoadPlacement: (gridX, gridY) => {
    const { roadStartPosition, roadNetwork, placedBuildings } = get();
    if (!roadStartPosition) return;

    const preview = calculateRoadPreview(
      roadStartPosition,
      { gridX, gridY },
      roadNetwork,
      placedBuildings,
    );

    set({
      roadEndPosition: { gridX, gridY },
      roadPreview: preview,
    });
  },

  finishRoadPlacement: () => {
    const {
      roadPreview,
      selectedRoadType,
      roadNetwork,
      placedBuildings,
      history,
      historyIndex,
      maxHistorySize,
    } = get();

    if (!roadPreview || !roadPreview.isValid || !selectedRoadType) {
      set({
        roadStartPosition: null,
        roadEndPosition: null,
        isPlacingRoad: false,
        roadPreview: null,
      });
      return;
    }

    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    // Create road edges from preview using graph-based system
    const newNetwork = createRoadEdgesFromPreview(
      roadPreview,
      selectedRoadType,
      roadNetwork,
    );

    set({
      roadNetwork: newNetwork,
      roadStartPosition: null,
      roadEndPosition: null,
      isPlacingRoad: false,
      roadPreview: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  cancelRoadPlacement: () => {
    set({
      roadStartPosition: null,
      roadEndPosition: null,
      isPlacingRoad: false,
      roadPreview: null,
    });
  },

  removeRoadEdge: (edgeId) => {
    const {
      roadNetwork,
      placedBuildings,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    const newNetwork = removeEdgeFromNetwork(edgeId, roadNetwork);
    set({
      roadNetwork: newNetwork,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  clearAllRoads: () => {
    const {
      roadNetwork,
      placedBuildings,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    // Push current state to history before modifying
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      roadNetwork: INITIAL_ROAD_NETWORK,
      roadStartPosition: null,
      roadEndPosition: null,
      isPlacingRoad: false,
      roadPreview: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  // Move mode actions
  pickUpBuilding: (buildingId, anchorGridX, anchorGridY) => {
    const { placedBuildings } = get();
    const building = placedBuildings.find((s) => s.id === buildingId);
    if (!building) return;

    // Remove the building from placed buildings and add to movingBuildings
    set({
      movingBuildings: [{ ...building }],
      moveAnchorPoint: { gridX: anchorGridX, gridY: anchorGridY },
      moveRotationDelta: 0,
      placedBuildings: placedBuildings.filter((s) => s.id !== buildingId),
    });
  },

  pickUpBuildings: (buildingIds, anchorGridX, anchorGridY) => {
    const { placedBuildings } = get();
    const buildingsToMove = placedBuildings.filter((s) =>
      buildingIds.includes(s.id),
    );
    if (buildingsToMove.length === 0) return;

    // Deep copy the buildings being moved
    const movingBuildings = buildingsToMove.map((s) => ({ ...s }));

    set({
      movingBuildings,
      moveAnchorPoint: { gridX: anchorGridX, gridY: anchorGridY },
      moveRotationDelta: 0,
      placedBuildings: placedBuildings.filter(
        (s) => !buildingIds.includes(s.id),
      ),
      isSelectingForMove: false,
      moveSelectionStart: null,
      moveSelectionEnd: null,
    });
  },

  updateMoveCursor: (worldX, worldY) => {
    set({ moveCursorPosition: { x: worldX, y: worldY } });
  },

  cycleMoveRotation: (direction) => {
    const { moveRotationDelta } = get();
    const currentIndex = ROTATION_ANGLES.indexOf(moveRotationDelta);
    const newIndex =
      (currentIndex + direction + ROTATION_ANGLES.length) %
      ROTATION_ANGLES.length;
    set({ moveRotationDelta: ROTATION_ANGLES[newIndex] });
  },

  startMoveSelection: (gridX, gridY) => {
    set({
      isSelectingForMove: true,
      moveSelectionStart: { gridX, gridY },
      moveSelectionEnd: { gridX, gridY },
    });
  },

  updateMoveSelection: (gridX, gridY) => {
    set({ moveSelectionEnd: { gridX, gridY } });
  },

  finishMoveSelection: () => {
    const { moveSelectionStart, moveSelectionEnd, placedBuildings } = get();
    if (!moveSelectionStart || !moveSelectionEnd) {
      set({
        isSelectingForMove: false,
        moveSelectionStart: null,
        moveSelectionEnd: null,
      });
      return;
    }

    // Calculate selection bounds
    const minX = Math.min(moveSelectionStart.gridX, moveSelectionEnd.gridX);
    const maxX = Math.max(moveSelectionStart.gridX, moveSelectionEnd.gridX);
    const minY = Math.min(moveSelectionStart.gridY, moveSelectionEnd.gridY);
    const maxY = Math.max(moveSelectionStart.gridY, moveSelectionEnd.gridY);

    // Find buildings that intersect with the selection box
    const selectedBuildings = placedBuildings.filter((building) => {
      // Check if building intersects with selection box
      const buildingMinX = building.gridX;
      const buildingMaxX = building.gridX + building.width;
      const buildingMinY = building.gridY;
      const buildingMaxY = building.gridY + building.height;

      return (
        buildingMinX < maxX &&
        buildingMaxX > minX &&
        buildingMinY < maxY &&
        buildingMaxY > minY
      );
    });

    if (selectedBuildings.length === 0) {
      set({
        isSelectingForMove: false,
        moveSelectionStart: null,
        moveSelectionEnd: null,
      });
      return;
    }

    // Calculate center of selection as anchor point
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Pick up all selected buildings
    const movingBuildings = selectedBuildings.map((s) => ({ ...s }));
    const buildingIds = selectedBuildings.map((s) => s.id);

    set({
      movingBuildings,
      moveAnchorPoint: { gridX: centerX, gridY: centerY },
      moveRotationDelta: 0,
      placedBuildings: placedBuildings.filter(
        (s) => !buildingIds.includes(s.id),
      ),
      isSelectingForMove: false,
      moveSelectionStart: null,
      moveSelectionEnd: null,
    });
  },

  attemptPlaceMovedBuildings: (buildingsMap: Record<number, Building>) => {
    const {
      movingBuildings,
      moveAnchorPoint,
      moveCursorPosition,
      moveRotationDelta,
      placedBuildings,
      roadNetwork,
      cellSize,
    } = get();

    if (movingBuildings.length === 0 || !moveAnchorPoint || !moveCursorPosition)
      return;

    // Calculate the offset from anchor to cursor
    const cursorGridX = moveCursorPosition.x / cellSize;
    const cursorGridY = moveCursorPosition.y / cellSize;
    const offsetX = cursorGridX - moveAnchorPoint.gridX;
    const offsetY = cursorGridY - moveAnchorPoint.gridY;

    // Calculate new positions for all buildings
    const validBuildings: PlacedBuilding[] = [];
    const invalidBuildings: PlacedBuilding[] = [];

    for (const placedBuilding of movingBuildings) {
      const building = buildingsMap[placedBuilding.buildingId];
      if (!building) continue;

      // Calculate new rotation (wrap around properly)
      const totalRotation = placedBuilding.rotation + moveRotationDelta;
      const newRotation = (((totalRotation % 180) + 180) % 180) as Rotation;

      // Recalculate dimensions from original building size for the new rotation
      const { adjustedWidth, adjustedHeight } = getAdjustedSize(
        building.size.width,
        building.size.height,
        newRotation,
      );

      // Calculate new position
      const newGridX = Math.round(placedBuilding.gridX + offsetX);
      const newGridY = Math.round(placedBuilding.gridY + offsetY);

      // Create new building with updated position and dimensions
      const newBuilding: PlacedBuilding = {
        ...placedBuilding,
        gridX: newGridX,
        gridY: newGridY,
        width: adjustedWidth,
        height: adjustedHeight,
        rotation: newRotation,
      };

      // Check if valid placement (exclude all buildings being moved)
      const isValid = isValidPlacement(
        newGridX,
        newGridY,
        adjustedWidth,
        adjustedHeight,
        [...placedBuildings, ...validBuildings], // Check against existing + already validated buildings
        undefined, // Don't exclude anything
        newRotation,
        roadNetwork,
      );

      if (isValid) {
        validBuildings.push(newBuilding);
      } else {
        invalidBuildings.push(newBuilding);
      }
    }

    // If all buildings are valid, place them directly
    if (invalidBuildings.length === 0) {
      const {
        history,
        historyIndex,
        maxHistorySize,
        placedBuildings: currentPlaced,
        roadNetwork: currentRoads,
      } = get();

      // Push history before placing
      const snapshot = createSnapshot(
        [...currentPlaced, ...movingBuildings],
        currentRoads,
      );
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      set({
        placedBuildings: [...currentPlaced, ...validBuildings],
        movingBuildings: [],
        moveAnchorPoint: null,
        moveCursorPosition: null,
        moveRotationDelta: 0,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });
    } else {
      // Show confirmation dialog
      set({
        showMoveConfirmDialog: true,
        pendingMoveResult: { valid: validBuildings, invalid: invalidBuildings },
      });
    }
  },

  confirmMoveWithInvalid: () => {
    const {
      pendingMoveResult,
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
      movingBuildings,
    } = get();

    if (!pendingMoveResult) return;

    // Push history before placing (include original buildings being moved)
    const snapshot = createSnapshot(
      [...placedBuildings, ...movingBuildings],
      roadNetwork,
    );
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    // Place only valid buildings, invalid ones are discarded
    set({
      placedBuildings: [...placedBuildings, ...pendingMoveResult.valid],
      movingBuildings: [],
      moveAnchorPoint: null,
      moveCursorPosition: null,
      moveRotationDelta: 0,
      showMoveConfirmDialog: false,
      pendingMoveResult: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  cancelMoveConfirmDialog: () => {
    // Keep buildings in moving state, just close dialog
    set({
      showMoveConfirmDialog: false,
      pendingMoveResult: null,
    });
  },

  cancelMove: () => {
    const { movingBuildings, placedBuildings } = get();

    // Put buildings back to their original positions
    set({
      placedBuildings: [...placedBuildings, ...movingBuildings],
      movingBuildings: [],
      moveAnchorPoint: null,
      moveCursorPosition: null,
      moveRotationDelta: 0,
      isSelectingForMove: false,
      moveSelectionStart: null,
      moveSelectionEnd: null,
      showMoveConfirmDialog: false,
      pendingMoveResult: null,
    });
  },

  // Undo/Redo actions
  undo: () => {
    const { history, historyIndex, placedBuildings, roadNetwork } = get();
    if (historyIndex < 0) return;

    // Save current state to allow redo
    const currentSnapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = [...history];

    // If we're at the end, we need to save current state for redo
    if (historyIndex === history.length - 1) {
      newHistory.push(currentSnapshot);
    } else {
      // Replace the state at current position + 1 with current state
      newHistory[historyIndex + 1] = currentSnapshot;
    }

    // Restore the previous state
    const previousSnapshot = history[historyIndex];
    set({
      placedBuildings: previousSnapshot?.placedBuildings
        ? (JSON.parse(
            JSON.stringify(previousSnapshot.placedBuildings),
          ) as PlacedBuilding[])
        : [],
      roadNetwork: previousSnapshot?.roadNetwork
        ? cloneRoadNetwork(previousSnapshot.roadNetwork)
        : INITIAL_ROAD_NETWORK,
      history: newHistory,
      historyIndex: historyIndex - 1,
      selectedBuildingIds: [],
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    // Restore the next state
    const nextSnapshot = history[historyIndex + 2];
    if (!nextSnapshot) return;

    set({
      placedBuildings: JSON.parse(
        JSON.stringify(nextSnapshot.placedBuildings),
      ) as PlacedBuilding[],
      roadNetwork: cloneRoadNetwork(nextSnapshot.roadNetwork),
      historyIndex: historyIndex + 1,
      selectedBuildingIds: [],
      isDirty: true,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex >= 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  pushHistory: () => {
    const {
      placedBuildings,
      roadNetwork,
      history,
      historyIndex,
      maxHistorySize,
    } = get();
    const snapshot = createSnapshot(placedBuildings, roadNetwork);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  restoreFromLayoutData: (
    layoutData: LayoutData | null | undefined,
    buildingsMap: Record<number, Building>,
  ) => {
    if (!layoutData) {
      set({
        placedBuildings: [],
        roadNetwork: INITIAL_ROAD_NETWORK,
        history: [],
        historyIndex: -1,
        selectedBuildingIds: [],
        isDirty: false,
      });
      return;
    }

    // Restore buildings
    const placedBuildings: PlacedBuilding[] = [];
    for (const dbBuilding of layoutData.buildings) {
      const buildingDef = buildingsMap[dbBuilding.buildingId];
      if (!buildingDef) continue;

      // Calculate width/height based on rotation
      const { adjustedWidth, adjustedHeight } = getAdjustedSize(
        buildingDef.size.width,
        buildingDef.size.height,
        dbBuilding.rotation,
      );

      placedBuildings.push({
        id: dbBuilding.id,
        buildingId: dbBuilding.buildingId,
        gridX: dbBuilding.x,
        gridY: dbBuilding.y,
        width: adjustedWidth,
        height: adjustedHeight,
        rotation: dbBuilding.rotation,
        color: dbBuilding.color,
      });
    }

    // Restore road network
    const roadNetwork: RoadNetwork = {
      nodes: {},
      edges: {},
    };

    // First, create nodes (without connectedEdges - we'll populate those after)
    const nodesById: Record<string, RoadNode> = {};
    for (const dbNode of layoutData.roads) {
      nodesById[dbNode.id] = {
        id: dbNode.id,
        gridX: dbNode.x,
        gridY: dbNode.y,
        connectedEdges: [],
        junctionType: "endpoint",
      };
    }

    // Restore edges if they exist
    if (layoutData.roadEdges && layoutData.roadEdges.length > 0) {
      for (const dbEdge of layoutData.roadEdges) {
        // Convert center line from {x, y} to GridPoint
        const centerLine: GridPoint[] = dbEdge.centerLine.map((point) => ({
          gridX: point.x,
          gridY: point.y,
        }));

        // Calculate direction from the center line
        const firstPoint = centerLine[0];
        const lastPoint = centerLine[centerLine.length - 1];
        let direction = getDirectionFromDelta(
          lastPoint!.gridX - firstPoint!.gridX,
          lastPoint!.gridY - firstPoint!.gridY,
        );

        // Fallback to "E" if direction can't be determined
        direction ??= "E";

        // Calculate polygon offsets
        const polygonOffsets = computeEdgePolygonOffsets(centerLine, direction);

        const edge: RoadEdge = {
          id: dbEdge.id,
          roadType: dbEdge.roadType,
          startNodeId: dbEdge.startNodeId,
          endNodeId: dbEdge.endNodeId,
          centerLine,
          direction,
          polygonOffsets,
        };

        roadNetwork.edges[edge.id] = edge;

        // Update connected edges for start and end nodes
        const startNode = nodesById[dbEdge.startNodeId];
        const endNode = nodesById[dbEdge.endNodeId];

        if (startNode) {
          startNode.connectedEdges.push(edge.id);
        }
        if (endNode) {
          endNode.connectedEdges.push(edge.id);
        }
      }
    }

    // Calculate junction types for all nodes
    for (const node of Object.values(nodesById)) {
      node.junctionType = determineJunctionType(node.connectedEdges.length);
      roadNetwork.nodes[node.id] = node;
    }

    set({
      placedBuildings,
      roadNetwork,
      history: [],
      historyIndex: -1,
      selectedBuildingIds: [],
      isDirty: false,
    });
  },

  markClean: () => {
    set({ isDirty: false });
  },
}));
