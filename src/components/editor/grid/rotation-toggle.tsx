import type { Rotation } from "@/types/editor";
import { RotateCcw, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/stores/editor";

export function RotationToggle() {
  const mode = useEditorStore((state) => state.mode);
  const selectedBuilding = useEditorStore((state) => state.selectedBuilding);
  const ghostRotation = useEditorStore((state) => state.ghostRotation);
  const cycleGhostRotation = useEditorStore(
    (state) => state.cycleGhostRotation,
  );
  const movingBuildings = useEditorStore((state) => state.movingBuildings);
  const moveRotationDelta = useEditorStore((state) => state.moveRotationDelta);
  const cycleMoveRotation = useEditorStore((state) => state.cycleMoveRotation);

  // Show when in place mode with a building selected
  const showForPlaceMode = mode === "place" && selectedBuilding;
  // Show when in move mode with buildings being moved
  const showForMoveMode = mode === "move" && movingBuildings.length > 0;

  if (!showForPlaceMode && !showForMoveMode) return null;

  // Determine which rotation value and handler to use
  let currentRotation: Rotation | "mixed" = ghostRotation;
  const handleRotate = showForMoveMode ? cycleMoveRotation : cycleGhostRotation;

  if (showForMoveMode) {
    // For move mode, calculate the effective rotation
    if (movingBuildings.length === 1) {
      // Single building - show its effective rotation (original + delta)
      const originalRotation = movingBuildings[0]!.rotation;
      const totalRotation = originalRotation + moveRotationDelta;
      currentRotation = (((totalRotation % 180) + 180) % 180) as Rotation;
    } else {
      // Multiple buildings - check if they all have the same rotation
      const rotations = new Set(
        movingBuildings.map((s) => {
          const totalRotation = s.rotation + moveRotationDelta;
          return ((totalRotation % 180) + 180) % 180;
        }),
      );
      if (rotations.size === 1) {
        currentRotation = [...rotations][0] as Rotation;
      } else {
        currentRotation = "mixed";
      }
    }
  }

  return (
    <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-2 shadow-lg backdrop-blur-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              onClick={() => handleRotate(-1)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            <span>Rotate counter-clockwise</span>
            <Kbd>Q</Kbd>
          </TooltipContent>
        </Tooltip>

        <div className="flex min-w-[60px] items-center justify-center rounded-md bg-neutral-800 px-2 py-1">
          <span className="font-medium text-white tabular-nums">
            {currentRotation === "mixed" ? "Mixed" : `${currentRotation}°`}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              onClick={() => handleRotate(1)}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            <span>Rotate clockwise</span>
            <Kbd>R</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
