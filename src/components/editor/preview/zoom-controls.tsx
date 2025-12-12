import { Maximize, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "@/lib/constants";

type PreviewZoomControlsProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToContent?: () => void;
};

export function PreviewZoomControls({
  zoom,
  onZoomChange,
  onFitToContent,
}: PreviewZoomControlsProps) {
  const zoomPercentage = Math.round(zoom * 100);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value / 100));
      onZoomChange(newZoom);
    }
  };

  const handleZoomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      e.target.value = zoomPercentage.toString();
    }
  };

  const handleIncrement = (delta: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    onZoomChange(newZoom);
  };

  return (
    <div className="absolute right-6 bottom-6 z-20 flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            onClick={() => handleIncrement(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom Out</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          step={ZOOM_STEP * 100}
          value={zoomPercentage}
          onChange={handleZoomInputChange}
          onBlur={handleZoomInputBlur}
          className="h-7 w-14 [appearance:textfield] border-neutral-600 bg-neutral-800 text-center text-sm text-neutral-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-sm text-neutral-500">%</span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            onClick={() => handleIncrement(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom In</TooltipContent>
      </Tooltip>

      {onFitToContent && (
        <>
          <div className="mx-1 h-5 w-px bg-neutral-700" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                onClick={onFitToContent}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Fit to Content</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
