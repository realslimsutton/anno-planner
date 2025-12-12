import type {
  GridPoint,
  JunctionType,
  PlacedBuilding,
  Point2D,
  RoadDirection,
  RoadEdge,
  RoadNetwork,
  RoadNode,
  RoadPreview,
  RoadType,
  Rotation,
} from "@/types/editor";

import {
  getDirectionAngle,
  getDirectionFromDelta,
  getDirectionVector,
  getOppositeDirection,
  isDiagonalDirection,
  isDiagonalRotation,
} from ".";
import { MIN_ROAD_LENGTH, ROAD_HALF_WIDTH } from "../constants";

export function generateRoadId(prefix: "node" | "edge"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getPerpendicular(
  dx: number,
  dy: number,
): { dx: number; dy: number } {
  return { dx: -dy, dy: dx };
}

export function normalize(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { dx: 0, dy: 0 };
  return { dx: dx / len, dy: dy / len };
}

export function getEdgeOffsetPoints(
  point: GridPoint,
  direction: RoadDirection,
  halfWidth: number = ROAD_HALF_WIDTH,
): { left: Point2D; right: Point2D } {
  const { dx, dy } = getDirectionVector(direction);
  const perp = getPerpendicular(dx, dy);
  const normPerp = normalize(perp.dx, perp.dy);

  // For diagonal roads, we need to adjust the width to maintain consistent visual width
  const actualHalfWidth = isDiagonalDirection(direction)
    ? halfWidth * Math.SQRT2
    : halfWidth;

  return {
    left: {
      x: point.gridX + 0.5 + normPerp.dx * actualHalfWidth,
      y: point.gridY + 0.5 + normPerp.dy * actualHalfWidth,
    },
    right: {
      x: point.gridX + 0.5 - normPerp.dx * actualHalfWidth,
      y: point.gridY + 0.5 - normPerp.dy * actualHalfWidth,
    },
  };
}

export function computeEdgePolygonOffsets(
  centerLine: GridPoint[],
  direction: RoadDirection,
  extendStart = true,
  extendEnd = true,
): { left: Point2D[]; right: Point2D[] } {
  if (centerLine.length === 0) {
    return { left: [], right: [] };
  }

  const leftPoints: Point2D[] = [];
  const rightPoints: Point2D[] = [];

  // Get direction vector for extending the road
  const { dx, dy } = getDirectionVector(direction);
  const isDiagonal = isDiagonalDirection(direction);

  // Extension amount: 0.5 tiles in the road direction for straight roads
  // For diagonal roads, use less extension to avoid junction overhang
  const extensionAmount = isDiagonal ? 0 : 0.5;

  // Create extended start point (extend backward from first tile center)
  const firstPoint = centerLine[0]!;
  if (extendStart) {
    const extendedStart: GridPoint = {
      gridX: firstPoint.gridX - dx * extensionAmount,
      gridY: firstPoint.gridY - dy * extensionAmount,
    };
    const startOffsets = getEdgeOffsetPoints(
      { gridX: extendedStart.gridX, gridY: extendedStart.gridY },
      direction,
    );
    leftPoints.push(startOffsets.left);
    rightPoints.push(startOffsets.right);
  }

  // Add all center line points (these are already at tile centers)
  for (const point of centerLine) {
    const { left, right } = getEdgeOffsetPoints(point, direction);
    leftPoints.push(left);
    rightPoints.push(right);
  }

  // Create extended end point (extend forward from last tile center)
  const lastPoint = centerLine[centerLine.length - 1]!;
  if (extendEnd) {
    const extendedEnd: GridPoint = {
      gridX: lastPoint.gridX + dx * extensionAmount,
      gridY: lastPoint.gridY + dy * extensionAmount,
    };
    const endOffsets = getEdgeOffsetPoints(
      { gridX: extendedEnd.gridX, gridY: extendedEnd.gridY },
      direction,
    );
    leftPoints.push(endOffsets.left);
    rightPoints.push(endOffsets.right);
  }

  return { left: leftPoints, right: rightPoints };
}

export function calculateRoadPreview(
  start: GridPoint,
  end: GridPoint,
  roadNetwork: RoadNetwork,
  placedBuildings: PlacedBuilding[],
): RoadPreview {
  const dx = end.gridX - start.gridX;
  const dy = end.gridY - start.gridY;

  // Calculate total distance
  const totalDistance = Math.abs(dx) + Math.abs(dy);

  // If distance is less than minimum, return invalid preview
  if (totalDistance < MIN_ROAD_LENGTH) {
    return {
      waypoints: [start, end],
      edges: [],
      isValid: false,
      totalLength: totalDistance,
    };
  }

  // Check if A and B are directly diagonal (pure diagonal path)
  const isPureDiagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;

  if (isPureDiagonal) {
    // Use pure diagonal path
    const diagonalPath = calculatePureDiagonalPath(
      start,
      end,
      roadNetwork,
      placedBuildings,
    );
    if (diagonalPath.isValid) {
      return diagonalPath;
    }
  }

  // Try straight-first path (straight roads first, then diagonal)
  const straightFirstPath = calculateStraightFirstPath(
    start,
    end,
    roadNetwork,
    placedBuildings,
  );
  if (straightFirstPath.isValid) {
    return straightFirstPath;
  }

  // Try diagonal-first path as fallback
  const diagonalFirstPath = calculateDiagonalFirstPath(
    start,
    end,
    roadNetwork,
    placedBuildings,
  );
  if (diagonalFirstPath.isValid) {
    return diagonalFirstPath;
  }

  // Return straight-first path marked as invalid
  return straightFirstPath;
}

export function calculatePureDiagonalPath(
  start: GridPoint,
  end: GridPoint,
  roadNetwork: RoadNetwork,
  placedBuildings: PlacedBuilding[],
): RoadPreview {
  const dx = end.gridX - start.gridX;
  const dy = end.gridY - start.gridY;
  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;

  const waypoints: GridPoint[] = [];
  const edges: RoadPreview["edges"] = [];

  waypoints.push({ gridX: start.gridX, gridY: start.gridY });

  const diagonalDistance = Math.abs(dx); // Same as Math.abs(dy) for pure diagonal

  if (diagonalDistance > 0) {
    const diagCenterLine: GridPoint[] = [
      { gridX: start.gridX, gridY: start.gridY },
    ];

    for (let i = 1; i <= diagonalDistance; i++) {
      const point = {
        gridX: start.gridX + i * signX,
        gridY: start.gridY + i * signY,
      };
      diagCenterLine.push(point);
      waypoints.push(point);
    }

    const diagDirection = getDirectionFromDelta(signX, signY);
    if (diagDirection) {
      const diagValid = isEdgeValid(
        diagCenterLine,
        diagDirection,
        roadNetwork,
        placedBuildings,
      );

      edges.push({
        startPoint: diagCenterLine[0]!,
        endPoint: diagCenterLine[diagCenterLine.length - 1]!,
        direction: diagDirection,
        centerLine: diagCenterLine,
        isValid: diagValid,
      });
    }
  }

  const isValid = edges.length > 0 && edges.every((e) => e.isValid);
  const totalLength = waypoints.length - 1;

  return { waypoints, edges, isValid, totalLength };
}

export function calculateDiagonalFirstPath(
  start: GridPoint,
  end: GridPoint,
  roadNetwork: RoadNetwork,
  placedBuildings: PlacedBuilding[],
): RoadPreview {
  const dx = end.gridX - start.gridX;
  const dy = end.gridY - start.gridY;
  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;

  const waypoints: GridPoint[] = [];
  const edges: RoadPreview["edges"] = [];

  // Add start
  waypoints.push({ gridX: start.gridX, gridY: start.gridY });

  // Calculate diagonal and remaining distances
  const diagonalDistance = Math.min(Math.abs(dx), Math.abs(dy));
  const remainingX = Math.abs(dx) - diagonalDistance;
  const remainingY = Math.abs(dy) - diagonalDistance;

  if (diagonalDistance > 0) {
    // Build diagonal segment
    const diagCenterLine: GridPoint[] = [
      { gridX: start.gridX, gridY: start.gridY },
    ];

    for (let i = 1; i <= diagonalDistance; i++) {
      const point = {
        gridX: start.gridX + i * signX,
        gridY: start.gridY + i * signY,
      };
      diagCenterLine.push(point);
      waypoints.push(point);
    }

    // Determine diagonal direction
    const diagDirection = getDirectionFromDelta(signX, signY);
    if (diagDirection) {
      const diagValid = isEdgeValid(
        diagCenterLine,
        diagDirection,
        roadNetwork,
        placedBuildings,
      );

      edges.push({
        startPoint: diagCenterLine[0]!,
        endPoint: diagCenterLine[diagCenterLine.length - 1]!,
        direction: diagDirection,
        centerLine: diagCenterLine,
        isValid: diagValid,
      });
    }

    // Add straight segment if needed
    const cornerX = start.gridX + diagonalDistance * signX;
    const cornerY = start.gridY + diagonalDistance * signY;

    if (remainingX > 0 || remainingY > 0) {
      const straightCenterLine: GridPoint[] = [
        { gridX: cornerX, gridY: cornerY },
      ];

      if (remainingX > 0) {
        for (let i = 1; i <= remainingX; i++) {
          const point = { gridX: cornerX + i * signX, gridY: cornerY };
          straightCenterLine.push(point);
          waypoints.push(point);
        }
      } else {
        for (let i = 1; i <= remainingY; i++) {
          const point = { gridX: cornerX, gridY: cornerY + i * signY };
          straightCenterLine.push(point);
          waypoints.push(point);
        }
      }

      const straightDirection: RoadDirection =
        remainingX > 0 ? (signX > 0 ? "E" : "W") : signY > 0 ? "S" : "N";

      const straightValid = isEdgeValid(
        straightCenterLine,
        straightDirection,
        roadNetwork,
        placedBuildings,
      );

      edges.push({
        startPoint: straightCenterLine[0]!,
        endPoint: straightCenterLine[straightCenterLine.length - 1]!,
        direction: straightDirection,
        centerLine: straightCenterLine,
        isValid: straightValid,
      });
    }
  } else {
    // Pure straight line
    const centerLine: GridPoint[] = [
      { gridX: start.gridX, gridY: start.gridY },
    ];
    const direction: RoadDirection =
      Math.abs(dx) >= Math.abs(dy)
        ? signX > 0
          ? "E"
          : "W"
        : signY > 0
          ? "S"
          : "N";

    const { dx: stepX, dy: stepY } = getDirectionVector(direction);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 1; i <= steps; i++) {
      const point = {
        gridX: start.gridX + i * stepX,
        gridY: start.gridY + i * stepY,
      };
      centerLine.push(point);
      waypoints.push(point);
    }

    const valid = isEdgeValid(
      centerLine,
      direction,
      roadNetwork,
      placedBuildings,
    );

    edges.push({
      startPoint: centerLine[0]!,
      endPoint: centerLine[centerLine.length - 1]!,
      direction,
      centerLine,
      isValid: valid,
    });
  }

  const isValid = edges.length > 0 && edges.every((e) => e.isValid);
  const totalLength = waypoints.length - 1;

  return { waypoints, edges, isValid, totalLength };
}

