import { Suspense, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Grid3X3, Plus, Share2, UserIcon, Zap } from "lucide-react";

import {
  LayoutCard,
  LayoutCardsSkeleton,
} from "@/components/layouts/layout-card";
import {
  CreateLayoutModalTrigger,
  useCreateLayout,
} from "@/components/providers/create-layout-provider";
import { useGameData } from "@/components/providers/game-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button, LoadingButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getLayoutSlug } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { layoutQueries } from "@/server/queries/layouts";

export const Route = createFileRoute("/(public)/")({
  component: App,
});

function App() {
  return (
    <>
      <section className="relative overflow-visible border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 39px,
                currentColor 39px,
                currentColor 40px
              ),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 39px,
                currentColor 39px,
                currentColor 40px
              )
            `,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="flex flex-col items-center py-20 text-center md:py-32">
            <Badge variant="secondary" className="mb-4">
              {m.hero_announcement()}
            </Badge>

            <h1
              className="font-serif text-4xl font-bold text-foreground md:text-5xl lg:text-6xl"
              dangerouslySetInnerHTML={{ __html: m.hero_title({}) }}
            />

            <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
              {m.hero_description()}
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
              <CreateLayoutModalTrigger className="gap-2">
                <Plus className="h-4 w-4" />
                {m.create_layout_button()}
              </CreateLayoutModalTrigger>

              <Link to="/layouts">
                <Button variant="outline" className="gap-2 bg-transparent">
                  {m.browse_layouts_button()}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 z-20 translate-y-1/2">
          <div className="container mx-auto px-4">
            <CreateLayoutForm />
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 pt-24 md:py-24 md:pt-32">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold text-foreground">
              {m.why_anno_planner_title()}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {m.why_anno_planner_description()}
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Grid3X3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {m.why_anno_planner_1_title()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {m.why_anno_planner_1_description()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {m.why_anno_planner_2_title()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {m.why_anno_planner_2_description()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {m.why_anno_planner_3_title()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {m.why_anno_planner_3_description()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {m.featured_layout_title()}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {m.featured_layout_description()}
              </p>
            </div>
          </div>

          <Suspense
            fallback={<Skeleton className="aspect-21/9 w-full rounded-2xl" />}
          >
            <FeaturedLayout />
          </Suspense>
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {m.popular_layouts_title()}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {m.popular_layouts_description()}
              </p>
            </div>
            <Link to="/layouts" search={{ sortBy: "popular" }}>
              <Button variant="ghost" className="gap-2">
                {m.popular_layouts_button()}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Suspense fallback={<LayoutCardsSkeleton count={4} />}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <PopularLayouts />
            </div>
          </Suspense>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {m.recent_layouts_title()}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {m.recent_layouts_description()}
              </p>
            </div>
            <Link to="/layouts" search={{ sortBy: "recent" }}>
              <Button variant="ghost" className="gap-2">
                {m.recent_layouts_button()}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Suspense fallback={<LayoutCardsSkeleton count={4} />}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <RecentLayouts />
            </div>
          </Suspense>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl font-bold text-balance md:text-4xl">
            {m.ready_to_build_your_perfect_layout_title()}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            {m.ready_to_build_your_perfect_layout_description()}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CreateLayoutModalTrigger
              size="lg"
              variant="secondary"
              className="gap-2"
            >
              {m.start_creating_button()}
              <ArrowRight className="h-4 w-4" />
            </CreateLayoutModalTrigger>
          </div>
        </div>
      </section>
    </>
  );
}

function CreateLayoutForm() {
  const { form, submit, isPending } = useCreateLayout();

  const { assets, getRegionName } = useGameData();

  return (
    <Card className="relative mx-auto max-w-6xl overflow-hidden border-primary/30 bg-card shadow-2xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />
      <CardContent className="relative z-10 p-5 md:p-6">
        <Form
          form={form}
          handleSubmit={submit}
          className="grid gap-3 md:grid-cols-[1fr_13rem_13rem_auto] md:gap-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {m.create_layout_form_title_label()}:
                  <sup className="text-destructive">*</sup>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={m.create_layout_form_title_placeholder()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {m.create_layout_form_category_label()}:
                  <sup className="text-destructive">*</sup>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={m.create_layout_form_category_placeholder()}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
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
                  {m.create_layout_form_region_label()}:
                  <sup className="text-destructive">*</sup>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={m.create_layout_form_category_placeholder()}
                      />
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

          <div className="flex items-end">
            <LoadingButton
              type="submit"
              className="h-10 w-full gap-2 md:w-auto"
              disabled={isPending}
            >
              <Plus className="h-4 w-4" />
              {m.create_layout_form_submit_button()}
            </LoadingButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

function FeaturedLayout() {
  const { data } = useSuspenseQuery(layoutQueries.getFeaturedLayout);

  const { regionsMap, getRegionName } = useGameData();

  const regionIcon = useMemo(
    () =>
      (data.layout ? regionsMap[Number(data.layout.region)]?.icon : null) ?? "",
    [data.layout, regionsMap],
  );

  if (!data.layout) {
    return <Skeleton className="aspect-21/9 w-full rounded-2xl" />;
  }

  return (
    <Link
      to="/layouts/$slug"
      params={{ slug: getLayoutSlug(data.layout.title, data.layout.hash) }}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div className="relative aspect-21/9">
          {data.layout.image && (
            <img
              src={data.layout.image}
              alt={data.layout.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent" />
        </div>
        <div className="absolute right-0 bottom-0 left-0 p-6 md:p-8">
          <Badge className="mb-3">{m.featured_layouts_badge()}</Badge>
          <h3 className="font-serif text-2xl font-bold text-foreground transition-colors group-hover:text-primary md:text-3xl">
            {data.layout.title}
          </h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {data.layout.authorName}
            </span>
            <span className="flex items-center gap-1">
              {regionIcon && (
                <img
                  src={regionIcon}
                  alt={getRegionName(Number(data.layout.region))}
                  className="h-3.5 w-3.5"
                />
              )}

              {getRegionName(Number(data.layout.region))}
            </span>
            <span>
              {m.layout_likes_count({ count: data.layout.likesCount })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PopularLayouts() {
  const { data } = useSuspenseQuery(layoutQueries.getPopularLayouts);

  return (
    <>
      {data.rows.map((layout) => (
        <LayoutCard key={layout.hash} {...layout} />
      ))}
    </>
  );
}

function RecentLayouts() {
  const { data } = useSuspenseQuery(layoutQueries.getRecentLayouts);

  return (
    <>
      {data.rows.map((layout) => (
        <LayoutCard key={layout.hash} {...layout} />
      ))}
    </>
  );
}
