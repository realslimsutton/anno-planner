import type { LayoutData } from "@/server/db/schema/layouts";
import type { PlacedBuilding, RoadNetwork } from "@/types/editor";
import { useMemo, useRef, useState } from "react";

import type { PreviewCanvasRef } from "./canvas";
import { useGameData } from "@/components/providers/game-data-provider";
import { INITIAL_ROAD_NETWORK } from "@/lib/constants";
import { getAdjustedSize, getDirectionFromDelta } from "@/lib/editor";
import {
  computeEdgePolygonOffsets,
  determineJunctionType,
} from "@/lib/editor/road";
import { PreviewCanvas } from "./canvas";
import { PreviewHeader } from "./header";
import { PreviewZoomControls } from "./zoom-controls";

type PreviewEditorProps = {
  layoutTitle: string;
  layoutHash: string;
  layoutData: LayoutData | null | undefined;
  showHeader?: boolean;
  showZoomControls?: boolean;
  autoFit?: boolean;
};

export function PreviewEditor({
  layoutTitle,
  layoutHash,
  layoutData,
  showHeader = true,
  showZoomControls = true,
  autoFit = false,
}: PreviewEditorProps) {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<PreviewCanvasRef>(null);

  const { buildingsMap } = useGameData();

  // Convert layout data to placed buildings and road network
  const { placedBuildings, roadNetwork } = useMemo(() => {
    if (!layoutData) {
      return { placedBuildings: [], roadNetwork: INITIAL_ROAD_NETWORK };
    }

    // Restore buildings
    const placedBuildings: PlacedBuilding[] = [];
    for (const dbBuilding of layoutData.buildings) {
      const buildingDef = buildingsMap[dbBuilding.buildingId];
      if (!buildingDef) continue;

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

    // Create nodes
    const nodesById: Record<string, (typeof roadNetwork.nodes)[string]> = {};
    for (const dbNode of layoutData.roads) {
      nodesById[dbNode.id] = {
        id: dbNode.id,
        gridX: dbNode.x,
        gridY: dbNode.y,
        connectedEdges: [],
        junctionType: "endpoint",
      };
    }

    // Restore edges
    if (layoutData.roadEdges && layoutData.roadEdges.length > 0) {
      for (const dbEdge of layoutData.roadEdges) {
        const centerLine = dbEdge.centerLine.map((point) => ({
          gridX: point.x,
          gridY: point.y,
        }));

        const firstPoint = centerLine[0];
        const lastPoint = centerLine[centerLine.length - 1];
        let direction = getDirectionFromDelta(
          lastPoint!.gridX - firstPoint!.gridX,
          lastPoint!.gridY - firstPoint!.gridY,
        );

        direction ??= "E";

        const polygonOffsets = computeEdgePolygonOffsets(centerLine, direction);

        const edge = {
          id: dbEdge.id,
          roadType: dbEdge.roadType,
          startNodeId: dbEdge.startNodeId,
          endNodeId: dbEdge.endNodeId,
          centerLine,
          direction,
          polygonOffsets,
        };

        roadNetwork.edges[edge.id] = edge;

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

    // Calculate junction types
    for (const node of Object.values(nodesById)) {
      node.junctionType = determineJunctionType(node.connectedEdges.length);
      roadNetwork.nodes[node.id] = node;
    }

    return { placedBuildings, roadNetwork };
  }, [layoutData, buildingsMap]);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleFitToContent = () => {
    canvasRef.current?.fitToContent();
  };

  const handleZoomFromControls = (newZoom: number) => {
    canvasRef.current?.setZoom(newZoom);
    setZoom(newZoom);
  };

  return (
    <div className="flex h-screen flex-col">
      {showHeader && (
        <PreviewHeader
          layoutTitle={layoutTitle}
          layoutHash={layoutHash}
          isCollapsed={isHeaderCollapsed}
          onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
        />
      )}

      <div
        className="relative flex-1"
        style={{ marginTop: showHeader && !isHeaderCollapsed ? 56 : 0 }}
      >
        <PreviewCanvas
          ref={canvasRef}
          placedBuildings={placedBuildings}
          roadNetwork={roadNetwork}
          autoFit={autoFit}
          onZoomChange={handleZoomChange}
        />

        {showZoomControls && (
          <PreviewZoomControls
            zoom={zoom}
            onZoomChange={handleZoomFromControls}
            onFitToContent={handleFitToContent}
          />
        )}
      </div>
    </div>
  );
}

// Export components for individual use
export { PreviewCanvas, type PreviewCanvasRef } from "./canvas";
export { PreviewHeader } from "./header";
export { PreviewZoomControls } from "./zoom-controls";
