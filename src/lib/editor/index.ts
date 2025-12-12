import type {
  BuildingPreview,
  HistorySnapshot,
  PlacedBuilding,
  RoadDirection,
  RoadEdge,
  RoadNetwork,
  RoadNode,
  Rotation,
} from "@/types/editor";

import { buildingCollidesWithRoads } from "./road";

export function isDiagonalDirection(direction: RoadDirection): boolean {
  return (
    direction === "NE" ||
    direction === "NW" ||
    direction === "SE" ||
    direction === "SW"
  );
}

export function getDirectionVector(direction: RoadDirection): {
  dx: number;
  dy: number;
} {
  switch (direction) {
    case "N":
      return { dx: 0, dy: -1 };
    case "S":
      return { dx: 0, dy: 1 };
    case "E":
      return { dx: 1, dy: 0 };
    case "W":
      return { dx: -1, dy: 0 };
    case "NE":
      return { dx: 1, dy: -1 };
    case "NW":
      return { dx: -1, dy: -1 };
    case "SE":
      return { dx: 1, dy: 1 };
    case "SW":
      return { dx: -1, dy: 1 };
  }
}

export function getOppositeDirection(direction: RoadDirection): RoadDirection {
  switch (direction) {
    case "N":
      return "S";
    case "S":
      return "N";
    case "E":
      return "W";
    case "W":
      return "E";
    case "NE":
      return "SW";
    case "NW":
      return "SE";
    case "SE":
      return "NW";
    case "SW":
      return "NE";
  }
}

export function getDirectionFromDelta(
  dx: number,
  dy: number,
): RoadDirection | null {
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (sx === 0 && sy === -1) return "N";
  if (sx === 0 && sy === 1) return "S";
  if (sx === 1 && sy === 0) return "E";
  if (sx === -1 && sy === 0) return "W";
  if (sx === 1 && sy === -1) return "NE";
  if (sx === -1 && sy === -1) return "NW";
  if (sx === 1 && sy === 1) return "SE";
  if (sx === -1 && sy === 1) return "SW";

  return null;
}

export function getDirectionAngle(direction: RoadDirection): number {
  switch (direction) {
    case "E":
      return 0;
    case "NE":
      return Math.PI / 4;
    case "N":
      return Math.PI / 2;
    case "NW":
      return (3 * Math.PI) / 4;
    case "W":
      return Math.PI;
    case "SW":
      return (5 * Math.PI) / 4;
    case "S":
      return (3 * Math.PI) / 2;
    case "SE":
      return (7 * Math.PI) / 4;
  }
}

export function cloneRoadNetwork(network: RoadNetwork): RoadNetwork {
  return {
    nodes: JSON.parse(JSON.stringify(network.nodes)) as Record<
      string,
      RoadNode
    >,
    edges: JSON.parse(JSON.stringify(network.edges)) as Record<
      string,
      RoadEdge
    >,
  };
}

export function createSnapshot(
  placedBuildings: PlacedBuilding[],
  roadNetwork: RoadNetwork,
): HistorySnapshot {
  return {
    placedBuildings: JSON.parse(
      JSON.stringify(placedBuildings),
    ) as PlacedBuilding[],
    roadNetwork: cloneRoadNetwork(roadNetwork),
  };
}

export function getBuildingGeometry(building: {
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  rotation?: Rotation;
}): {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation: Rotation;
} {
  const rotation = building.rotation ?? 0;

  if (isDiagonalRotation(rotation)) {
    // For diagonal buildings, gridX/gridY is top-left of bounding box
    const boundingBoxSize = (building.width + building.height) / 2;
    return {
      centerX: building.gridX + boundingBoxSize / 2,
      centerY: building.gridY + boundingBoxSize / 2,
      width: building.width,
      height: building.height,
      rotation,
    };
  } else {
    // For axis-aligned buildings
    return {
      centerX: building.gridX + building.width / 2,
      centerY: building.gridY + building.height / 2,
      width: building.width,
      height: building.height,
      rotation,
    };
  }
}

