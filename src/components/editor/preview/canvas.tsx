import type {
  PlacedBuilding,
  RoadEdge,
  RoadNetwork,
  Rotation,
} from "@/types/editor";
import type { FederatedPointerEvent, Texture } from "pixi.js";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  GRID_COLOR_MAJOR,
  MAX_ZOOM,
  MIN_ZOOM,
  ROAD_COLORS,
  ROAD_HALF_WIDTH,
  SUB_TILE_COLOR,
} from "@/lib/constants";
import { isDiagonalRotation } from "@/lib/editor";
import { computeEdgePolygon, computeJunctionPolygon } from "@/lib/editor/road";

type PreviewCanvasProps = {
  placedBuildings: PlacedBuilding[];
  roadNetwork: RoadNetwork;
  autoFit?: boolean;
  initialZoom?: number;
  cellSize?: number;
  onZoomChange?: (zoom: number) => void;
};

export type PreviewCanvasRef = {
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  fitToContent: () => void;
};

export const PreviewCanvas = forwardRef<PreviewCanvasRef, PreviewCanvasProps>(
  function PreviewCanvas(
    {
      placedBuildings,
      roadNetwork,
      autoFit = false,
      initialZoom = 1,
      cellSize = 40,
      onZoomChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const gridGraphicsRef = useRef<Graphics | null>(null);
    const buildingsGraphicsRef = useRef<Graphics | null>(null);
    const roadsGraphicsRef = useRef<Graphics | null>(null);
    const buildingsSpritesContainerRef = useRef<Container | null>(null);
    const textureCache = useRef<Map<string, Texture>>(new Map());
    const [isReady, setIsReady] = useState(false);

    // View state
    const [zoom, setZoomState] = useState(initialZoom);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Wrapper for zoom setter that also calls the callback
    const setZoom = useCallback(
      (newZoom: number) => {
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        setZoomState(clampedZoom);
        onZoomChange?.(clampedZoom);
      },
      [onZoomChange],
    );

    // Panning state
    const isPanningRef = useRef(false);
    const lastPanPositionRef = useRef({ x: 0, y: 0 });

    // Get game data from context
    const { buildingsMap } = useGameData();

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

    // Calculate the bounding box of all placed buildings
    const calculateBounds = useCallback(() => {
      if (
        placedBuildings.length === 0 &&
        Object.keys(roadNetwork.nodes).length === 0
      ) {
        return null;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      // Include buildings
      for (const building of placedBuildings) {
        minX = Math.min(minX, building.gridX);
        minY = Math.min(minY, building.gridY);
        maxX = Math.max(maxX, building.gridX + building.width);
        maxY = Math.max(maxY, building.gridY + building.height);
      }

      // Include road nodes
      for (const node of Object.values(roadNetwork.nodes)) {
        minX = Math.min(minX, node.gridX);
        minY = Math.min(minY, node.gridY);
        maxX = Math.max(maxX, node.gridX + 1);
        maxY = Math.max(maxY, node.gridY + 1);
      }

      return { minX, minY, maxX, maxY };
    }, [placedBuildings, roadNetwork.nodes]);

    // Auto-fit to show all content
    const fitToContent = useCallback(() => {
      const app = appRef.current;
      if (!app) return;

      const bounds = calculateBounds();
      if (!bounds) {
        // No content, reset to default view
        setZoom(1);
        setPanX(0);
        setPanY(0);
        return;
      }

      const { minX, minY, maxX, maxY } = bounds;
      const contentWidth = (maxX - minX) * cellSize;
      const contentHeight = (maxY - minY) * cellSize;
      const contentCenterX = ((minX + maxX) / 2) * cellSize;
      const contentCenterY = ((minY + maxY) / 2) * cellSize;

      // Add padding (10% on each side)
      const paddingFactor = 0.8;
      const availableWidth = app.screen.width * paddingFactor;
      const availableHeight = app.screen.height * paddingFactor;

      // Calculate zoom to fit content
      const zoomX = availableWidth / contentWidth;
      const zoomY = availableHeight / contentHeight;
      const newZoom = Math.min(zoomX, zoomY, MAX_ZOOM);
      const clampedZoom = Math.max(MIN_ZOOM, newZoom);

      // Calculate pan to center content
      const newPanX = -contentCenterX;
      const newPanY = -contentCenterY;

      setZoom(clampedZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    }, [calculateBounds, cellSize, setZoom]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getZoom: () => zoom,
        setZoom,
        fitToContent,
      }),
      [zoom, setZoom, fitToContent],
    );

    // Draw the infinite grid with culling
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
          const W = width;
          const H = height;
          const boundingBoxSize = (W + H) / 2;

          const cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
          const cy = screenY + (boundingBoxSize * scaledCellSize) / 2;

          const scale = scaledCellSize / 4;

          let corners = [
            { x: cx + (H - W) * scale, y: cy - (W + H) * scale },
            { x: cx + (W + H) * scale, y: cy + (W - H) * scale },
            { x: cx + (W - H) * scale, y: cy + (W + H) * scale },
            { x: cx - (W + H) * scale, y: cy + (H - W) * scale },
          ];

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

    // Draw rotation indicator on a building
    const drawRotationIndicator = useCallback(
      (
        graphics: Graphics,
        gridX: number,
        gridY: number,
        width: number,
        height: number,
        rotation: Rotation,
      ) => {
        if (rotation === 0) return;

        const scaledCellSize = cellSize * zoom;
        const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);

        let cx: number, cy: number;
        if (isDiagonalRotation(rotation)) {
          const boundingBoxSize = (width + height) / 2;
          cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
          cy = screenY + (boundingBoxSize * scaledCellSize) / 2;
        } else {
          cx = screenX + (width * scaledCellSize) / 2;
          cy = screenY + (height * scaledCellSize) / 2;
        }

        const arrowLength = Math.min(width, height) * scaledCellSize * 0.25;
        const arrowHeadSize = arrowLength * 0.3;
        const angleRad = (rotation * Math.PI) / 180;

        const endX = cx + Math.cos(angleRad - Math.PI / 2) * arrowLength;
        const endY = cy + Math.sin(angleRad - Math.PI / 2) * arrowLength;

        const headAngle1 = angleRad - Math.PI / 2 + Math.PI * 0.8;
        const headAngle2 = angleRad - Math.PI / 2 - Math.PI * 0.8;
        const head1X = endX + Math.cos(headAngle1) * arrowHeadSize;
        const head1Y = endY + Math.sin(headAngle1) * arrowHeadSize;
        const head2X = endX + Math.cos(headAngle2) * arrowHeadSize;
        const head2Y = endY + Math.sin(headAngle2) * arrowHeadSize;

        graphics.moveTo(cx, cy);
        graphics.lineTo(endX, endY);
        graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });

        graphics.moveTo(endX, endY);
        graphics.lineTo(head1X, head1Y);
        graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
        graphics.moveTo(endX, endY);
        graphics.lineTo(head2X, head2Y);
        graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.7 });

        graphics.circle(endX, endY, 3);
        graphics.fill({ color: 0xffffff, alpha: 0.9 });
      },
      [cellSize, zoom, gridToScreen],
    );

    // Draw a road edge as a filled polygon
    const drawRoadEdge = useCallback(
      (graphics: Graphics, edge: RoadEdge, alpha = 1.0) => {
        const colors = ROAD_COLORS[edge.roadType];

        if (edge.centerLine.length < 2) return;

        const polygon = computeEdgePolygon(edge, cellSize, (gx, gy) => {
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

        const flatPoints: number[] = [];
        for (const p of polygon) {
          flatPoints.push(p.x, p.y);
        }

        graphics.poly(flatPoints);
        graphics.fill({ color: colors.fill, alpha: alpha });
        graphics.stroke({ width: 2, color: colors.border, alpha: alpha });
      },
      [cellSize, zoom, panX, panY],
    );

    // Draw junction nodes where road edges meet
    const drawRoadJunctions = useCallback(
      (graphics: Graphics, alpha = 1.0) => {
        const scaledCellSize = cellSize * zoom;

        for (const node of Object.values(roadNetwork.nodes)) {
          if (node.connectedEdges.length >= 2) {
            const { x, y } = gridToScreen(node.gridX + 0.5, node.gridY + 0.5);

            const edgeId = node.connectedEdges[0];
            const edge = roadNetwork.edges[edgeId!];
            if (!edge) continue;

            const colors = ROAD_COLORS[edge.roadType];

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
              const flatPoints: number[] = [];
              for (const p of junctionPolygon) {
                flatPoints.push(p.x, p.y);
              }
              graphics.poly(flatPoints);
              graphics.fill({ color: colors.fill, alpha: alpha });
            } else {
              const junctionRadius = ROAD_HALF_WIDTH * scaledCellSize * 1.4;
              graphics.circle(x, y, junctionRadius);
              graphics.fill({ color: colors.fill, alpha: alpha });
            }
          }
        }
      },
      [cellSize, zoom, panX, panY, gridToScreen, roadNetwork],
    );

    // Draw all placed roads
    const drawRoads = useCallback(() => {
      const graphics = roadsGraphicsRef.current;
      if (!graphics) return;

      graphics.clear();

      for (const edge of Object.values(roadNetwork.edges)) {
        drawRoadEdge(graphics, edge);
      }

      drawRoadJunctions(graphics);
    }, [roadNetwork, drawRoadEdge, drawRoadJunctions]);

    // Calculate icon position and size for a building
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

        let cx: number, cy: number;
        if (isDiagonalRotation(rotation)) {
          const boundingBoxSize = (width + height) / 2;
          const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);
          cx = screenX + (boundingBoxSize * scaledCellSize) / 2;
          cy = screenY + (boundingBoxSize * scaledCellSize) / 2;
        } else {
          const { x: screenX, y: screenY } = gridToScreen(gridX, gridY);
          cx = screenX + (width * scaledCellSize) / 2;
          cy = screenY + (height * scaledCellSize) / 2;
        }

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

      if (spritesContainer) {
        spritesContainer.removeChildren();
      }

      for (const placedBuilding of placedBuildings) {
        drawBuilding(
          graphics,
          placedBuilding.gridX,
          placedBuilding.gridY,
          placedBuilding.width,
          placedBuilding.height,
          placedBuilding.rotation,
          placedBuilding.color,
          0.85,
          0xffffff,
          0.4,
          2,
        );

        drawRotationIndicator(
          graphics,
          placedBuilding.gridX,
          placedBuilding.gridY,
          placedBuilding.width,
          placedBuilding.height,
          placedBuilding.rotation,
        );

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

              sprite.anchor.set(0.5, 0.5);
              sprite.x = cx;
              sprite.y = cy;

              const scale = iconSize / Math.max(texture.width, texture.height);
              sprite.scale.set(scale);
              sprite.rotation = 0;

              spritesContainer.addChild(sprite);
            } else {
              void loadTexture(building.icon).then((loadedTexture) => {
                if (loadedTexture) {
                  // eslint-disable-next-line react-hooks/immutability
                  drawBuildings();
                }
              });
            }
          }
        }
      }
    }, [
      placedBuildings,
      drawBuilding,
      drawRotationIndicator,
      buildingsMap,
      getTexture,
      loadTexture,
      getIconTransform,
    ]);

    // Handle pointer move for panning
    const handlePointerMove = useCallback(
      (event: FederatedPointerEvent) => {
        if (isPanningRef.current) {
          const deltaX = (event.globalX - lastPanPositionRef.current.x) / zoom;
          const deltaY = (event.globalY - lastPanPositionRef.current.y) / zoom;

          setPanX((prev) => prev + deltaX);
          setPanY((prev) => prev + deltaY);
          lastPanPositionRef.current = { x: event.globalX, y: event.globalY };
        }
      },
      [zoom],
    );

    // Handle pointer down for panning (both left and right click)
    const handlePointerDown = useCallback((event: FederatedPointerEvent) => {
      // Allow panning with left click (0), middle click (1), or right click (2)
      if (event.button === 0 || event.button === 1 || event.button === 2) {
        isPanningRef.current = true;
        lastPanPositionRef.current = { x: event.globalX, y: event.globalY };
      }
    }, []);

    // Handle pointer up
    const handlePointerUp = useCallback(() => {
      isPanningRef.current = false;
    }, []);

    // Handle wheel for zooming
    const handleWheel = useCallback(
      (event: WheelEvent) => {
        event.preventDefault();

        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        setZoomState((prev) => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
          onZoomChange?.(newZoom);
          return newZoom;
        });
      },
      [onZoomChange],
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

        app.stage.addChild(gridLayer);
        app.stage.addChild(roadsLayer);
        app.stage.addChild(buildingsLayer);

        const gridGraphics = new Graphics();
        const roadsGraphics = new Graphics();
        const buildingsGraphics = new Graphics();
        const buildingsSpritesContainer = new Container();

        gridLayer.addChild(gridGraphics);
        roadsLayer.addChild(roadsGraphics);
        buildingsLayer.addChild(buildingsGraphics);
        buildingsLayer.addChild(buildingsSpritesContainer);

        gridGraphicsRef.current = gridGraphics;
        roadsGraphicsRef.current = roadsGraphics;
        buildingsGraphicsRef.current = buildingsGraphics;
        buildingsSpritesContainerRef.current = buildingsSpritesContainer;

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

      return () => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (app.stage) {
          app.stage.off("pointermove", handlePointerMove);
          app.stage.off("pointerdown", handlePointerDown);
          app.stage.off("pointerup", handlePointerUp);
          app.stage.off("pointerupoutside", handlePointerUp);
        }
        canvas.removeEventListener("wheel", handleWheel);
      };
    }, [
      isReady,
      handlePointerMove,
      handlePointerDown,
      handlePointerUp,
      handleWheel,
    ]);

    // Auto-fit when enabled and ready
    useEffect(() => {
      if (isReady && autoFit) {
        // Small delay to ensure canvas is fully initialized
        const timer = setTimeout(() => {
          fitToContent();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [isReady, autoFit, fitToContent]);

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

        // Re-fit if autoFit is enabled
        if (autoFit) {
          fitToContent();
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [isReady, autoFit, drawGrid, drawRoads, drawBuildings, fitToContent]);

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

    return (
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ cursor: isPanningRef.current ? "grabbing" : "grab" }}
      />
    );
  },
);
