import type { ComponentProps, ReactNode } from "react";
import type { SubmitHandler } from "react-hook-form";
import type { z } from "zod";
import { createContext, useContext, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Grid3X3 } from "lucide-react";
import { toast } from "sonner";

import { useValidatedForm } from "@/hooks/use-validated-form";
import { getLayoutSlug } from "@/lib/utils";
import { createLayoutSchema } from "@/lib/validation/layouts";
import { createLayoutFn } from "@/server/api/layouts";
import { Button, LoadingButton } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useGameData } from "./game-data-provider";

type CreateLayoutContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: ReturnType<
    typeof useValidatedForm<
      z.infer<typeof createLayoutSchema>,
      z.infer<typeof createLayoutSchema>
    >
  >;
  submit: SubmitHandler<z.infer<typeof createLayoutSchema>>;
  isPending: boolean;
};

const CreateLayoutContext = createContext<CreateLayoutContextType | undefined>(
  undefined,
);

export function CreateLayoutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const form = useValidatedForm({
    schema: createLayoutSchema,
    defaultValues: {
      title: "",
      description: null,
      category: undefined,
      region: undefined,
    },
  });

  const navigate = useNavigate();

  const createLayoutMutation = useMutation({
    mutationFn: createLayoutFn,
    onSuccess: (data, { data: { title } }) => {
      if (!data.hash) {
        toast.error("Failed to create layout");
        return;
      }

      toast.success("Layout created successfully");
      void navigate({
        to: "/layouts/$slug",
        params: {
          slug: getLayoutSlug(title, data.hash),
        },
      });

      form.reset();

      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to create layout");
    },
  });

  return (
    <CreateLayoutContext.Provider
      value={{
        open,
        setOpen,
        form,
        submit: (data) => createLayoutMutation.mutate({ data }),
        isPending: createLayoutMutation.isPending,
      }}
    >
      <CreateLayoutModal />

      {children}
    </CreateLayoutContext.Provider>
  );
}

export function useCreateLayout() {
  const context = useContext(CreateLayoutContext);
  if (!context) {
    throw new Error(
      "useCreateLayout must be used within a CreateLayoutProvider",
    );
  }
  return context;
}

function CreateLayoutModal() {
  const { open, setOpen, form, submit, isPending } = useCreateLayout();

  const { assets, getRegionName } = useGameData();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[800px]">
        <div className="grid md:grid-cols-2">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="font-serif text-2xl">
                Create New Layout
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Set up your layout details before entering the editor.
              </p>
            </DialogHeader>

            <Form form={form} handleSubmit={submit} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title:<sup className="text-destructive">*</sup>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="My Production Layout" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description:</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Category:<sup className="text-destructive">*</sup>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="production">
                              Production
                            </SelectItem>
                            <SelectItem value="city">City</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Region:<sup className="text-destructive">*</sup>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>

                          <SelectContent>
                            {assets?.regions.map((region) => (
                              <SelectItem
                                key={region.id}
                                value={region.id.toString()}
                              >
                                {getRegionName(region.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <LoadingButton
                type="submit"
                className="mt-6 w-full"
                disabled={isPending}
              >
                Open Editor
              </LoadingButton>
            </Form>
          </div>

          <div className="hidden flex-col items-center justify-center bg-muted/50 p-8 md:flex">
            <div className="flex aspect-square w-full max-w-[280px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-background">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Grid3X3 className="h-8 w-8 text-primary" />
              </div>
              <div className="px-4 text-center">
                <h4 className="font-semibold text-foreground">Grid Editor</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Design your perfect layout with our intuitive drag-and-drop
                  editor
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateLayoutModalTrigger({
  onClick,
  children,
  ...props
}: Exclude<ComponentProps<typeof Button>, "type">) {
  const { setOpen } = useCreateLayout();

  return (
    <Button
      type="button"
      onClick={(e) => {
        setOpen(true);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
