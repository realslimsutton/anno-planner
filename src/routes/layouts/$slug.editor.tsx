import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  redirect,
  useBlocker,
} from "@tanstack/react-router";

import { LayoutEditor } from "@/components/editor";
import { getLayoutSlug } from "@/lib/utils";
import { userQueries } from "@/server/queries/auth";
import { layoutQueries } from "@/server/queries/layouts";
import { useEditorStore } from "@/stores/editor";

export const Route = createFileRoute("/layouts/$slug/editor")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const hash = params.slug.slice(-21);
    if (!hash) {
      throw notFound();
    }

    const auth = await context.queryClient.ensureQueryData(
      userQueries.getCurrentUser,
    );
    if (!auth) {
      throw redirect({ to: "/layouts/$slug", params: { slug: params.slug } });
    }

    return { hash, auth };
  },
  loader: async ({ context, params }) => {
    const { layout } = await context.queryClient.ensureQueryData(
      layoutQueries.getLayoutEditorData(context.hash),
    );
    if (!layout) {
      throw notFound();
    }

    if (layout.authorId !== Number(context.auth.id)) {
      throw redirect({ to: "/layouts/$slug", params: { slug: params.slug } });
    }

    const slug = getLayoutSlug(layout.title, context.hash);
    if (slug !== params.slug) {
      throw redirect({ to: "/layouts/$slug/editor", params: { slug } });
    }
  },
});

function RouteComponent() {
  const { hash } = Route.useRouteContext();

  const { data } = useSuspenseQuery(layoutQueries.getLayoutEditorData(hash));

  const isDirty = useEditorStore((state) => state.isDirty);

  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) {
        return false;
      }
      const exit = confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      return !exit;
    },
  });

  if (!data.layout) {
    return notFound();
  }

  return <LayoutEditor layout={data.layout} />;
}