function calculateStraightFirstPath(
  start: GridPoint,
  end: GridPoint,
  roadNetwork: RoadNetwork,
  placedBuildings: PlacedBuilding[],
): RoadPreview {
  const dx = end.gridX - start.gridX;
  const dy = end.gridY - start.gridY;
  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;

  const waypoints: GridPoint[] = [];
  const edges: RoadPreview["edges"] = [];

  waypoints.push({ gridX: start.gridX, gridY: start.gridY });

  const diagonalDistance = Math.min(Math.abs(dx), Math.abs(dy));
  const remainingX = Math.abs(dx) - diagonalDistance;
  const remainingY = Math.abs(dy) - diagonalDistance;

  // Start with straight segment
  if (remainingX > 0 || remainingY > 0) {
    const straightCenterLine: GridPoint[] = [
      { gridX: start.gridX, gridY: start.gridY },
    ];
    let cornerX: number, cornerY: number;
    let straightDirection: RoadDirection;

    if (remainingX > 0) {
      straightDirection = signX > 0 ? "E" : "W";
      for (let i = 1; i <= remainingX; i++) {
        const point = { gridX: start.gridX + i * signX, gridY: start.gridY };
        straightCenterLine.push(point);
        waypoints.push(point);
      }
      cornerX = start.gridX + remainingX * signX;
      cornerY = start.gridY;
    } else {
      straightDirection = signY > 0 ? "S" : "N";
      for (let i = 1; i <= remainingY; i++) {
        const point = { gridX: start.gridX, gridY: start.gridY + i * signY };
        straightCenterLine.push(point);
        waypoints.push(point);
      }
      cornerX = start.gridX;
      cornerY = start.gridY + remainingY * signY;
    }

    const straightValid = isEdgeValid(
      straightCenterLine,
      straightDirection,
      roadNetwork,
      placedBuildings,
    );

    edges.push({
      startPoint: straightCenterLine[0]!,
      endPoint: straightCenterLine[straightCenterLine.length - 1]!,
      direction: straightDirection,
      centerLine: straightCenterLine,
      isValid: straightValid,
    });

    // Then diagonal segment
    if (diagonalDistance > 0) {
      const diagCenterLine: GridPoint[] = [{ gridX: cornerX, gridY: cornerY }];

      for (let i = 1; i <= diagonalDistance; i++) {
        const point = {
          gridX: cornerX + i * signX,
          gridY: cornerY + i * signY,
        };
        diagCenterLine.push(point);
        waypoints.push(point);
      }

      const diagDirection = getDirectionFromDelta(signX, signY);
      if (diagDirection) {
        const diagValid = isEdgeValid(
          diagCenterLine,
          diagDirection,
          roadNetwork,
          placedBuildings,
        );

        edges.push({
          startPoint: diagCenterLine[0]!,
          endPoint: diagCenterLine[diagCenterLine.length - 1]!,
          direction: diagDirection,
          centerLine: diagCenterLine,
          isValid: diagValid,
        });
      }
    }
  } else if (diagonalDistance > 0) {
    // Pure diagonal
    const diagCenterLine: GridPoint[] = [
      { gridX: start.gridX, gridY: start.gridY },
    ];

    for (let i = 1; i <= diagonalDistance; i++) {
      const point = {
        gridX: start.gridX + i * signX,
        gridY: start.gridY + i * signY,
      };
      diagCenterLine.push(point);
      waypoints.push(point);
    }

    const diagDirection = getDirectionFromDelta(signX, signY);
    if (diagDirection) {
      const diagValid = isEdgeValid(
        diagCenterLine,
        diagDirection,
        roadNetwork,
        placedBuildings,
      );

      edges.push({
        startPoint: diagCenterLine[0]!,
        endPoint: diagCenterLine[diagCenterLine.length - 1]!,
        direction: diagDirection,
        centerLine: diagCenterLine,
        isValid: diagValid,
      });
    }
  }

  const isValid = edges.length > 0 && edges.every((e) => e.isValid);
  const totalLength = waypoints.length - 1;

  return { waypoints, edges, isValid, totalLength };
}