export function buildingsOverlap(
  a:
    | PlacedBuilding
    | {
        gridX: number;
        gridY: number;
        width: number;
        height: number;
        rotation?: Rotation;
      },
  b:
    | PlacedBuilding
    | {
        gridX: number;
        gridY: number;
        width: number;
        height: number;
        rotation?: Rotation;
      },
): boolean {
  const geoA = getBuildingGeometry(a);
  const geoB = getBuildingGeometry(b);

  // Small epsilon to allow buildings to touch without overlapping
  const epsilon = 0.01;

  const isADiagonal = isDiagonalRotation(geoA.rotation);
  const isBDiagonal = isDiagonalRotation(geoB.rotation);

  if (!isADiagonal && !isBDiagonal) {
    // Both axis-aligned: simple AABB collision
    const dx = Math.abs(geoA.centerX - geoB.centerX);
    const dy = Math.abs(geoA.centerY - geoB.centerY);
    const halfWidthSum = (geoA.width + geoB.width) / 2;
    const halfHeightSum = (geoA.height + geoB.height) / 2;
    return dx < halfWidthSum - epsilon && dy < halfHeightSum - epsilon;
  }

  if (isADiagonal && isBDiagonal) {
    // Both diagonal: check collision in rotated coordinate system
    // For 45° rotated rectangles, we check overlap in (u, v) space where:
    //   u = x + y (diagonal axis)
    //   v = y - x (perpendicular diagonal axis)
    //
    // The actual rendered building has extents of W/2 along u-axis and H/2 along v-axis
    // (based on the 1/4 scale factor used in rendering)

    const u1 = geoA.centerX + geoA.centerY;
    const v1 = geoA.centerY - geoA.centerX;
    const u2 = geoB.centerX + geoB.centerY;
    const v2 = geoB.centerY - geoB.centerX;

    const du = Math.abs(u1 - u2);
    const dv = Math.abs(v1 - v2);

    // Get half-extent along each axis based on rotation angle
    // The rendered polygon extends W/2 in u-direction and H/2 in v-direction (for 45°)
    // 45°: u-extent = width/2, v-extent = height/2
    // 135°: u-extent = height/2, v-extent = width/2 (rotated 90° more)
    const aExtentU = geoA.rotation === 45 ? geoA.width / 2 : geoA.height / 2;
    const aExtentV = geoA.rotation === 45 ? geoA.height / 2 : geoA.width / 2;
    const bExtentU = geoB.rotation === 45 ? geoB.width / 2 : geoB.height / 2;
    const bExtentV = geoB.rotation === 45 ? geoB.height / 2 : geoB.width / 2;

    // Sum of half-extents for collision detection
    const halfUSum = aExtentU + bExtentU;
    const halfVSum = aExtentV + bExtentV;

    return du < halfUSum - epsilon && dv < halfVSum - epsilon;
  }

  // Mixed: one diagonal, one axis-aligned
  // Use Separating Axis Theorem with 4 axes (2 from each building)
  const diagonal = isADiagonal ? geoA : geoB;
  const aligned = isADiagonal ? geoB : geoA;

  // Check all 4 separating axes
  const dx = Math.abs(diagonal.centerX - aligned.centerX);
  const dy = Math.abs(diagonal.centerY - aligned.centerY);

  // Axis 1 & 2: Aligned building's axes (standard x, y)
  // The diagonal building's bounding box is (W+H)/2 x (W+H)/2
  // But the actual building only extends to the corners, which are at (W+H)/4 from center in x and y
  const diagExtentXY = (diagonal.width + diagonal.height) / 4;
  if (dx >= diagExtentXY + aligned.width / 2 - epsilon) return false;
  if (dy >= diagExtentXY + aligned.height / 2 - epsilon) return false;

  // Axis 3 & 4: Diagonal building's axes (u = x+y, v = y-x)
  const u1 = diagonal.centerX + diagonal.centerY;
  const v1 = diagonal.centerY - diagonal.centerX;
  const u2 = aligned.centerX + aligned.centerY;
  const v2 = aligned.centerY - aligned.centerX;

  const du = Math.abs(u1 - u2);
  const dv = Math.abs(v1 - v2);

  // Aligned rectangle projected onto diagonal axes
  // A W×H axis-aligned rect has extent (W+H)/2 along both u and v axes
  const alignedDiagExtent = (aligned.width + aligned.height) / 2;

  // Get diagonal building's half-extent along each axis based on rotation
  // The rendered polygon extends W/2 in u-direction and H/2 in v-direction (for 45°)
  const diagExtentU =
    diagonal.rotation === 45 ? diagonal.width / 2 : diagonal.height / 2;
  const diagExtentV =
    diagonal.rotation === 45 ? diagonal.height / 2 : diagonal.width / 2;

  if (du >= diagExtentU + alignedDiagExtent - epsilon) return false;
  if (dv >= diagExtentV + alignedDiagExtent - epsilon) return false;

  return true;
}

