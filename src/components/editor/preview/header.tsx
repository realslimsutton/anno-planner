import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Grid3X3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLayoutSlug } from "@/lib/utils";

type PreviewHeaderProps = {
  layoutTitle: string;
  layoutHash: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export function PreviewHeader({
  layoutTitle,
  layoutHash,
  isCollapsed,
  onToggleCollapse,
}: PreviewHeaderProps) {
  const layoutSlug = getLayoutSlug(layoutTitle, layoutHash);

  return (
    <>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.header
            initial={{ y: -64 }}
            animate={{ y: 0 }}
            exit={{ y: -64 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-card px-4"
          >
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Grid3X3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden font-bold text-foreground sm:inline">
                Anno Planner
              </span>
            </Link>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="truncate text-sm font-medium text-foreground">
                {layoutTitle}
              </h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Preview
              </span>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/layouts/$slug" params={{ slug: layoutSlug }}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Layout
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View full layout page</TooltipContent>
              </Tooltip>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <button
        onClick={onToggleCollapse}
        className={`fixed right-4 z-50 rounded-b-lg border border-border bg-card px-3 py-1 transition-all ${
          isCollapsed ? "top-0" : "top-14"
        }`}
        aria-label={isCollapsed ? "Show header" : "Hide header"}
      >
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>
    </>
  );
}