export function isEdgeValid(
  centerLine: GridPoint[],
  _direction: RoadDirection,
  _roadNetwork: RoadNetwork,
  placedBuildings: PlacedBuilding[],
): boolean {
  // Check each tile along the center line
  for (const point of centerLine) {
    if (tileCollidesWithBuilding(point.gridX, point.gridY, placedBuildings)) {
      return false;
    }
  }
  return true;
}

export function tileCollidesWithBuilding(
  gridX: number,
  gridY: number,
  placedBuildings: PlacedBuilding[],
): boolean {
  const tileCenterX = gridX + 0.5;
  const tileCenterY = gridY + 0.5;

  for (const building of placedBuildings) {
    if (isPointInBuilding(tileCenterX, tileCenterY, building)) {
      return true;
    }
  }
  return false;
}

function isPointInBuilding(
  pointX: number,
  pointY: number,
  building: PlacedBuilding,
): boolean {
  const rotation = building.rotation;
  const margin = 0.25;

  if (!isDiagonalRotation(rotation)) {
    return (
      pointX >= building.gridX + margin &&
      pointX < building.gridX + building.width - margin &&
      pointY >= building.gridY + margin &&
      pointY < building.gridY + building.height - margin
    );
  }

  const W = building.width;
  const H = building.height;
  const boundingBoxSize = (W + H) / 2;
  const centerX = building.gridX + boundingBoxSize / 2;
  const centerY = building.gridY + boundingBoxSize / 2;

  const relX = pointX - centerX;
  const relY = pointY - centerY;
  const u = relX + relY;
  const v = relY - relX;

  const uExtent = (rotation === 45 ? W / 2 : H / 2) - margin;
  const vExtent = (rotation === 45 ? H / 2 : W / 2) - margin;

  return Math.abs(u) < uExtent && Math.abs(v) < vExtent;
}