export function isDiagonalRotation(rotation: Rotation): boolean {
  return rotation % 90 !== 0;
}

export function getAdjustedSize(
  baseWidth: number,
  baseHeight: number,
  rotation: Rotation,
): { adjustedWidth: number; adjustedHeight: number } {
  // Axis-aligned rotations (0°, 90°)
  if (!isDiagonalRotation(rotation)) {
    // For 90°, swap width and height
    if (rotation === 90) {
      return { adjustedWidth: baseHeight, adjustedHeight: baseWidth };
    }
    // For 0°, dimensions stay the same
    return { adjustedWidth: baseWidth, adjustedHeight: baseHeight };
  }

  // For diagonal rotations (45°, 135°), the building becomes a ROTATED RECTANGLE.
  // Scale each dimension by √2 and round to the nearest integer.
  // This determines which grid lines are closest to the rotated building's edges.
  //
  // Examples:
  //   1×1: round(1×√2)=1 × round(1×√2)=1 → 1×1
  //   2×2: round(2×√2)=3 × round(2×√2)=3 → 3×3
  //   3×8: round(3×√2)=4 × round(8×√2)=11 → 4×11
  //   5×6: round(5×√2)=7 × round(6×√2)=8 → 7×8
  //   6×6: round(6×√2)=8 × round(6×√2)=8 → 8×8
  const adjustedWidth = Math.max(1, Math.round(baseWidth * Math.SQRT2));
  const adjustedHeight = Math.max(1, Math.round(baseHeight * Math.SQRT2));

  return { adjustedWidth, adjustedHeight };
}

export function calculateSnappedPosition(
  worldX: number,
  worldY: number,
  cellSize: number,
  buildingWidth: number,
  buildingHeight: number,
  rotation: Rotation,
): {
  gridX: number;
  gridY: number;
  adjustedWidth: number;
  adjustedHeight: number;
} {
  const { adjustedWidth, adjustedHeight } = getAdjustedSize(
    buildingWidth,
    buildingHeight,
    rotation,
  );

  // Axis-aligned rotations (0°, 90°)
  if (!isDiagonalRotation(rotation)) {
    const centerGridX = worldX / cellSize;
    const centerGridY = worldY / cellSize;
    const gridX = Math.round(centerGridX - adjustedWidth / 2);
    const gridY = Math.round(centerGridY - adjustedHeight / 2);
    return { gridX, gridY, adjustedWidth, adjustedHeight };
  } else {
    const centerGridX = worldX / cellSize;
    const centerGridY = worldY / cellSize;

    // For diagonal rotations, we need to snap so that CORNERS land on grid intersections.
    // Corner positions depend on the rotation angle.
    //
    // At 45°, the corners relative to center are:
    //   Top: ((H-W)/4, -(W+H)/4)
    //   Right: ((W+H)/4, (W-H)/4)
    //   Bottom: ((W-H)/4, (W+H)/4)
    //   Left: (-(W+H)/4, (H-W)/4)
    //
    // At 135° (90° more), corners rotate: each offset (x,y) becomes (y, -x)
    // So the leftmost corner changes based on rotation.

    const W = adjustedWidth;
    const H = adjustedHeight;

    // Calculate corner offsets based on rotation
    // For 45°: use standard offsets
    // For 135°: rotate offsets 90° clockwise (x,y) → (y, -x)
    let leftCornerOffsetX: number;
    let leftCornerOffsetY: number;

    if (rotation === 45) {
      // Left corner offset at 45°
      leftCornerOffsetX = -(W + H) / 4;
      leftCornerOffsetY = (H - W) / 4;
    } else {
      // At 135°, the leftmost corner is what was "Right" at 45° rotated 90° CW
      // Right at 45°: ((W+H)/4, (W-H)/4)
      // Rotated 90° CW: ((W-H)/4, -(W+H)/4)
      // But we need the leftmost, which is the one with smallest x after rotation
      // After 90° CW rotation of all corners, the new leftmost is at:
      // Original Top ((H-W)/4, -(W+H)/4) → 90° CW → (-(W+H)/4, -(H-W)/4)
      leftCornerOffsetX = -(W + H) / 4;
      leftCornerOffsetY = -(H - W) / 4;
    }

    // Calculate where the leftmost corner would be if center was at cursor
    const leftCornerX = centerGridX + leftCornerOffsetX;
    const leftCornerY = centerGridY + leftCornerOffsetY;

    // Snap left corner to nearest grid intersection (int,int or half,half)
    const nearestCornerX = Math.round(leftCornerX);
    const nearestCornerY = Math.round(leftCornerY);
    const nearestCenterX = Math.floor(leftCornerX) + 0.5;
    const nearestCenterY = Math.floor(leftCornerY) + 0.5;

    const distToCorner = Math.hypot(
      leftCornerX - nearestCornerX,
      leftCornerY - nearestCornerY,
    );
    const distToCenter = Math.hypot(
      leftCornerX - nearestCenterX,
      leftCornerY - nearestCenterY,
    );

    let snappedLeftX: number;
    let snappedLeftY: number;

    if (distToCorner <= distToCenter) {
      snappedLeftX = nearestCornerX;
      snappedLeftY = nearestCornerY;
    } else {
      snappedLeftX = nearestCenterX;
      snappedLeftY = nearestCenterY;
    }

    // Calculate center from snapped left corner
    const snappedCenterX = snappedLeftX - leftCornerOffsetX;
    const snappedCenterY = snappedLeftY - leftCornerOffsetY;

    // The actual bounding box of a rotated rectangle is (W+H)/2 × (W+H)/2 (always square)
    const actualBoundingBoxSize = (W + H) / 2;
    const gridX = snappedCenterX - actualBoundingBoxSize / 2;
    const gridY = snappedCenterY - actualBoundingBoxSize / 2;
    return { gridX, gridY, adjustedWidth, adjustedHeight };
  }
}

