import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { PreviewEditor } from "@/components/editor/preview";
import { getLayoutSlug } from "@/lib/utils";
import { layoutQueries } from "@/server/queries/layouts";

export const Route = createFileRoute("/layouts/$slug/preview")({
  component: RouteComponent,
  validateSearch: z.object({
    // When ui=false, hides all UI (header, zoom controls) for screenshot mode
    ui: z.boolean().optional().default(true),
    // When header=false, hides only the header (keeps zoom controls)
    header: z.boolean().optional(),
    // When zoom=false, hides only the zoom controls (keeps header)
    zoom: z.boolean().optional(),
    // When autoFit=true, automatically fits content to viewport
    // Defaults to true when ui=false (screenshot mode)
    autoFit: z.boolean().optional(),
  }),
  beforeLoad: ({ params }) => {
    const hash = params.slug.slice(-21);
    if (!hash) {
      throw notFound();
    }

    return { hash };
  },
  loader: async ({ context, params }) => {
    const { layout } = await context.queryClient.ensureQueryData(
      layoutQueries.getLayoutEditorData(context.hash),
    );
    if (!layout) {
      throw notFound();
    }

    const slug = getLayoutSlug(layout.title, context.hash);
    if (slug !== params.slug) {
      throw redirect({ to: "/layouts/$slug/preview", params: { slug } });
    }
  },
});

function RouteComponent() {
  const { hash } = Route.useRouteContext();
  const search = Route.useSearch();

  const { data } = useSuspenseQuery(layoutQueries.getLayoutEditorData(hash));
  if (!data.layout) {
    return notFound();
  }

  // Determine visibility based on search params
  // If ui=false, hide everything (screenshot mode)
  // Otherwise, use individual header/zoom params with defaults
  const showUi = search.ui;
  const showHeader = showUi && (search.header ?? true);
  const showZoomControls = showUi && (search.zoom ?? true);

  // Auto-fit defaults to true when UI is hidden (screenshot mode)
  const autoFit = search.autoFit ?? !showUi;

  return (
    <PreviewEditor
      layoutTitle={data.layout.title}
      layoutHash={data.layout.hash}
      layoutData={data.layout.data}
      showHeader={showHeader}
      showZoomControls={showZoomControls}
      autoFit={autoFit}
    />
  );
}
