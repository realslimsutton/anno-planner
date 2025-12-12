import { useEffect } from "react";

import { useEditorStore } from "@/stores/editor";
import { GridCanvas } from "./canvas";
import { ModeToggle } from "./mode-toggle";
import { MoveConfirmDialog } from "./move-confirm-dialog";
import { RotationToggle } from "./rotation-toggle";
import { ZoomControls } from "./zoom-controls";

export function GridEditor() {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const cycleGhostRotation = useEditorStore(
    (state) => state.cycleGhostRotation,
  );
  const cycleMoveRotation = useEditorStore((state) => state.cycleMoveRotation);
  const isBulkPlacing = useEditorStore((state) => state.isBulkPlacing);
  const cancelBulkPlacement = useEditorStore(
    (state) => state.cancelBulkPlacement,
  );
  const deleteSelectedBuildings = useEditorStore(
    (state) => state.deleteSelectedBuildings,
  );
  const selectedBuildingIds = useEditorStore(
    (state) => state.selectedBuildingIds,
  );
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const cancelMove = useEditorStore((state) => state.cancelMove);
  const movingBuildings = useEditorStore((state) => state.movingBuildings);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // R to rotate clockwise, Q to rotate counter-clockwise when placing
      if (
        (e.key === "r" || e.key === "R") &&
        mode === "place" &&
        !isBulkPlacing
      ) {
        e.preventDefault();
        cycleGhostRotation(1); // clockwise
      }
      if (
        (e.key === "q" || e.key === "Q") &&
        mode === "place" &&
        !isBulkPlacing
      ) {
        e.preventDefault();
        cycleGhostRotation(-1); // counter-clockwise
      }

      // R/Q to rotate when moving buildings
      if (
        (e.key === "r" || e.key === "R") &&
        mode === "move" &&
        movingBuildings.length > 0
      ) {
        e.preventDefault();
        cycleMoveRotation(1); // clockwise
      }
      if (
        (e.key === "q" || e.key === "Q") &&
        mode === "move" &&
        movingBuildings.length > 0
      ) {
        e.preventDefault();
        cycleMoveRotation(-1); // counter-clockwise
      }

      // Ctrl/Cmd + D to toggle delete mode
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (mode === "delete") {
          setMode("select");
        } else {
          setMode("delete");
        }
      }

      // Ctrl/Cmd + M to toggle move mode
      if ((e.ctrlKey || e.metaKey) && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if (mode === "move") {
          // Cancel any ongoing move first
          if (movingBuildings.length > 0) {
            cancelMove();
          }
          setMode("select");
        } else {
          setMode("move");
        }
      }

      // Ctrl/Cmd + Z to undo
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        (e.key === "z" || e.key === "Z")
      ) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
      if (
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "z" || e.key === "Z")) ||
        ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault();
        redo();
      }

      // Delete/Backspace to delete selected buildings
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedBuildingIds.length > 0
      ) {
        e.preventDefault();
        deleteSelectedBuildings();
      }

      // Escape to cancel/go back to select
      if (e.key === "Escape") {
        e.preventDefault();
        if (isBulkPlacing) {
          cancelBulkPlacement();
        } else if (mode === "move") {
          // In move mode, cancel any ongoing move and go back to select
          if (movingBuildings.length > 0) {
            cancelMove();
          }
          setMode("select");
        } else {
          setMode("select");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mode,
    isBulkPlacing,
    selectedBuildingIds.length,
    movingBuildings,
    setMode,
    cycleGhostRotation,
    cycleMoveRotation,
    cancelBulkPlacement,
    deleteSelectedBuildings,
    undo,
    redo,
    cancelMove,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      {/* Main grid canvas */}
      <div className="h-full w-full">
        <GridCanvas />
      </div>

      {/* Rotation toggle (when placing) */}
      <div>
        <RotationToggle />
      </div>

      {/* Mode toggle at bottom center */}
      <div>
        <ModeToggle />
      </div>

      {/* Zoom controls at bottom right */}
      <ZoomControls />

      {/* Move confirmation dialog */}
      <MoveConfirmDialog />
    </div>
  );
}