export function isValidPlacement(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  placedBuildings: PlacedBuilding[],
  excludeId?: string,
  rotation: Rotation = 0,
  roadNetwork?: RoadNetwork,
): boolean {
  const newBuilding = { gridX, gridY, width, height, rotation };

  // Check collision with existing buildings
  const collidesWithBuildings = placedBuildings.some((existing) => {
    if (excludeId && existing.id === excludeId) return false;
    return buildingsOverlap(existing, newBuilding);
  });

  if (collidesWithBuildings) return false;

  // Check collision with roads (if roadNetwork is provided)
  if (roadNetwork) {
    if (
      buildingCollidesWithRoads(
        gridX,
        gridY,
        width,
        height,
        roadNetwork,
        rotation,
      )
    ) {
      return false;
    }
  }

  return true;
}

export function calculateBulkBuildings(
  start: { gridX: number; gridY: number },
  end: { gridX: number; gridY: number },
  buildingWidth: number,
  buildingHeight: number,
  rotation: Rotation,
  color: number,
  buildingId: number,
  existingBuildings: PlacedBuilding[],
  roadNetwork?: RoadNetwork,
): PlacedBuilding[] {
  const buildings: PlacedBuilding[] = [];
  const allBuildings = [...existingBuildings];

  const minX = Math.min(start.gridX, end.gridX);
  const maxX = Math.max(start.gridX, end.gridX);
  const minY = Math.min(start.gridY, end.gridY);
  const maxY = Math.max(start.gridY, end.gridY);

  const cols = Math.floor((maxX - minX) / buildingWidth) + 1;
  const rows = Math.floor((maxY - minY) / buildingHeight) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gridX = minX + col * buildingWidth;
      const gridY = minY + row * buildingHeight;

      const newBuilding = {
        gridX,
        gridY,
        width: buildingWidth,
        height: buildingHeight,
        rotation,
      };
      const hasCollision = allBuildings.some((existing) =>
        buildingsOverlap(existing, newBuilding),
      );

      // Also check for road collisions
      const hasRoadCollision = roadNetwork
        ? buildingCollidesWithRoads(
            gridX,
            gridY,
            buildingWidth,
            buildingHeight,
            roadNetwork,
            rotation,
          )
        : false;

      if (!hasCollision && !hasRoadCollision) {
        const building: PlacedBuilding = {
          id: generateBuildingId(),
          buildingId,
          gridX,
          gridY,
          width: buildingWidth,
          height: buildingHeight,
          rotation,
          color,
        };
        buildings.push(building);
        allBuildings.push(building);
      }
    }
  }

  return buildings;
}