export function findOrCreateNode(
  gridX: number,
  gridY: number,
  roadNetwork: RoadNetwork,
): { node: RoadNode; isNew: boolean } {
  // Look for existing node
  for (const node of Object.values(roadNetwork.nodes)) {
    if (node.gridX === gridX && node.gridY === gridY) {
      return { node: { ...node }, isNew: false };
    }
  }

  // Create new node
  const newNode: RoadNode = {
    id: generateRoadId("node"),
    gridX,
    gridY,
    connectedEdges: [],
    junctionType: "endpoint",
  };

  return { node: newNode, isNew: true };
}

export function determineJunctionType(
  connectedEdgeCount: number,
): JunctionType {
  switch (connectedEdgeCount) {
    case 0:
    case 1:
      return "endpoint";
    case 2:
      return "straight";
    case 3:
      return "T";
    case 4:
      return "cross";
    default:
      return "multi";
  }
}

export function createRoadEdgesFromPreview(
  preview: RoadPreview,
  roadType: RoadType,
  roadNetwork: RoadNetwork,
): RoadNetwork {
  const newNetwork: RoadNetwork = {
    nodes: { ...roadNetwork.nodes },
    edges: { ...roadNetwork.edges },
  };

  for (const previewEdge of preview.edges) {
    if (!previewEdge.isValid) continue;

    // Find or create start node
    const { node: startNode, isNew: startIsNew } = findOrCreateNode(
      previewEdge.startPoint.gridX,
      previewEdge.startPoint.gridY,
      newNetwork,
    );

    // Find or create end node
    const { node: endNode, isNew: endIsNew } = findOrCreateNode(
      previewEdge.endPoint.gridX,
      previewEdge.endPoint.gridY,
      newNetwork,
    );

    // Compute polygon offsets
    const polygonOffsets = computeEdgePolygonOffsets(
      previewEdge.centerLine,
      previewEdge.direction,
    );

    // Create edge
    const edge: RoadEdge = {
      id: generateRoadId("edge"),
      roadType,
      startNodeId: startNode.id,
      endNodeId: endNode.id,
      centerLine: previewEdge.centerLine,
      direction: previewEdge.direction,
      polygonOffsets,
    };

    // Connect edge to nodes
    startNode.connectedEdges.push(edge.id);
    endNode.connectedEdges.push(edge.id);

    // Update junction types
    startNode.junctionType = determineJunctionType(
      startNode.connectedEdges.length,
    );
    endNode.junctionType = determineJunctionType(endNode.connectedEdges.length);

    // Add to network
    newNetwork.edges[edge.id] = edge;

    if (startIsNew || newNetwork.nodes[startNode.id]) {
      newNetwork.nodes[startNode.id] = startNode;
    }
    if (endIsNew || newNetwork.nodes[endNode.id]) {
      newNetwork.nodes[endNode.id] = endNode;
    }
  }

  return newNetwork;
}

