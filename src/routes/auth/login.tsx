import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FaDiscord, FaGithub } from "react-icons/fa6";
import { z } from "zod";

import { Button, LoadingButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="space-y-6 p-6 md:p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">{m.login_form_title()}</h1>
                  <p className="text-balance text-muted-foreground">
                    {m.login_form_description()}
                  </p>
                </div>

                <LoginForm />
              </div>

              <div className="relative hidden bg-muted md:block">
                <img
                  src="/images/login-bg.webp"
                  alt="Image"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { redirect } = Route.useSearch();

  const signInMutation = useMutation({
    mutationFn: (provider: "discord" | "github") =>
      authClient.signIn.social({
        provider,
        callbackURL: redirect ?? "/",
      }),
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        type="button"
        className="w-full"
        onClick={() => signInMutation.mutate("discord")}
        disabled={signInMutation.isPending}
      >
        <FaDiscord />
        {m.login_form_discord_button()}
      </Button>
      <LoadingButton
        variant="outline"
        type="button"
        className="w-full"
        onClick={() => signInMutation.mutate("github")}
        disabled={signInMutation.isPending}
      >
        <FaGithub />
        {m.login_form_github_button()}
      </LoadingButton>
    </div>
  );
}
