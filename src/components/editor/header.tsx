import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Grid3X3,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { getLayoutSlug } from "@/lib/utils";
import { Button, LoadingButton } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FormField } from "../ui/form";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useLayoutEditor } from "./provider";

export function LayoutEditorHeader({
  layoutTitle,
  layoutHash,
}: {
  layoutTitle: string;
  layoutHash: string;
}) {
  const {
    isHeaderCollapsed,
    setIsHeaderCollapsed,
    isEditingTitle,
    setIsEditingTitle,
    form,
    submit,
    isPending,
  } = useLayoutEditor();

  useEffect(() => {
    setIsEditingTitle(false);
  }, [isPending, setIsEditingTitle]);

  return (
    <>
      <AnimatePresence>
        {!isHeaderCollapsed && (
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
              {isEditingTitle ? (
                <div className="flex flex-1 items-center gap-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            form.resetField("title");
                            setIsEditingTitle(false);
                          }
                        }}
                      />
                    )}
                  />

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      submit();
                      setIsEditingTitle(false);
                    }}
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      form.resetField("title");
                      setIsEditingTitle(false);
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
                >
                  <h1 className="truncate text-sm font-medium text-foreground">
                    {layoutTitle}
                  </h1>
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Save as Draft */}
              <LoadingButton
                type="button"
                variant="outline"
                size="sm"
                className="hidden bg-transparent sm:flex"
                onClick={() => submit(true)}
                disabled={isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </LoadingButton>

              {/* Publish Button Group */}
              <ButtonGroup>
                <LoadingButton
                  type="button"
                  size="sm"
                  onClick={() => submit(false)}
                  disabled={isPending}
                >
                  Publish
                </LoadingButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="px-2">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Layout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>

              {/* Exit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      to="/layouts/$slug"
                      params={{ slug: getLayoutSlug(layoutTitle, layoutHash) }}
                    >
                      <X className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exit Editor</TooltipContent>
              </Tooltip>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
        className={`fixed right-4 z-50 rounded-b-lg border border-border bg-card px-3 py-1 transition-all ${
          isHeaderCollapsed ? "top-0" : "top-14"
        }`}
      >
        {isHeaderCollapsed ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>
    </>
  );
}