export function removeEdgeFromNetwork(
  edgeId: string,
  roadNetwork: RoadNetwork,
): RoadNetwork {
  const edge = roadNetwork.edges[edgeId];
  if (!edge) return roadNetwork;

  const newNetwork: RoadNetwork = {
    nodes: { ...roadNetwork.nodes },
    edges: { ...roadNetwork.edges },
  };

  // Remove edge
  delete newNetwork.edges[edgeId];

  // Update connected nodes
  const startNode = newNetwork.nodes[edge.startNodeId];
  const endNode = newNetwork.nodes[edge.endNodeId];

  if (startNode) {
    startNode.connectedEdges = startNode.connectedEdges.filter(
      (id) => id !== edgeId,
    );
    startNode.junctionType = determineJunctionType(
      startNode.connectedEdges.length,
    );

    if (startNode.connectedEdges.length === 0) {
      delete newNetwork.nodes[startNode.id];
    } else {
      newNetwork.nodes[startNode.id] = { ...startNode };
    }
  }

  if (endNode) {
    endNode.connectedEdges = endNode.connectedEdges.filter(
      (id) => id !== edgeId,
    );
    endNode.junctionType = determineJunctionType(endNode.connectedEdges.length);

    if (endNode.connectedEdges.length === 0) {
      delete newNetwork.nodes[endNode.id];
    } else {
      newNetwork.nodes[endNode.id] = { ...endNode };
    }
  }

  return newNetwork;
}

