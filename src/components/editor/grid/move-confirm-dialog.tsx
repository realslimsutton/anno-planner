import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditorStore } from "@/stores/editor";

export function MoveConfirmDialog() {
  const showMoveConfirmDialog = useEditorStore(
    (state) => state.showMoveConfirmDialog,
  );
  const pendingMoveResult = useEditorStore((state) => state.pendingMoveResult);
  const confirmMoveWithInvalid = useEditorStore(
    (state) => state.confirmMoveWithInvalid,
  );
  const cancelMoveConfirmDialog = useEditorStore(
    (state) => state.cancelMoveConfirmDialog,
  );

  if (!pendingMoveResult) return null;

  const { valid, invalid } = pendingMoveResult;
  const totalBuildings = valid.length + invalid.length;

  return (
    <Dialog
      open={showMoveConfirmDialog}
      onOpenChange={(open) => {
        if (!open) cancelMoveConfirmDialog();
      }}
    >
      <DialogContent className="border-neutral-700 bg-neutral-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Invalid Placement Warning
          </DialogTitle>
          <DialogDescription className="pt-2 text-neutral-300">
            {invalid.length === totalBuildings ? (
              <>
                <span className="font-semibold text-red-400">
                  All {invalid.length} building{invalid.length !== 1 ? "s" : ""}
                </span>{" "}
                cannot be placed at the target location due to collisions.
              </>
            ) : (
              <>
                <span className="font-semibold text-red-400">
                  {invalid.length} building{invalid.length !== 1 ? "s" : ""}
                </span>{" "}
                out of {totalBuildings} cannot be placed at the target location
                due to collisions.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-neutral-200">
                Valid placements
              </div>
              <div className="text-sm text-neutral-400">
                These buildings will be placed
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {valid.length}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-red-900/30 bg-neutral-800/50 p-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-neutral-200">
                Invalid placements
              </div>
              <div className="text-sm text-neutral-400">
                These buildings will be deleted
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {invalid.length}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={cancelMoveConfirmDialog}
            className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirmMoveWithInvalid}
            className="flex-1 bg-amber-600 text-white hover:bg-amber-500"
            disabled={valid.length === 0}
          >
            {valid.length === 0
              ? "No valid placements"
              : `Place ${valid.length} building${
                  valid.length !== 1 ? "s" : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
