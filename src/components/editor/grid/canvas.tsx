import type { PlacedBuilding, RoadEdge, Rotation } from "@/types/editor";
import type { FederatedPointerEvent, Texture } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
} from "pixi.js";

import { useGameData } from "@/components/providers/game-data-provider";
import {
  BACKGROUND_COLOR,
  DELETE_HIGHLIGHT_COLOR,
  GRID_COLOR_MAJOR,
  MAX_ZOOM,
  MIN_ZOOM,
  MOVE_HIGHLIGHT_COLOR,
  ROAD_COLORS,
  ROAD_HALF_WIDTH,
  SELECTION_COLOR,
  SUB_TILE_COLOR,
} from "@/lib/constants";
import {
  calculateSnappedPosition,
  getAdjustedSize,
  getBuildingAtPosition,
  getBulkPreviewBuildings,
  isDiagonalRotation,
  isValidPlacement,
} from "@/lib/editor";
import {
  computeEdgePolygon,
  computeJunctionPolygon,
  computePreviewEdgePolygon,
  getRoadEdgeAtPosition,
} from "@/lib/editor/road";
import { useEditorStore } from "@/stores/editor";

export function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gridGraphicsRef = useRef<Graphics | null>(null);
  const buildingsGraphicsRef = useRef<Graphics | null>(null);
  const ghostGraphicsRef = useRef<Graphics | null>(null);
  const roadsGraphicsRef = useRef<Graphics | null>(null);
  const roadGhostGraphicsRef = useRef<Graphics | null>(null);
  const buildingsSpritesContainerRef = useRef<Container | null>(null);
  const ghostSpritesContainerRef = useRef<Container | null>(null);
  const textureCache = useRef<Map<string, Texture>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // Panning state
  const isPanningRef = useRef(false);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });
  const rightClickStartPosRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);

  // Hover state for delete/move modes
  const hoveredBuildingIdRef = useRef<string | null>(null);
  const hoveredRoadSegmentIdRef = useRef<string | null>(null);
  const hoveredMoveBuildingIdRef = useRef<string | null>(null);

  // Move mode click tracking (to differentiate click vs drag)
  const moveClickStartRef = useRef<{
    x: number;
    y: number;
    buildingId: string | null;
  } | null>(null);
  const didDragForMoveRef = useRef(false);

  // Get game data from context
  const { buildingsMap } = useGameData();

  // Get store values
  const mode = useEditorStore((state) => state.mode);
  const zoom = useEditorStore((state) => state.zoom);
  const panX = useEditorStore((state) => state.panX);
  const panY = useEditorStore((state) => state.panY);
  const cellSize = useEditorStore((state) => state.cellSize);
  const selectedBuilding = useEditorStore((state) => state.selectedBuilding);
  const placedBuildings = useEditorStore((state) => state.placedBuildings);
  const selectedBuildingIds = useEditorStore(
    (state) => state.selectedBuildingIds,
  );
  const ghostPosition = useEditorStore((state) => state.ghostPosition);
  const ghostRotation = useEditorStore((state) => state.ghostRotation);
  const bulkStartPosition = useEditorStore((state) => state.bulkStartPosition);
  const bulkEndPosition = useEditorStore((state) => state.bulkEndPosition);
  const isBulkPlacing = useEditorStore((state) => state.isBulkPlacing);

  // Road state
  const selectedRoadType = useEditorStore((state) => state.selectedRoadType);
  const roadNetwork = useEditorStore((state) => state.roadNetwork);
  const roadStartPosition = useEditorStore((state) => state.roadStartPosition);
  const isPlacingRoad = useEditorStore((state) => state.isPlacingRoad);
  const roadPreview = useEditorStore((state) => state.roadPreview);

  // Move mode state
  const movingBuildings = useEditorStore((state) => state.movingBuildings);
  const moveAnchorPoint = useEditorStore((state) => state.moveAnchorPoint);
  const moveCursorPosition = useEditorStore(
    (state) => state.moveCursorPosition,
  );
  const moveRotationDelta = useEditorStore((state) => state.moveRotationDelta);
  const isSelectingForMove = useEditorStore(
    (state) => state.isSelectingForMove,
  );
  const moveSelectionStart = useEditorStore(
    (state) => state.moveSelectionStart,
  );
  const moveSelectionEnd = useEditorStore((state) => state.moveSelectionEnd);

  // Actions
  const setZoom = useEditorStore((state) => state.setZoom);
  const adjustPan = useEditorStore((state) => state.adjustPan);
  const setGhostPosition = useEditorStore((state) => state.setGhostPosition);
  const startBulkPlacement = useEditorStore(
    (state) => state.startBulkPlacement,
  );
  const updateBulkPlacement = useEditorStore(
    (state) => state.updateBulkPlacement,
  );
  const finishBulkPlacement = useEditorStore(
    (state) => state.finishBulkPlacement,
  );
  const toggleBuildingSelection = useEditorStore(
    (state) => state.toggleBuildingSelection,
  );
  const removeBuilding = useEditorStore((state) => state.removeBuilding);
  const setMode = useEditorStore((state) => state.setMode);
  const incrementZoom = useEditorStore((state) => state.incrementZoom);

  // Road actions
  const startRoadPlacement = useEditorStore(
    (state) => state.startRoadPlacement,
  );
  const updateRoadPlacement = useEditorStore(
    (state) => state.updateRoadPlacement,
  );
  const finishRoadPlacement = useEditorStore(
    (state) => state.finishRoadPlacement,
  );
  const cancelRoadPlacement = useEditorStore(
    (state) => state.cancelRoadPlacement,
  );
  const removeRoadEdge = useEditorStore((state) => state.removeRoadEdge);

  // Move mode actions
  const pickUpBuilding = useEditorStore((state) => state.pickUpBuilding);
  const updateMoveCursor = useEditorStore((state) => state.updateMoveCursor);
  const startMoveSelection = useEditorStore(
    (state) => state.startMoveSelection,
  );
  const updateMoveSelection = useEditorStore(
    (state) => state.updateMoveSelection,
  );
  const finishMoveSelection = useEditorStore(
    (state) => state.finishMoveSelection,
  );
  const attemptPlaceMovedBuildings = useEditorStore(
    (state) => state.attemptPlaceMovedBuildings,
  );
  const cancelMove = useEditorStore((state) => state.cancelMove);

  // Load texture from icon path
  const loadTexture = useCallback(
    async (iconPath: string): Promise<Texture | null> => {
      if (!iconPath) return null;

      // Check cache first
      const cached = textureCache.current.get(iconPath);
      if (cached) return cached;

      try {
        const texture = await Assets.load<Texture>(iconPath);
        textureCache.current.set(iconPath, texture);
        return texture;
      } catch (error) {
        console.warn(`Failed to load texture: ${iconPath}`, error);
        return null;
      }
    },
    [],
  );

  // Get texture synchronously (returns cached or null)
  const getTexture = useCallback((iconPath: string): Texture | null => {
    if (!iconPath) return null;
    return textureCache.current.get(iconPath) ?? null;
  }, []);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const app = appRef.current;
      if (!app) return { x: 0, y: 0 };

      const centerX = app.screen.width / 2;
      const centerY = app.screen.height / 2;

      return {
        x: (screenX - centerX) / zoom - panX,
        y: (screenY - centerY) / zoom - panY,
      };
    },
    [zoom, panX, panY],
  );

  // Draw the infinite grid with culling - 4 triangles per tile (only diagonals)
  const drawGrid = useCallback(() => {
    const graphics = gridGraphicsRef.current;
    const app = appRef.current;
    if (!graphics || !app) return;

    graphics.clear();

    const scaledCellSize = cellSize * zoom;

    // Calculate visible area with some padding for smooth panning
    const padding = scaledCellSize * 2;
    const viewWidth = app.screen.width + padding * 2;
    const viewHeight = app.screen.height + padding * 2;

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    // Calculate grid offset based on pan
    const offsetX = (panX * zoom) % scaledCellSize;
    const offsetY = (panY * zoom) % scaledCellSize;

    // Calculate the starting position for grid lines
    const startX = -padding + offsetX + (centerX % scaledCellSize);
    const startY = -padding + offsetY + (centerY % scaledCellSize);

    // Draw sub-tile diagonal lines only (4 triangles per cell)
    for (let x = startX; x < viewWidth; x += scaledCellSize) {
      for (let y = startY; y < viewHeight; y += scaledCellSize) {
        // Draw diagonals within each cell to create 4 triangles
        graphics.moveTo(x, y);
        graphics.lineTo(x + scaledCellSize, y + scaledCellSize);
        graphics.moveTo(x + scaledCellSize, y);
        graphics.lineTo(x, y + scaledCellSize);
      }
    }
    graphics.stroke({ width: 1, color: SUB_TILE_COLOR, alpha: 0.6 });

    // Draw major grid lines (every cell)
    for (let x = startX; x < viewWidth; x += scaledCellSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, app.screen.height);
    }

    for (let y = startY; y < viewHeight; y += scaledCellSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(app.screen.width, y);
    }
    graphics.stroke({ width: 2, color: GRID_COLOR_MAJOR, alpha: 0.9 });
  }, [zoom, panX, panY, cellSize]);

  // Convert grid coordinates to screen coordinates
  const gridToScreen = useCallback(
    (gridX: number, gridY: number) => {
      const app = appRef.current;
      if (!app) return { x: 0, y: 0 };

      const centerX = app.screen.width / 2;
      const centerY = app.screen.height / 2;

      return {
        x: centerX + (gridX * cellSize + panX) * zoom,
        y: centerY + (gridY * cellSize + panY) * zoom,
      };
    },
    [zoom, panX, panY, cellSize],
  );

  // Draw a building (rectangle at any rotation)
  const drawBuilding = useCallback(
    (
      graphics: Graphics,
      gridX: number,
      gridY: number,
      width: number,
      height: number,
      rotation: Rotation,
      fillColor: number,
      fillAlpha: number,
      strokeColor: number,
      strokeAlpha: number,
      strokeWidth = 2,
    ) => {
      const scaledCellSize = cellSize * zoom;
      const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);
      const screenWidth = width * scaledCellSize;
      const screenHeight = height * scaledCellSize;

      if (isDiagonalRotation(rotation)) {
        // Draw a ROTATED RECTANGLE where edges follow the 45° diagonal grid lines.
        //
        // For a 45° CLOCKWISE rotation (visually on screen where +y is down):
        // Using rotation matrix: x' = x*cos - y*sin, y' = x*sin + y*cos (counter-clockwise in math)
        // This appears CLOCKWISE on screen because +y points downward.
        //
        // After rotating a w×h rectangle 45° clockwise:
        //   Original TL → Top:    ((h-w)/(2√2), -(w+h)/(2√2))
        //   Original TR → Right:  ((w+h)/(2√2), (w-h)/(2√2))
        //   Original BR → Bottom: ((w-h)/(2√2), (w+h)/(2√2))
        //   Original BL → Left:   (-(w+h)/(2√2), (h-w)/(2√2))
        //
        // With W = adjusted width, H = adjusted height (both scaled by √2):
        // Bounding box = (W+H)/2 × (W+H)/2 grid units (always square)

        const W = width;
        const H = height;
        const boundingBoxSize = (W + H) / 2; // in grid units

        // screenX, screenY is top-left of bounding box
        const cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
        const cy = screenY + (boundingBoxSize * scaledCellSize) / 2;

        // Scale factor: since W,H are already scaled by √2, we use 1/4
        const scale = scaledCellSize / 4;

        // Base corners for 45° clockwise rotation (drawing order: top → right → bottom → left)
        let corners = [
          { x: cx + (H - W) * scale, y: cy - (W + H) * scale }, // Top (from original TL)
          { x: cx + (W + H) * scale, y: cy + (W - H) * scale }, // Right (from original TR)
          { x: cx + (W - H) * scale, y: cy + (W + H) * scale }, // Bottom (from original BR)
          { x: cx - (W + H) * scale, y: cy + (H - W) * scale }, // Left (from original BL)
        ];

        // Rotate corners around center for 135° (90° more than 45°)
        if (rotation !== 45) {
          const extraRotation = ((rotation - 45) * Math.PI) / 180;
          corners = corners.map((corner) => {
            const dx = corner.x - cx;
            const dy = corner.y - cy;
            const cos = Math.cos(extraRotation);
            const sin = Math.sin(extraRotation);
            return {
              x: cx + dx * cos - dy * sin,
              y: cy + dx * sin + dy * cos,
            };
          });
        }

        graphics.poly([
          corners[0]!.x,
          corners[0]!.y,
          corners[1]!.x,
          corners[1]!.y,
          corners[2]!.x,
          corners[2]!.y,
          corners[3]!.x,
          corners[3]!.y,
        ]);
        graphics.fill({ color: fillColor, alpha: fillAlpha });
        graphics.stroke({
          width: strokeWidth,
          color: strokeColor,
          alpha: strokeAlpha,
        });
      } else {
        // Axis-aligned rotations (0°, 90°)
        graphics.rect(screenX, screenY, screenWidth, screenHeight);
        graphics.fill({ color: fillColor, alpha: fillAlpha });
        graphics.stroke({
          width: strokeWidth,
          color: strokeColor,
          alpha: strokeAlpha,
        });
      }
    },
    [cellSize, zoom, gridToScreen],
  );

  // Draw rotation indicator on a building (small arrow showing direction)
  const drawRotationIndicator = useCallback(
    (
      graphics: Graphics,
      gridX: number,
      gridY: number,
      width: number,
      height: number,
      rotation: Rotation,
    ) => {
      // Don't draw indicator for 0° rotation
      if (rotation === 0) return;

      const scaledCellSize = cellSize * zoom;
      const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);

      // Calculate center of building
      let cx: number, cy: number;
      if (isDiagonalRotation(rotation)) {
        const boundingBoxSize = (width + height) / 2;
        cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
        cy = screenY + (boundingBoxSize * scaledCellSize) / 2;
      } else {
        cx = screenX + (width * scaledCellSize) / 2;
        cy = screenY + (height * scaledCellSize) / 2;
      }

      // Draw rotation angle indicator (small arrow)
      const arrowLength = Math.min(width, height) * scaledCellSize * 0.25;
      const arrowHeadSize = arrowLength * 0.3;
      const angleRad = (rotation * Math.PI) / 180;

      // Arrow line endpoint
      const endX = cx + Math.cos(angleRad - Math.PI / 2) * arrowLength;
      const endY = cy + Math.sin(angleRad - Math.PI / 2) * arrowLength;

      // Arrow head points
      const headAngle1 = angleRad - Math.PI / 2 + Math.PI * 0.8;
      const headAngle2 = angleRad - Math.PI / 2 - Math.PI * 0.8;
      const head1X = endX + Math.cos(headAngle1) * arrowHeadSize;
      const head1Y = endY + Math.sin(headAngle1) * arrowHeadSize;
      const head2X = endX + Math.cos(headAngle2) * arrowHeadSize;
      const head2Y = endY + Math.sin(headAngle2) * arrowHeadSize;

      // Draw arrow line
      graphics.moveTo(cx, cy);
      graphics.lineTo(endX, endY);
      graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });

      // Draw arrow head
      graphics.moveTo(endX, endY);
      graphics.lineTo(head1X, head1Y);
      graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
      graphics.moveTo(endX, endY);
      graphics.lineTo(head2X, head2Y);
      graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });

      // Draw small circle with rotation angle text would require Text objects
      // Instead, draw a small filled circle at arrow tip as indicator
      graphics.circle(endX, endY, 3);
      graphics.fill({ color: 0xffffff, alpha: 0.9 });
    },
    [cellSize, zoom, gridToScreen],
  );

  // Draw a road edge as a filled polygon (graph-based rendering)
  const drawRoadEdge = useCallback(
    (graphics: Graphics, edge: RoadEdge, isHovered = false, alpha = 1.0) => {
      const colors = ROAD_COLORS[edge.roadType];
      const fillColor = isHovered ? DELETE_HIGHLIGHT_COLOR : colors.fill;
      const borderColor = isHovered ? 0xff6666 : colors.border;

      if (edge.centerLine.length < 2) return;

      // Compute polygon vertices in screen coordinates
      const polygon = computeEdgePolygon(edge, cellSize, (gx, gy) => {
        // gridToScreen expects grid coordinates, but polygon points are in grid units with 0.5 offset already applied
        const app = appRef.current;
        if (!app) return { x: 0, y: 0 };
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2;
        return {
          x: centerX + (gx * cellSize + panX) * zoom,
          y: centerY + (gy * cellSize + panY) * zoom,
        };
      });

      if (polygon.length < 3) return;

      // Draw filled polygon
      const flatPoints: number[] = [];
      for (const p of polygon) {
        flatPoints.push(p.x, p.y);
      }

      graphics.poly(flatPoints);
      graphics.fill({ color: fillColor, alpha: alpha });
      graphics.stroke({ width: 2, color: borderColor, alpha: alpha });
    },
    [cellSize, zoom, panX, panY],
  );

  // Draw junction nodes where road edges meet (fills gaps at intersections)
  const drawRoadJunctions = useCallback(
    (graphics: Graphics, alpha = 1.0) => {
      const scaledCellSize = cellSize * zoom;

      for (const node of Object.values(roadNetwork.nodes)) {
        // Only draw junction if multiple edges connect here
        if (node.connectedEdges.length >= 2) {
          const { x, y } = gridToScreen(node.gridX + 0.5, node.gridY + 0.5);

          // Get the road type from any connected edge for color
          const edgeId = node.connectedEdges[0];
          const edge = roadNetwork.edges[edgeId!];
          if (!edge) continue;

          const colors = ROAD_COLORS[edge.roadType];

          // Compute junction polygon
          const junctionPolygon = computeJunctionPolygon(
            node,
            roadNetwork,
            scaledCellSize,
            (gx, gy) => {
              const app = appRef.current;
              if (!app) return { x: 0, y: 0 };
              const centerX = app.screen.width / 2;
              const centerY = app.screen.height / 2;
              return {
                x: centerX + (gx * cellSize + panX) * zoom,
                y: centerY + (gy * cellSize + panY) * zoom,
              };
            },
          );

          if (junctionPolygon && junctionPolygon.length >= 3) {
            // Draw junction polygon with fill and border
            const flatPoints: number[] = [];
            for (const p of junctionPolygon) {
              flatPoints.push(p.x, p.y);
            }
            graphics.poly(flatPoints);
            graphics.fill({ color: colors.fill, alpha: alpha });
            // Don't stroke junction - it should blend seamlessly with edges
          } else {
            // Fallback: draw a filled circle at the junction
            const junctionRadius = ROAD_HALF_WIDTH * scaledCellSize * 1.4;
            graphics.circle(x, y, junctionRadius);
            graphics.fill({ color: colors.fill, alpha: alpha });
          }
        }
      }
    },
    [cellSize, zoom, panX, panY, gridToScreen, roadNetwork],
  );

  // Draw all placed roads (graph-based: edges as polygons, then junctions)
  const drawRoads = useCallback(() => {
    const graphics = roadsGraphicsRef.current;
    if (!graphics) return;

    graphics.clear();

    // First pass: draw all road edges as filled polygons
    for (const edge of Object.values(roadNetwork.edges)) {
      const isHovered =
        hoveredRoadSegmentIdRef.current === edge.id && mode === "delete";
      drawRoadEdge(graphics, edge, isHovered);
    }

    // Second pass: draw junction nodes on top to fill gaps
    drawRoadJunctions(graphics);
  }, [roadNetwork, mode, drawRoadEdge, drawRoadJunctions]);

  // Draw road placement preview (graph-based, using filled polygons)
  const drawRoadGhost = useCallback(() => {
    const graphics = roadGhostGraphicsRef.current;
    if (!graphics) return;

    graphics.clear();

    if (mode !== "road" || !selectedRoadType || !roadPreview) return;

    const colors = ROAD_COLORS[selectedRoadType];
    const scaledCellSize = cellSize * zoom;

    // Helper to convert grid to screen for polygon computation
    const gridToScreenForPolygon = (gx: number, gy: number) => {
      const app = appRef.current;
      if (!app) return { x: 0, y: 0 };
      const centerX = app.screen.width / 2;
      const centerY = app.screen.height / 2;
      return {
        x: centerX + (gx * cellSize + panX) * zoom,
        y: centerY + (gy * cellSize + panY) * zoom,
      };
    };

    // Draw preview edges as filled polygons
    for (const edge of roadPreview.edges) {
      const fillColor = edge.isValid ? colors.fill : 0xff4444;
      const borderColor = edge.isValid ? colors.border : 0xff6666;

      // Compute polygon for preview edge
      const polygon = computePreviewEdgePolygon(
        edge,
        cellSize,
        gridToScreenForPolygon,
      );

      if (polygon.length >= 3) {
        const flatPoints: number[] = [];
        for (const p of polygon) {
          flatPoints.push(p.x, p.y);
        }

        graphics.poly(flatPoints);
        graphics.fill({ color: fillColor, alpha: 0.5 });
        graphics.stroke({ width: 2, color: borderColor, alpha: 0.7 });
      }
    }

    // Draw start and end markers
    if (roadStartPosition) {
      const { x: startX, y: startY } = gridToScreen(
        roadStartPosition.gridX + 0.5,
        roadStartPosition.gridY + 0.5,
      );

      // Start marker (filled circle)
      graphics.circle(startX, startY, scaledCellSize * 0.25);
      graphics.fill({ color: 0x4a9eff, alpha: 0.8 });
      graphics.stroke({ width: 3, color: 0x2a7edf, alpha: 1 });
    }

    // Draw end marker if different from start
    if (
      roadPreview.waypoints.length > 1 &&
      roadStartPosition &&
      (roadPreview.waypoints[roadPreview.waypoints.length - 1]!.gridX !==
        roadStartPosition.gridX ||
        roadPreview.waypoints[roadPreview.waypoints.length - 1]!.gridY !==
          roadStartPosition.gridY)
    ) {
      const endWp = roadPreview.waypoints[roadPreview.waypoints.length - 1];
      const { x: endX, y: endY } = gridToScreen(
        endWp!.gridX + 0.5,
        endWp!.gridY + 0.5,
      );

      // End marker (filled circle)
      graphics.circle(endX, endY, scaledCellSize * 0.25);
      graphics.fill({ color: 0x4a9eff, alpha: 0.8 });
      graphics.stroke({ width: 3, color: 0x2a7edf, alpha: 1 });
    }
  }, [
    mode,
    selectedRoadType,
    roadPreview,
    roadStartPosition,
    cellSize,
    zoom,
    panX,
    panY,
    gridToScreen,
  ]);

  // Calculate icon position and size for a building
  // originalWidth/Height are the building's base dimensions (before rotation adjustment)
  const getIconTransform = useCallback(
    (
      gridX: number,
      gridY: number,
      width: number,
      height: number,
      rotation: Rotation,
      originalWidth: number,
      originalHeight: number,
    ) => {
      const scaledCellSize = cellSize * zoom;

      // Calculate center of building (regardless of rotation)
      let cx: number, cy: number;
      if (isDiagonalRotation(rotation)) {
        // For diagonal rotations, width/height are adjusted (scaled by √2)
        // The bounding box is a square of size (width + height) / 2
        const boundingBoxSize = (width + height) / 2;
        const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);
        cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
        cy = screenY + (boundingBoxSize * scaledCellSize) / 2;
      } else {
        const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);
        cx = screenX + (width * scaledCellSize) / 2;
        cy = screenY + (height * scaledCellSize) / 2;
      }

      // Icon size should fit within the building, based on ORIGINAL dimensions
      // This ensures the icon stays the same size regardless of rotation
      // Use 70% of the smaller original dimension for padding
      const minDim = Math.min(originalWidth, originalHeight);
      const iconSize = minDim * scaledCellSize * 0.7;

      return { cx, cy, iconSize };
    },
    [cellSize, zoom, gridToScreen],
  );

  // Draw placed buildings
  const drawBuildings = useCallback(() => {
    const graphics = buildingsGraphicsRef.current;
    const spritesContainer = buildingsSpritesContainerRef.current;
    const app = appRef.current;
    if (!graphics || !app) return;

    graphics.clear();

    // Clear existing sprites
    if (spritesContainer) {
      spritesContainer.removeChildren();
    }

    for (const placedBuilding of placedBuildings) {
      const isSelected = selectedBuildingIds.includes(placedBuilding.id);
      const isHoveredDelete =
        hoveredBuildingIdRef.current === placedBuilding.id && mode === "delete";
      const isHoveredMove =
        hoveredMoveBuildingIdRef.current === placedBuilding.id &&
        mode === "move" &&
        movingBuildings.length === 0;

      let strokeColor = 0xffffff;
      let strokeWidth = 2;
      let strokeAlpha = 0.4;

      if (isSelected) {
        strokeColor = SELECTION_COLOR;
        strokeWidth = 3;
        strokeAlpha = 1;
      } else if (isHoveredDelete) {
        strokeColor = DELETE_HIGHLIGHT_COLOR;
        strokeWidth = 3;
        strokeAlpha = 1;
      } else if (isHoveredMove) {
        strokeColor = MOVE_HIGHLIGHT_COLOR;
        strokeWidth = 3;
        strokeAlpha = 1;
      }

      drawBuilding(
        graphics,
        placedBuilding.gridX,
        placedBuilding.gridY,
        placedBuilding.width,
        placedBuilding.height,
        placedBuilding.rotation,
        placedBuilding.color,
        0.85,
        strokeColor,
        strokeAlpha,
        strokeWidth,
      );

      // Draw rotation indicator
      drawRotationIndicator(
        graphics,
        placedBuilding.gridX,
        placedBuilding.gridY,
        placedBuilding.width,
        placedBuilding.height,
        placedBuilding.rotation,
      );

      // Draw icon sprite if available
      if (spritesContainer) {
        const building = buildingsMap[placedBuilding.buildingId];
        if (building?.icon) {
          const texture = getTexture(building.icon);
          if (texture) {
            const sprite = new Sprite(texture);
            const { cx, cy, iconSize } = getIconTransform(
              placedBuilding.gridX,
              placedBuilding.gridY,
              placedBuilding.width,
              placedBuilding.height,
              placedBuilding.rotation,
              building.size.width,
              building.size.height,
            );

            // Position sprite centered on the building
            sprite.anchor.set(0.5, 0.5);
            sprite.x = cx;
            sprite.y = cy;

            // Scale to fit within the building
            const scale = iconSize / Math.max(texture.width, texture.height);
            sprite.scale.set(scale);

            // Icon should NOT rotate (always 0 degrees)
            sprite.rotation = 0;

            spritesContainer.addChild(sprite);
          } else {
            // Try to load the texture asynchronously
            void loadTexture(building.icon).then((loadedTexture) => {
              if (loadedTexture) {
                // Trigger a redraw after texture loads
                // eslint-disable-next-line react-hooks/immutability
                drawBuildings();
              }
            });
          }
        }
      }
    }

    // Draw move mode ghosts (buildings being moved at their new positions)
    if (movingBuildings.length > 0 && moveAnchorPoint && moveCursorPosition) {
      // Calculate the offset from anchor to cursor
      const cursorGridX = moveCursorPosition.x / cellSize;
      const cursorGridY = moveCursorPosition.y / cellSize;
      const offsetX = cursorGridX - moveAnchorPoint.gridX;
      const offsetY = cursorGridY - moveAnchorPoint.gridY;

      // Track already placed buildings for validation
      const validatedBuildings: PlacedBuilding[] = [];

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

        // Check if the new position is valid
        const isValid = isValidPlacement(
          newGridX,
          newGridY,
          adjustedWidth,
          adjustedHeight,
          [...placedBuildings, ...validatedBuildings],
          undefined,
          newRotation,
          roadNetwork,
        );

        if (isValid) {
          validatedBuildings.push({
            ...placedBuilding,
            gridX: newGridX,
            gridY: newGridY,
            width: adjustedWidth,
            height: adjustedHeight,
            rotation: newRotation,
          });
        }

        const ghostColor = isValid ? building.color : 0xff4444;
        const strokeColor = isValid ? MOVE_HIGHLIGHT_COLOR : 0xff6666;

        drawBuilding(
          graphics,
          newGridX,
          newGridY,
          adjustedWidth,
          adjustedHeight,
          newRotation,
          ghostColor,
          0.6,
          strokeColor,
          1,
          3,
        );

        // Draw icon for the move ghost
        if (spritesContainer && building.icon) {
          const texture = getTexture(building.icon);
          if (texture) {
            const sprite = new Sprite(texture);
            const { cx, cy, iconSize } = getIconTransform(
              newGridX,
              newGridY,
              adjustedWidth,
              adjustedHeight,
              newRotation,
              building.size.width,
              building.size.height,
            );

            sprite.anchor.set(0.5, 0.5);
            sprite.x = cx;
            sprite.y = cy;

            const scale = iconSize / Math.max(texture.width, texture.height);
            sprite.scale.set(scale);
            sprite.rotation = 0;
            sprite.alpha = 0.7;

            spritesContainer.addChild(sprite);
          }
        }
      }
    }

    // Draw move selection box
    if (isSelectingForMove && moveSelectionStart && moveSelectionEnd) {
      const { x: startX, y: startY } = gridToScreen(
        moveSelectionStart.gridX,
        moveSelectionStart.gridY,
      );
      const { x: endX, y: endY } = gridToScreen(
        moveSelectionEnd.gridX,
        moveSelectionEnd.gridY,
      );

      const minX = Math.min(startX, endX);
      const minY = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      graphics.rect(minX, minY, width, height);
      graphics.fill({ color: MOVE_HIGHLIGHT_COLOR, alpha: 0.15 });
      graphics.stroke({ width: 2, color: MOVE_HIGHLIGHT_COLOR, alpha: 0.8 });
    }
  }, [
    placedBuildings,
    selectedBuildingIds,
    mode,
    movingBuildings,
    moveAnchorPoint,
    moveCursorPosition,
    moveRotationDelta,
    isSelectingForMove,
    moveSelectionStart,
    moveSelectionEnd,
    cellSize,
    roadNetwork,
    drawBuilding,
    drawRotationIndicator,
    gridToScreen,
    buildingsMap,
    getTexture,
    loadTexture,
    getIconTransform,
  ]);

  // Draw ghost building preview (single or bulk)
  const drawGhost = useCallback(() => {
    const graphics = ghostGraphicsRef.current;
    const spritesContainer = ghostSpritesContainerRef.current;
    const app = appRef.current;
    if (!graphics || !app) return;

    graphics.clear();

    // Clear existing ghost sprites
    if (spritesContainer) {
      spritesContainer.removeChildren();
    }

    if (mode !== "place" || !selectedBuilding) return;

    const buildingDef = buildingsMap[selectedBuilding];
    if (!buildingDef) return;

    const { adjustedWidth, adjustedHeight } = getAdjustedSize(
      buildingDef.size.width,
      buildingDef.size.height,
      ghostRotation,
    );

    // Helper to draw ghost icon sprite
    const drawGhostIcon = (
      gridX: number,
      gridY: number,
      width: number,
      height: number,
      alpha = 0.7,
    ) => {
      if (!spritesContainer || !buildingDef.icon) return;

      const texture = getTexture(buildingDef.icon);
      if (texture) {
        const sprite = new Sprite(texture);
        const { cx, cy, iconSize } = getIconTransform(
          gridX,
          gridY,
          width,
          height,
          ghostRotation,
          buildingDef.size.width,
          buildingDef.size.height,
        );

        sprite.anchor.set(0.5, 0.5);
        sprite.x = cx;
        sprite.y = cy;

        const scale = iconSize / Math.max(texture.width, texture.height);
        sprite.scale.set(scale);
        sprite.rotation = 0;
        sprite.alpha = alpha;

        spritesContainer.addChild(sprite);
      } else {
        // Try to load the texture asynchronously
        void loadTexture(buildingDef.icon);
      }
    };

    if (isBulkPlacing && bulkStartPosition && bulkEndPosition) {
      const previewBuildings = getBulkPreviewBuildings(
        bulkStartPosition,
        bulkEndPosition,
        adjustedWidth,
        adjustedHeight,
        placedBuildings,
        ghostRotation,
        roadNetwork,
      );

      for (const preview of previewBuildings) {
        const color = preview.isValid ? buildingDef.color : 0xff4444;
        const strokeColor = preview.isValid ? 0xffffff : 0xff6666;

        drawBuilding(
          graphics,
          preview.gridX,
          preview.gridY,
          preview.width,
          preview.height,
          ghostRotation,
          color,
          0.5,
          strokeColor,
          0.8,
        );

        // Draw ghost icon for bulk preview
        drawGhostIcon(
          preview.gridX,
          preview.gridY,
          preview.width,
          preview.height,
          0.5,
        );
      }
    } else if (ghostPosition) {
      const { gridX, gridY } = calculateSnappedPosition(
        ghostPosition.x,
        ghostPosition.y,
        cellSize,
        buildingDef.size.width,
        buildingDef.size.height,
        ghostRotation,
      );

      const isValid = isValidPlacement(
        gridX,
        gridY,
        adjustedWidth,
        adjustedHeight,
        placedBuildings,
        undefined, // excludeId
        ghostRotation,
        roadNetwork, // Check for road collisions
      );
      const color = isValid ? buildingDef.color : 0xff4444;
      const strokeColor = isValid ? 0xffffff : 0xff6666;

      drawBuilding(
        graphics,
        gridX,
        gridY,
        adjustedWidth,
        adjustedHeight,
        ghostRotation,
        color,
        0.5,
        strokeColor,
        0.8,
      );

      // Draw ghost icon
      drawGhostIcon(gridX, gridY, adjustedWidth, adjustedHeight, 0.6);
    }
  }, [
    mode,
    selectedBuilding,
    ghostPosition,
    ghostRotation,
    placedBuildings,
    roadNetwork,
    isBulkPlacing,
    bulkStartPosition,
    bulkEndPosition,
    cellSize,
    drawBuilding,
    buildingsMap,
    getTexture,
    loadTexture,
    getIconTransform,
  ]);

  // Handle pointer move
  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      const app = appRef.current;
      if (!app) return;

      const world = screenToWorld(event.globalX, event.globalY);

      // Handle panning
      if (isPanningRef.current) {
        const deltaX = (event.globalX - lastPanPositionRef.current.x) / zoom;
        const deltaY = (event.globalY - lastPanPositionRef.current.y) / zoom;

        // Track if we've actually moved (to differentiate from a simple right-click)
        const totalDeltaX = Math.abs(
          event.globalX - rightClickStartPosRef.current.x,
        );
        const totalDeltaY = Math.abs(
          event.globalY - rightClickStartPosRef.current.y,
        );
        if (totalDeltaX > 5 || totalDeltaY > 5) {
          didPanRef.current = true;
        }

        adjustPan(deltaX, deltaY);
        lastPanPositionRef.current = { x: event.globalX, y: event.globalY };
        return;
      }

      // Update hover state for delete mode
      if (mode === "delete") {
        // Check buildings
        const building = getBuildingAtPosition(
          world.x,
          world.y,
          cellSize,
          placedBuildings,
        );
        const newHoveredId = building?.id ?? null;
        if (newHoveredId !== hoveredBuildingIdRef.current) {
          hoveredBuildingIdRef.current = newHoveredId;
          drawBuildings();
        }

        // Check roads
        const roadEdge = getRoadEdgeAtPosition(
          world.x,
          world.y,
          cellSize,
          roadNetwork,
        );
        const newHoveredRoadId = roadEdge?.id ?? null;
        if (newHoveredRoadId !== hoveredRoadSegmentIdRef.current) {
          hoveredRoadSegmentIdRef.current = newHoveredRoadId;
          drawRoads();
        }
      }

      // Update hover state for move mode (when not already moving buildings and not starting a drag)
      if (
        mode === "move" &&
        movingBuildings.length === 0 &&
        !isSelectingForMove &&
        !moveClickStartRef.current
      ) {
        const building = getBuildingAtPosition(
          world.x,
          world.y,
          cellSize,
          placedBuildings,
        );
        const newHoveredId = building?.id ?? null;
        if (newHoveredId !== hoveredMoveBuildingIdRef.current) {
          hoveredMoveBuildingIdRef.current = newHoveredId;
          drawBuildings();
        }
      }

      // Check if we should start selection mode (clicked and dragged enough)
      if (
        mode === "move" &&
        moveClickStartRef.current &&
        !isSelectingForMove &&
        movingBuildings.length === 0
      ) {
        const dx = Math.abs(event.globalX - moveClickStartRef.current.x);
        const dy = Math.abs(event.globalY - moveClickStartRef.current.y);
        const dragThreshold = 5; // pixels

        if (dx > dragThreshold || dy > dragThreshold) {
          didDragForMoveRef.current = true;
          // Start selection from the original click point
          const startWorld = screenToWorld(
            moveClickStartRef.current.x,
            moveClickStartRef.current.y,
          );
          const startGridX = Math.floor(startWorld.x / cellSize);
          const startGridY = Math.floor(startWorld.y / cellSize);
          startMoveSelection(startGridX, startGridY);
          // Immediately update to current position
          const gridX = Math.floor(world.x / cellSize);
          const gridY = Math.floor(world.y / cellSize);
          updateMoveSelection(gridX, gridY);
        }
      }

      // Update selection box while dragging to select
      if (mode === "move" && isSelectingForMove) {
        const gridX = Math.floor(world.x / cellSize);
        const gridY = Math.floor(world.y / cellSize);
        updateMoveSelection(gridX, gridY);
      }

      // Update cursor position when buildings are picked up (following cursor)
      if (mode === "move" && movingBuildings.length > 0) {
        updateMoveCursor(world.x, world.y);
      }

      // Update ghost position if in place mode
      if (mode === "place" && selectedBuilding) {
        setGhostPosition(world);

        if (isBulkPlacing) {
          const buildingDef = buildingsMap[selectedBuilding];
          if (buildingDef) {
            const { gridX, gridY } = calculateSnappedPosition(
              world.x,
              world.y,
              cellSize,
              buildingDef.size.width,
              buildingDef.size.height,
              ghostRotation,
            );
            updateBulkPlacement(gridX, gridY);
          }
        }
      }

      // Update road placement preview
      if (mode === "road" && selectedRoadType && isPlacingRoad) {
        const gridX = Math.floor(world.x / cellSize);
        const gridY = Math.floor(world.y / cellSize);
        updateRoadPlacement(gridX, gridY);
      }
    },
    [
      screenToWorld,
      mode,
      movingBuildings.length,
      isSelectingForMove,
      selectedBuilding,
      selectedRoadType,
      isPlacingRoad,
      zoom,
      adjustPan,
      cellSize,
      placedBuildings,
      roadNetwork,
      drawBuildings,
      drawRoads,
      startMoveSelection,
      updateMoveSelection,
      updateMoveCursor,
      setGhostPosition,
      isBulkPlacing,
      buildingsMap,
      ghostRotation,
      updateBulkPlacement,
      updateRoadPlacement,
    ],
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (event: FederatedPointerEvent) => {
      // Right click for panning
      if (event.button === 2) {
        isPanningRef.current = true;
        lastPanPositionRef.current = { x: event.globalX, y: event.globalY };
        rightClickStartPosRef.current = { x: event.globalX, y: event.globalY };
        didPanRef.current = false;
        return;
      }

      const world = screenToWorld(event.globalX, event.globalY);

      // Left click actions based on mode
      if (event.button === 0) {
        if (mode === "place" && selectedBuilding && ghostPosition) {
          const buildingDef = buildingsMap[selectedBuilding];
          if (buildingDef) {
            const { gridX, gridY } = calculateSnappedPosition(
              ghostPosition.x,
              ghostPosition.y,
              cellSize,
              buildingDef.size.width,
              buildingDef.size.height,
              ghostRotation,
            );
            startBulkPlacement(gridX, gridY);
          }
        } else if (mode === "road" && selectedRoadType) {
          // Start road placement
          const gridX = Math.floor(world.x / cellSize);
          const gridY = Math.floor(world.y / cellSize);
          startRoadPlacement(gridX, gridY);
        } else if (mode === "delete") {
          // Try to delete a building first
          const building = getBuildingAtPosition(
            world.x,
            world.y,
            cellSize,
            placedBuildings,
          );
          if (building) {
            removeBuilding(building.id);
          } else {
            // Try to delete a road edge
            const roadEdge = getRoadEdgeAtPosition(
              world.x,
              world.y,
              cellSize,
              roadNetwork,
            );
            if (roadEdge) {
              removeRoadEdge(roadEdge.id);
            }
          }
        } else if (mode === "move") {
          if (movingBuildings.length > 0) {
            // If buildings are already being moved, clicking places them
            attemptPlaceMovedBuildings(buildingsMap);
          } else {
            // Check if clicking on a building
            const building = getBuildingAtPosition(
              world.x,
              world.y,
              cellSize,
              placedBuildings,
            );
            // Record click start - we'll determine if it's a click or drag in pointer move/up
            moveClickStartRef.current = {
              x: event.globalX,
              y: event.globalY,
              buildingId: building?.id ?? null,
            };
            didDragForMoveRef.current = false;
          }
        } else if (mode === "select") {
          const building = getBuildingAtPosition(
            world.x,
            world.y,
            cellSize,
            placedBuildings,
          );
          if (building) {
            toggleBuildingSelection(building.id);
          }
        }
      }
    },
    [
      mode,
      selectedBuilding,
      selectedRoadType,
      ghostPosition,
      ghostRotation,
      cellSize,
      placedBuildings,
      roadNetwork,
      movingBuildings,
      screenToWorld,
      startBulkPlacement,
      startRoadPlacement,
      removeBuilding,
      removeRoadEdge,
      toggleBuildingSelection,
      attemptPlaceMovedBuildings,
      buildingsMap,
    ],
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (event.button === 2) {
        isPanningRef.current = false;

        // If right-click without dragging and in place/road/move mode, cancel mode
        if (!didPanRef.current && mode === "place") {
          setMode("select");
        } else if (!didPanRef.current && mode === "road") {
          if (isPlacingRoad) {
            cancelRoadPlacement();
          } else {
            setMode("select");
          }
        } else if (!didPanRef.current && mode === "move") {
          // Right-click cancels move and goes back to select
          if (movingBuildings.length > 0) {
            cancelMove();
          }
          // Clear click tracking
          moveClickStartRef.current = null;
          didDragForMoveRef.current = false;
          setMode("select");
        }
      }
      if (event.button === 0 && isBulkPlacing) {
        finishBulkPlacement(buildingsMap);
      }
      if (event.button === 0 && isPlacingRoad) {
        finishRoadPlacement();
      }
      // Handle move mode click/drag release
      if (event.button === 0 && mode === "move") {
        if (isSelectingForMove) {
          // Finish selection box in move mode
          finishMoveSelection();
        } else if (moveClickStartRef.current && !didDragForMoveRef.current) {
          // Clicked without dragging - pick up single building if clicked on one
          if (moveClickStartRef.current.buildingId) {
            const world = screenToWorld(event.globalX, event.globalY);
            const gridX = Math.floor(world.x / cellSize);
            const gridY = Math.floor(world.y / cellSize);
            pickUpBuilding(moveClickStartRef.current.buildingId, gridX, gridY);
          }
        }
        // Clear the click tracking
        moveClickStartRef.current = null;
        didDragForMoveRef.current = false;
      }
    },
    [
      isBulkPlacing,
      isPlacingRoad,
      isSelectingForMove,
      movingBuildings,
      finishBulkPlacement,
      finishRoadPlacement,
      finishMoveSelection,
      cancelRoadPlacement,
      cancelMove,
      pickUpBuilding,
      screenToWorld,
      cellSize,
      mode,
      setMode,
      buildingsMap,
    ],
  );

  // Handle wheel for zooming
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
      setZoom(newZoom);
    },
    [zoom, setZoom],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Escape to cancel place/road mode
      if (event.key === "Escape") {
        if (mode === "place") {
          setMode("select");
          return;
        }
        if (mode === "road") {
          if (isPlacingRoad) {
            cancelRoadPlacement();
          } else {
            setMode("select");
          }
          return;
        }
      }

      // Ctrl/Cmd + Plus/Equal to zoom in
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "+" || event.key === "=")
      ) {
        event.preventDefault();
        incrementZoom(0.1);
        return;
      }

      // Ctrl/Cmd + Minus to zoom out
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        incrementZoom(-0.1);
        return;
      }
    },
    [mode, isPlacingRoad, setMode, cancelRoadPlacement, incrementZoom],
  );

  // Initialize PixiJS application
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initApp = async () => {
      const app = new Application();

      await app.init({
        background: BACKGROUND_COLOR,
        resizeTo: containerRef.current!,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!mounted) {
        app.destroy(true);
        return;
      }

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      const gridLayer = new Container();
      const roadsLayer = new Container();
      const buildingsLayer = new Container();
      const roadGhostLayer = new Container();
      const ghostLayer = new Container();

      app.stage.addChild(gridLayer);
      app.stage.addChild(roadsLayer);
      app.stage.addChild(buildingsLayer);
      app.stage.addChild(roadGhostLayer);
      app.stage.addChild(ghostLayer);

      const gridGraphics = new Graphics();
      const roadsGraphics = new Graphics();
      const buildingsGraphics = new Graphics();
      const roadGhostGraphics = new Graphics();
      const ghostGraphics = new Graphics();
      const buildingsSpritesContainer = new Container();
      const ghostSpritesContainer = new Container();

      gridLayer.addChild(gridGraphics);
      roadsLayer.addChild(roadsGraphics);
      buildingsLayer.addChild(buildingsGraphics);
      buildingsLayer.addChild(buildingsSpritesContainer);
      roadGhostLayer.addChild(roadGhostGraphics);
      ghostLayer.addChild(ghostGraphics);
      ghostLayer.addChild(ghostSpritesContainer);

      gridGraphicsRef.current = gridGraphics;
      roadsGraphicsRef.current = roadsGraphics;
      buildingsGraphicsRef.current = buildingsGraphics;
      roadGhostGraphicsRef.current = roadGhostGraphics;
      ghostGraphicsRef.current = ghostGraphics;
      buildingsSpritesContainerRef.current = buildingsSpritesContainer;
      ghostSpritesContainerRef.current = ghostSpritesContainer;

      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(
        0,
        0,
        app.screen.width,
        app.screen.height,
      );

      app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

      setIsReady(true);
    };

    void initApp();

    return () => {
      mounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      setIsReady(false);
    };
  }, []);

  // Set up event listeners when ready
  useEffect(() => {
    if (!isReady) return;

    const app = appRef.current;
    if (!app) return;

    app.stage.on("pointermove", handlePointerMove);
    app.stage.on("pointerdown", handlePointerDown);
    app.stage.on("pointerup", handlePointerUp);
    app.stage.on("pointerupoutside", handlePointerUp);

    const canvas = app.canvas;
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Add keyboard event listener to window
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      // Check if stage still exists (may have been destroyed by app cleanup)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (app.stage) {
        app.stage.off("pointermove", handlePointerMove);
        app.stage.off("pointerdown", handlePointerDown);
        app.stage.off("pointerup", handlePointerUp);
        app.stage.off("pointerupoutside", handlePointerUp);
      }
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isReady,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleWheel,
    handleKeyDown,
  ]);

  // Update hit area on resize
  useEffect(() => {
    if (!isReady) return;

    const app = appRef.current;
    if (!app) return;

    const handleResize = () => {
      app.stage.hitArea = new Rectangle(
        0,
        0,
        app.screen.width,
        app.screen.height,
      );
      drawGrid();
      drawRoads();
      drawBuildings();
      drawRoadGhost();
      drawGhost();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isReady, drawGrid, drawRoads, drawBuildings, drawRoadGhost, drawGhost]);

  // Redraw when state changes
  useEffect(() => {
    if (isReady) drawGrid();
  }, [isReady, drawGrid]);

  useEffect(() => {
    if (isReady) drawRoads();
  }, [isReady, drawRoads]);

  useEffect(() => {
    if (isReady) drawBuildings();
  }, [isReady, drawBuildings]);

  useEffect(() => {
    if (isReady) drawRoadGhost();
  }, [isReady, drawRoadGhost]);

  useEffect(() => {
    if (isReady) drawGhost();
  }, [isReady, drawGhost]);

  // Get cursor based on mode
  const getCursor = () => {
    if (mode === "place") return "crosshair";
    if (mode === "road") return "crosshair";
    if (mode === "delete") return "pointer";
    if (mode === "move") {
      if (movingBuildings.length > 0) return "grabbing";
      if (isSelectingForMove) return "crosshair";
      if (hoveredMoveBuildingIdRef.current) return "grab";
      return "crosshair";
    }
    return "default";
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ cursor: getCursor() }}
    />
  );
}
