import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODES, PLACE_MODE, ROAD_MODE, SELECT_MODE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";

export function ModeToggle() {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const selectedBuilding = useEditorStore((state) => state.selectedBuilding);
  const selectedRoadType = useEditorStore((state) => state.selectedRoadType);

  // Determine which mode to show in the primary button
  // Move mode should NOT change the select button - it stays as Select
  const isPlaceMode = mode === "place" || selectedBuilding !== null;
  const isRoadMode = mode === "road" || selectedRoadType !== null;

  let currentSelectMode = SELECT_MODE;
  if (isRoadMode) {
    currentSelectMode = ROAD_MODE;
  } else if (isPlaceMode) {
    currentSelectMode = PLACE_MODE;
  }

  const handleSelectPlaceClick = () => {
    if (isPlaceMode || isRoadMode) {
      // If in place or road mode, clicking goes back to select
      setMode("select");
    } else {
      // If in select mode, clicking stays in select (no building selected)
      setMode("select");
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900/80 p-1.5 shadow-lg backdrop-blur-md">
        {/* Animated Select/Place button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "relative h-9 gap-2 overflow-hidden rounded-lg px-3 transition-colors",
                mode === "select" || mode === "place" || mode === "road"
                  ? "bg-neutral-700 text-white shadow-inner"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
              )}
              onClick={handleSelectPlaceClick}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSelectMode.id}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 800,
                    damping: 35,
                    mass: 0.5,
                  }}
                  className="flex items-center gap-2"
                >
                  <motion.span
                    initial={{ rotate: -45, scale: 0.9 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 700,
                      damping: 30,
                    }}
                  >
                    {currentSelectMode.icon}
                  </motion.span>
                  <span className="text-sm font-medium">
                    {currentSelectMode.label}
                  </span>
                </motion.div>
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-2">
            <span>{currentSelectMode.label} mode</span>
            <Kbd>Esc</Kbd>
            {(mode === "place" || mode === "road") && (
              <span className="text-xs text-neutral-400">
                (right-click to cancel)
              </span>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Other mode buttons */}
        {MODES.filter((m) => m.id !== "select").map((m) => {
          const isActive = mode === m.id;

          return (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 gap-2 rounded-lg px-3 transition-all",
                    isActive
                      ? "bg-neutral-700 text-white shadow-inner"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
                  )}
                  onClick={() => setMode(m.id)}
                >
                  {m.icon}
                  <span className="text-sm font-medium">{m.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{m.label} mode</span>
                {m.shortcut && <Kbd>{m.shortcut}</Kbd>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
