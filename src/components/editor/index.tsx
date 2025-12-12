import type { getLayoutEditorDataFn } from "@/server/api/layouts";

import { GridEditor } from "./grid";
import { LayoutEditorHeader } from "./header";
import { LayoutEditorProvider } from "./provider";
import { LayoutEditorSidebar } from "./sidebar";

export function LayoutEditor({
  layout,
}: {
  layout: NonNullable<
    Awaited<ReturnType<typeof getLayoutEditorDataFn>>["layout"]
  >;
}) {
  return (
    <LayoutEditorProvider layout={layout}>
      <LayoutEditorHeader layoutTitle={layout.title} layoutHash={layout.hash} />

      <EditorContent layout={layout} />
    </LayoutEditorProvider>
  );
}

function EditorContent({
  layout,
}: {
  layout: NonNullable<
    Awaited<ReturnType<typeof getLayoutEditorDataFn>>["layout"]
  >;
}) {
  return (
    <div className="flex h-screen flex-1 transition-all">
      <LayoutEditorSidebar layout={layout} />

      <GridEditor />
    </div>
  );
}
