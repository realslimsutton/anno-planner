import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit2, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Textarea } from "./textarea";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

function EditableField({
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string | null) => void;
  onCancel: () => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editValue, setEditValue] = React.useState(value);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-7 px-2 text-primary"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 px-2 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {multiline ? (
              <Textarea
                value={editValue ?? ""}
                onChange={(e) => setEditValue(e.target.value)}
                className="min-h-24 resize-none"
                autoFocus
              />
            ) : (
              <Input
                value={editValue ?? ""}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
            )}
          </motion.div>
        ) : (
          <motion.p
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-foreground"
          >
            {value ?? placeholder}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Input, EditableField };
