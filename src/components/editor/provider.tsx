import type { getLayoutEditorDataFn } from "@/server/api/layouts";
import type { ReactNode } from "react";
import type { z } from "zod";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useValidatedForm } from "@/hooks/use-validated-form";
import { updateLayoutSchema } from "@/lib/validation/layouts";
import {
  publishLayoutFn,
  saveLayoutDraftFn,
  updateLayoutFn,
} from "@/server/api/layouts";
import { useEditorStore } from "@/stores/editor";
import { useGameData } from "../providers/game-data-provider";
import { Form } from "../ui/form";

type LayoutEditorContextType = {
  isHeaderCollapsed: boolean;
  setIsHeaderCollapsed: (collapsed: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  form: ReturnType<
    typeof useValidatedForm<
      z.infer<typeof updateLayoutSchema>,
      z.infer<typeof updateLayoutSchema>
    >
  >;
  submit: (draft?: boolean) => void;
  isPending: boolean;
};

const LayoutEditorContext = createContext<LayoutEditorContextType | undefined>(
  undefined,
);

export function LayoutEditorProvider({
  children,
  layout,
}: {
  children: ReactNode;
  layout: NonNullable<
    Awaited<ReturnType<typeof getLayoutEditorDataFn>>["layout"]
  >;
}) {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const { buildingsMap } = useGameData();
  const restoreFromLayoutData = useEditorStore(
    (state) => state.restoreFromLayoutData,
  );

  // Restore editor state from layout data on mount
  useEffect(() => {
    restoreFromLayoutData(layout.data, buildingsMap);
  }, [layout.data, buildingsMap, restoreFromLayoutData]);

  const form = useValidatedForm({
    schema: updateLayoutSchema,
    defaultValues: {
      hash: layout.hash,
      title: layout.title,
      description: layout.description,
      category: layout.category,
      region: layout.region,
      data: {
        buildings: [],
        roads: [],
      },
    },
  });

  const isDraft = useRef<boolean | undefined>(undefined);

  const placedBuildings = useEditorStore((state) => state.placedBuildings);
  const roadNetwork = useEditorStore((state) => state.roadNetwork);
  const markClean = useEditorStore((state) => state.markClean);

  const updateLayoutMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateLayoutSchema>) => {
      const dataWithBuildings = {
        ...data,
        data: {
          buildings: placedBuildings.map((building) => ({
            id: building.id,
            buildingId: building.buildingId,
            x: building.gridX,
            y: building.gridY,
            rotation: building.rotation,
            color: building.color,
          })),
          roads: Object.values(roadNetwork.nodes).map((node) => ({
            id: node.id,
            x: node.gridX,
            y: node.gridY,
          })),
          roadEdges: Object.values(roadNetwork.edges).map((edge) => ({
            id: edge.id,
            startNodeId: edge.startNodeId,
            endNodeId: edge.endNodeId,
            roadType: edge.roadType,
            centerLine: edge.centerLine.map((point) => ({
              x: point.gridX,
              y: point.gridY,
            })),
          })),
        },
      } as z.infer<typeof updateLayoutSchema>;

      console.log("dataWithBuildings", dataWithBuildings);

      if (isDraft.current === true) {
        return saveLayoutDraftFn({ data: dataWithBuildings });
      } else if (isDraft.current === false) {
        return publishLayoutFn({ data: dataWithBuildings });
      } else {
        return updateLayoutFn({ data: dataWithBuildings });
      }
    },
    onSuccess: () => {
      toast.success("Layout saved successfully");
      markClean();
    },
    onError: () => {
      toast.error("Failed to update layout");
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <LayoutEditorContext.Provider
      value={{
        isHeaderCollapsed,
        setIsHeaderCollapsed,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        searchQuery,
        setSearchQuery,
        isEditingTitle,
        setIsEditingTitle,
        form,
        submit: (draft?: boolean) => {
          isDraft.current = draft;

          formRef.current?.requestSubmit();
        },
        isPending: updateLayoutMutation.isPending,
      }}
    >
      <Form
        form={form}
        handleSubmit={(data) => updateLayoutMutation.mutate(data)}
        ref={formRef}
      >
        {children}
      </Form>
    </LayoutEditorContext.Provider>
  );
}

export function useLayoutEditor() {
  const context = useContext(LayoutEditorContext);
  if (!context) {
    throw new Error(
      "useLayoutEditor must be used within a LayoutEditorProvider",
    );
  }
  return context;
}