export function getAllRoadTiles(roadNetwork: RoadNetwork): Set<string> {
  const tiles = new Set<string>();

  for (const edge of Object.values(roadNetwork.edges)) {
    for (const point of edge.centerLine) {
      tiles.add(`${point.gridX},${point.gridY}`);
    }
  }

  return tiles;
}

export function isPointInPolygon(
  px: number,
  py: number,
  polygon: Point2D[],
): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x,
      yi = polygon[i]!.y;
    const xj = polygon[j]!.x,
      yj = polygon[j]!.y;

    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

export function getDiagonalBuildingPolygon(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  rotation: Rotation,
): Point2D[] {
  const W = width;
  const H = height;
  const boundingBoxSize = (W + H) / 2;
  const centerX = gridX + boundingBoxSize / 2;
  const centerY = gridY + boundingBoxSize / 2;

  // Scale factor matches rendering: 1/4 (since we're in grid coords, not screen)
  // Apply a small reduction to allow buildings to be placed adjacent to roads
  // without overlapping. Using 0.97 (3% smaller) instead of 0.85 to better
  // detect collisions while still allowing adjacent placement.
  const marginFactor = 0.97;
  const scale = (1 / 4) * marginFactor;

  // Base corners for 45° rotation (matching InfiniteGrid.tsx rendering)
  let corners: Point2D[] = [
    { x: centerX + (H - W) * scale, y: centerY - (W + H) * scale }, // Top
    { x: centerX + (W + H) * scale, y: centerY + (W - H) * scale }, // Right
    { x: centerX + (W - H) * scale, y: centerY + (W + H) * scale }, // Bottom
    { x: centerX - (W + H) * scale, y: centerY + (H - W) * scale }, // Left
  ];

  // Rotate corners around center for 135° (90° more than 45°)
  if (rotation !== 45) {
    const extraRotation = ((rotation - 45) * Math.PI) / 180;
    corners = corners.map((corner) => {
      const dx = corner.x - centerX;
      const dy = corner.y - centerY;
      const cos = Math.cos(extraRotation);
      const sin = Math.sin(extraRotation);
      return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    });
  }

  return corners;
}

export function segmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
): boolean {
  const epsilon = 0.01;
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  // Check for proper intersection (segments cross each other)
  // Use epsilon to avoid false positives when segments just touch
  if (
    ((d1 > epsilon && d2 < -epsilon) || (d1 < -epsilon && d2 > epsilon)) &&
    ((d3 > epsilon && d4 < -epsilon) || (d3 < -epsilon && d4 > epsilon))
  ) {
    return true;
  }

  // Skip collinear/touching cases - we don't want to detect touching edges as collisions
  return false;
}

export function direction(p1: Point2D, p2: Point2D, p3: Point2D): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

