import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { userQueries } from "@/server/queries/auth";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(
      userQueries.getCurrentUser,
    );

    return { auth };
  },
});

function RouteComponent() {
  return (
    <>
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </>
  );
}