export function getBulkPreviewBuildings(
  start: { gridX: number; gridY: number } | null,
  end: { gridX: number; gridY: number } | null,
  buildingWidth: number,
  buildingHeight: number,
  existingBuildings: PlacedBuilding[],
  rotation: Rotation = 0,
  roadNetwork?: RoadNetwork,
): BuildingPreview[] {
  if (!start || !end) return [];

  const buildings: BuildingPreview[] = [];
  const allBuildings = [...existingBuildings];

  const minX = Math.min(start.gridX, end.gridX);
  const maxX = Math.max(start.gridX, end.gridX);
  const minY = Math.min(start.gridY, end.gridY);
  const maxY = Math.max(start.gridY, end.gridY);

  const cols = Math.floor((maxX - minX) / buildingWidth) + 1;
  const rows = Math.floor((maxY - minY) / buildingHeight) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gridX = minX + col * buildingWidth;
      const gridY = minY + row * buildingHeight;

      const newBuilding = {
        gridX,
        gridY,
        width: buildingWidth,
        height: buildingHeight,
        rotation,
      };
      const hasCollision = allBuildings.some((existing) =>
        buildingsOverlap(existing, newBuilding),
      );

      // Also check for road collisions
      const hasRoadCollision = roadNetwork
        ? buildingCollidesWithRoads(
            gridX,
            gridY,
            buildingWidth,
            buildingHeight,
            roadNetwork,
            rotation,
          )
        : false;

      const isValid = !hasCollision && !hasRoadCollision;

      buildings.push({
        gridX,
        gridY,
        width: buildingWidth,
        height: buildingHeight,
        isValid,
      });

      if (isValid) {
        allBuildings.push(newBuilding as PlacedBuilding);
      }
    }
  }

  return buildings;
}

export function isPointInBuilding(
  pointX: number,
  pointY: number,
  building: PlacedBuilding,
): boolean {
  const rotation = building.rotation;

  if (!isDiagonalRotation(rotation)) {
    // Axis-aligned: simple bounding box check
    return (
      pointX >= building.gridX &&
      pointX < building.gridX + building.width &&
      pointY >= building.gridY &&
      pointY < building.gridY + building.height
    );
  }

  // For diagonal buildings, the actual building is a rotated rectangle inside a square bounding box.
  // We need to check if the point is inside the rotated rectangle, not the bounding box.
  //
  // The bounding box is a square with size (width + height) / 2.
  // The center of the building is at the center of the bounding box.
  // We transform the point to the building's rotated coordinate system (u, v) where:
  //   u = x + y (diagonal axis along the width direction at 45°)
  //   v = y - x (perpendicular diagonal axis along the height direction at 45°)
  //
  // At 45°: Width extends along u-axis, Height extends along v-axis
  // At 135° (90° more): Axes are swapped - Width along v-axis, Height along u-axis

  const W = building.width;
  const H = building.height;
  const boundingBoxSize = (W + H) / 2;
  const centerX = building.gridX + boundingBoxSize / 2;
  const centerY = building.gridY + boundingBoxSize / 2;

  // Transform point to diagonal coordinate system (centered on building)
  const relX = pointX - centerX;
  const relY = pointY - centerY;

  // u = x + y, v = y - x (in rotated coordinate system)
  const u = relX + relY;
  const v = relY - relX;

  // Get extents along each axis based on rotation
  // The building extends W/2 along one diagonal and H/2 along the other
  // At 45°: u-extent = W/2, v-extent = H/2
  // At 135°: u-extent = H/2, v-extent = W/2 (rotated 90° more)
  const uExtent = rotation === 45 ? W / 2 : H / 2;
  const vExtent = rotation === 45 ? H / 2 : W / 2;

  // Check if point is inside the rotated rectangle
  return Math.abs(u) < uExtent && Math.abs(v) < vExtent;
}

export function getBuildingAtPosition(
  worldX: number,
  worldY: number,
  cellSize: number,
  placedBuildings: PlacedBuilding[],
): PlacedBuilding | null {
  const gridX = worldX / cellSize;
  const gridY = worldY / cellSize;

  // Find building that contains this point (reverse order to get topmost)
  for (let i = placedBuildings.length - 1; i >= 0; i--) {
    const building = placedBuildings[i];
    if (building && isPointInBuilding(gridX, gridY, building)) {
      return building;
    }
  }

  return null;
}

export function generateBuildingId(): string {
  return `building-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