export function polygonsIntersect(poly1: Point2D[], poly2: Point2D[]): boolean {
  // Check if any edge of poly1 intersects any edge of poly2
  for (let i = 0; i < poly1.length; i++) {
    const p1 = poly1[i]!;
    const p2 = poly1[(i + 1) % poly1.length]!;

    for (let j = 0; j < poly2.length; j++) {
      const p3 = poly2[j]!;
      const p4 = poly2[(j + 1) % poly2.length]!;

      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }

  // Check if any point of poly1 is inside poly2
  for (const p of poly1) {
    if (isPointInPolygon(p.x, p.y, poly2)) {
      return true;
    }
  }

  // Check if any point of poly2 is inside poly1
  for (const p of poly2) {
    if (isPointInPolygon(p.x, p.y, poly1)) {
      return true;
    }
  }

  return false;
}

export function getAxisAlignedBuildingPolygon(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  _rotation: Rotation,
): Point2D[] {
  // Use width/height directly - they're already adjusted for rotation
  // by getAdjustedSize() before being passed to buildingCollidesWithRoads()

  // Small margin to allow buildings to be placed adjacent to roads without overlapping
  // Reduced from 0.15 to 0.05 to better detect actual collisions
  const margin = 0.05;

  return [
    { x: gridX + margin, y: gridY + margin },
    { x: gridX + width - margin, y: gridY + margin },
    { x: gridX + width - margin, y: gridY + height - margin },
    { x: gridX + margin, y: gridY + height - margin },
  ];
}

export function getRoadCollisionQuad(
  left: Point2D[],
  right: Point2D[],
): Point2D[] {
  if (left.length < 2 || right.length < 2) return [];

  // Use first and last points from each side to form a quadrilateral
  const startLeft = left[0]!;
  const endLeft = left[left.length - 1]!;
  const startRight = right[0]!;
  const endRight = right[right.length - 1]!;

  // Form a quadrilateral: startLeft -> endLeft -> endRight -> startRight
  return [startLeft, endLeft, endRight, startRight];
}

export function buildingCollidesWithRoads(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  roadNetwork: RoadNetwork,
  rotation: Rotation = 0,
): boolean {
  // Get building polygon based on rotation
  const buildingPolygon =
    rotation === 0 || rotation === 90
      ? getAxisAlignedBuildingPolygon(gridX, gridY, width, height, rotation)
      : getDiagonalBuildingPolygon(gridX, gridY, width, height, rotation);

  // For each edge, check collision using polygon intersection
  for (const edge of Object.values(roadNetwork.edges)) {
    // Get the road polygon (in grid coordinates)
    const { left, right } = edge.polygonOffsets;
    if (left.length < 2 || right.length < 2) continue;

    // Build a simple quadrilateral from road offsets for more reliable collision
    const roadQuad = getRoadCollisionQuad(left, right);
    if (roadQuad.length < 4) continue;

    // Check if polygons intersect using standard polygon intersection
    if (polygonsIntersect(buildingPolygon, roadQuad)) {
      return true;
    }

    // Additional check: For diagonal roads passing through large buildings,
    // the road quad vertices may all be outside the building, and the building
    // vertices may all be outside the narrow road quad.
    // When both polygons are at 45°, edges are parallel and don't intersect.
    // To catch this case, check if any road points are inside the building.

    // Check all road center line points
    for (const centerPoint of edge.centerLine) {
      const px = centerPoint.gridX + 0.5;
      const py = centerPoint.gridY + 0.5;
      if (isPointInPolygon(px, py, buildingPolygon)) {
        return true;
      }
    }

    // Check all road polygon offset points (left and right edges)
    // This catches cases where the road clips a corner of the building
    for (const point of left) {
      if (isPointInPolygon(point.x, point.y, buildingPolygon)) {
        return true;
      }
    }
    for (const point of right) {
      if (isPointInPolygon(point.x, point.y, buildingPolygon)) {
        return true;
      }
    }
  }

  return false;
}

export function getRoadEdgeAtPosition(
  worldX: number,
  worldY: number,
  cellSize: number,
  roadNetwork: RoadNetwork,
): RoadEdge | null {
  const gridX = Math.floor(worldX / cellSize);
  const gridY = Math.floor(worldY / cellSize);

  for (const edge of Object.values(roadNetwork.edges)) {
    for (const point of edge.centerLine) {
      if (point.gridX === gridX && point.gridY === gridY) {
        return edge;
      }
    }
  }

  return null;
}

export function computeEdgePolygon(
  edge: RoadEdge,
  _cellSize: number,
  gridToScreen: (gridX: number, gridY: number) => { x: number; y: number },
): Point2D[] {
  const { left, right } = edge.polygonOffsets;

  // Build polygon: left side forward, right side backward
  const polygon: Point2D[] = [];

  // Add left side points
  for (const point of left) {
    const screen = gridToScreen(point.x, point.y);
    polygon.push({ x: screen.x, y: screen.y });
  }

  // Add right side points in reverse
  for (let i = right.length - 1; i >= 0; i--) {
    const point = right[i];
    const screen = gridToScreen(point!.x, point!.y);
    polygon.push({ x: screen.x, y: screen.y });
  }

  return polygon;
}

export function getEdgeEndpointAtNode(
  edge: RoadEdge,
  node: RoadNode,
  gridToScreen: (gridX: number, gridY: number) => { x: number; y: number },
): { left: Point2D; right: Point2D; angle: number } | null {
  const isStart = edge.startNodeId === node.id;
  const { left: leftOffsets, right: rightOffsets } = edge.polygonOffsets;

  if (leftOffsets.length === 0 || rightOffsets.length === 0) return null;

  // Get the endpoint offset points
  const leftPoint = isStart
    ? leftOffsets[0]
    : leftOffsets[leftOffsets.length - 1];
  const rightPoint = isStart
    ? rightOffsets[0]
    : rightOffsets[rightOffsets.length - 1];

  // Convert to screen coordinates
  const left = gridToScreen(leftPoint!.x, leftPoint!.y);
  const right = gridToScreen(rightPoint!.x, rightPoint!.y);

  // Get the direction angle (pointing outward from node)
  let direction = edge.direction;
  if (!isStart) {
    direction = getOppositeDirection(direction);
  }
  const angle = getDirectionAngle(direction);

  return { left, right, angle };
}

export function quadraticBezierPoints(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  segments = 8,
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return points;
}

export function computeJunctionPolygon(
  node: RoadNode,
  roadNetwork: RoadNetwork,
  _cellSize: number,
  gridToScreen: (gridX: number, gridY: number) => { x: number; y: number },
): Point2D[] | null {
  if (node.connectedEdges.length < 2) return null;

  const center = gridToScreen(node.gridX + 0.5, node.gridY + 0.5);

  // Collect all edge endpoints at this node
  const edgeEndpoints: {
    left: Point2D;
    right: Point2D;
    angle: number;
    edge: RoadEdge;
  }[] = [];

  for (const edgeId of node.connectedEdges) {
    const edge = roadNetwork.edges[edgeId];
    if (!edge) continue;

    const endpoint = getEdgeEndpointAtNode(edge, node, gridToScreen);
    if (endpoint) {
      edgeEndpoints.push({ ...endpoint, edge });
    }
  }

  if (edgeEndpoints.length < 2) return null;

  // Sort by angle
  edgeEndpoints.sort((a, b) => a.angle - b.angle);

  // Build junction polygon with smooth curves between edges
  const polygon: Point2D[] = [];

  for (let i = 0; i < edgeEndpoints.length; i++) {
    const current = edgeEndpoints[i]!;
    const next = edgeEndpoints[(i + 1) % edgeEndpoints.length]!;

    // Add the right point of current edge
    polygon.push(current.right);

    // Calculate angle difference to determine if we need a curve
    let angleDiff = next.angle - current.angle;
    if (angleDiff < 0) angleDiff += 2 * Math.PI;

    // If there's a significant angle between edges, add a smooth curve
    if (angleDiff > 0.1 && angleDiff < Math.PI * 1.9) {
      // Create a bezier curve from current.right to next.left using center as control
      const curvePoints = quadraticBezierPoints(
        current.right,
        center,
        next.left,
        6,
      );
      // Add intermediate curve points (skip first and last as they're the endpoints)
      for (let j = 1; j < curvePoints.length - 1; j++) {
        polygon.push(curvePoints[j]!);
      }
    }

    // Add the left point of next edge
    polygon.push(next.left);
  }

  return polygon.length >= 3 ? polygon : null;
}

export function computePreviewEdgePolygon(
  previewEdge: RoadPreview["edges"][0],
  _cellSize: number,
  gridToScreen: (gridX: number, gridY: number) => { x: number; y: number },
): Point2D[] {
  const offsets = computeEdgePolygonOffsets(
    previewEdge.centerLine,
    previewEdge.direction,
  );

  const polygon: Point2D[] = [];

  // Add left side points
  for (const point of offsets.left) {
    const screen = gridToScreen(point.x, point.y);
    polygon.push({ x: screen.x, y: screen.y });
  }

  // Add right side points in reverse
  for (let i = offsets.right.length - 1; i >= 0; i--) {
    const point = offsets.right[i]!;
    const screen = gridToScreen(point.x, point.y);
    polygon.push({ x: screen.x, y: screen.y });
  }

  return polygon;
}
