import { useCallback, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { Calendar, ExternalLink, Heart, Link2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

import { LayoutCard } from "@/components/layouts/layout-card";
import { useGameData } from "@/components/providers/game-data-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField } from "@/components/ui/form";
import { EditableField } from "@/components/ui/input";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { getLayoutSlug } from "@/lib/utils";
import { updateLayoutSchema } from "@/lib/validation/layouts";
import { likeLayoutFn, updateLayoutFn } from "@/server/api/layouts";
import { layoutQueries } from "@/server/queries/layouts";

export const Route = createFileRoute("/(public)/layouts/$slug")({
  component: RouteComponent,
  beforeLoad: ({ params }) => {
    const hash = params.slug.slice(-21);
    if (!hash) {
      throw notFound();
    }

    return { hash };
  },
  loader: async ({ context, params }) => {
    const { layout } = await context.queryClient.ensureQueryData(
      layoutQueries.getLayoutByHash(context.hash),
    );
    if (!layout) {
      throw notFound();
    }

    const slug = getLayoutSlug(layout.title, context.hash);
    if (slug !== params.slug) {
      throw redirect({ to: "/layouts/$slug", params: { slug } });
    }

    void context.queryClient.prefetchQuery(
      layoutQueries.getRelatedLayouts(context.hash),
    );
  },
});

function RouteComponent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageBreadcrumb />

      <PageTitle />

      <LayoutInformation />

      <RelatedLayouts />
    </div>
  );
}

function PageBreadcrumb() {
  const { hash } = Route.useRouteContext();

  const { data } = useSuspenseQuery(layoutQueries.getLayoutByHash(hash));

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/layouts">Layouts</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>{data.layout!.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function PageTitle() {
  const { hash, auth } = Route.useRouteContext();
  const { data } = useSuspenseQuery(layoutQueries.getLayoutByHash(hash));
  const queryClient = useQueryClient();

  const handleLikeMutation = useMutation({
    mutationFn: likeLayoutFn,
    onMutate: async (_, context) => {
      await context.client.cancelQueries({
        queryKey: layoutQueries.getLayoutByHash(hash).queryKey,
      });

      const previousLayout = context.client.getQueryData(
        layoutQueries.getLayoutByHash(hash).queryKey,
      );
      if (!previousLayout?.layout) {
        return;
      }

      context.client.setQueryData(
        layoutQueries.getLayoutByHash(hash).queryKey,
        {
          layout: {
            ...previousLayout.layout,
            isLiked: !previousLayout.layout.isLiked,
          },
        },
      );
    },
    onSuccess: () => {
      toast.success(
        data.layout!.isLiked
          ? "Layout liked successfully"
          : "Layout unliked successfully",
      );
    },
    onError: () => {
      toast.error(
        data.layout!.isLiked
          ? "Failed to like layout"
          : "Failed to unlike layout",
      );
    },
    onSettled: () =>
      void queryClient.invalidateQueries({
        queryKey: layoutQueries.getLayoutByHash(hash).queryKey,
      }),
  });

  if (!data.layout) {
    return null;
  }

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold text-foreground">
        {data.layout.title}
      </h1>
      <div className="flex items-center gap-3">
        <Button asChild>
          {auth?.id && Number(auth.id) === data.layout.authorId ? (
            <Link
              to="/layouts/$slug/editor"
              params={{ slug: getLayoutSlug(data.layout.title, hash) }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Editor
            </Link>
          ) : (
            <Link
              to="/layouts/$slug/preview"
              params={{ slug: getLayoutSlug(data.layout.title, hash) }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </Link>
          )}
        </Button>
        <Button variant="outline" size="icon" className="bg-transparent">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant={data.layout.isLiked ? "default" : "outline"}
          size="icon"
          onClick={() => handleLikeMutation.mutate({ data: { hash } })}
          className={!data.layout.isLiked ? "bg-transparent" : ""}
        >
          <Heart
            className={`h-4 w-4 ${data.layout.isLiked ? "fill-current" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}

function LayoutInformation() {
  const { hash } = Route.useRouteContext();
  const { data } = useSuspenseQuery(layoutQueries.getLayoutByHash(hash));

  const queryClient = useQueryClient();

  const { regionsMap, getRegionName } = useGameData();

  const [editingField, setEditingField] = useState<string | null>(null);

  const form = useValidatedForm({
    schema: updateLayoutSchema,
    defaultValues: {
      hash,
      title: data.layout?.title,
      description: data.layout?.description,
      category: data.layout?.category,
      region: data.layout?.region,
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: updateLayoutFn,
    onMutate: async ({ data }, context) => {
      await context.client.cancelQueries({
        queryKey: layoutQueries.getLayoutByHash(hash).queryKey,
      });

      const previousLayout = context.client.getQueryData(
        layoutQueries.getLayoutByHash(hash).queryKey,
      );
      if (!previousLayout?.layout) {
        return;
      }

      context.client.setQueryData(
        layoutQueries.getLayoutByHash(hash).queryKey,
        {
          layout: {
            ...previousLayout.layout,
            ...data,
          },
        },
      );
    },
    onSuccess: () => {
      toast.success("Layout updated successfully");
    },
    onError: () => {
      toast.error("Failed to update layout");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: layoutQueries.getLayoutByHash(hash).queryKey,
      });
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const submitForm = useCallback(() => {
    formRef.current?.dispatchEvent(
      new Event("submit", {
        cancelable: true,
        bubbles: true,
      }),
    );
  }, [formRef]);

  const regionIcon = useMemo(
    () => regionsMap[Number(data.layout?.region)]?.icon ?? "",
    [data.layout?.region, regionsMap],
  );

  if (!data.layout) {
    return null;
  }

  return (
    <div className="mb-12 grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardContent>
            <Form
              form={form}
              handleSubmit={(data) => updateLayoutMutation.mutate({ data })}
              ref={formRef}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="capitalize">
                  {data.layout.category}
                </Badge>
                <Badge variant="outline">
                  {regionIcon && (
                    <img
                      src={regionIcon}
                      alt={getRegionName(Number(data.layout.region))}
                      className="h-4 w-4"
                    />
                  )}
                  {getRegionName(Number(data.layout.region))}
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <EditableField
                    label="Title"
                    value={field.value}
                    isEditing={editingField === "title"}
                    onEdit={() => setEditingField("title")}
                    onSave={(value) => {
                      field.onChange(value);
                      setEditingField(null);

                      submitForm();
                    }}
                    onCancel={() => setEditingField(null)}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <EditableField
                    label="Description"
                    value={field.value ?? null}
                    isEditing={editingField === "description"}
                    onEdit={() => setEditingField("description")}
                    onSave={(value) => {
                      field.onChange(value);
                      setEditingField(null);

                      submitForm();
                    }}
                    onCancel={() => setEditingField(null)}
                    placeholder="We don't know much about this layout"
                    multiline
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {regionIcon && (
                    <img
                      src={regionIcon}
                      alt={getRegionName(Number(data.layout.region))}
                      className="h-4 w-4"
                    />
                  )}

                  <span>{getRegionName(Number(data.layout.region))}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span>{data.layout.likesCount} likes</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(data.layout.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {data.layout.authorImage && (
                  <AvatarImage src={data.layout.authorImage} />
                )}
                <AvatarFallback>
                  {data.layout.authorName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {data.layout.authorName ?? "Unknown"}
                </h3>
                <p className="text-sm text-muted-foreground">Layout Creator</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {data.layout.authorLayoutCount}
                </p>
                <p className="text-xs text-muted-foreground">Layouts Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-full space-y-4">
        <div className="relative h-full">
          {data.layout.image && (
            <>
              <img
                src={data.layout.image}
                alt={data.layout.title}
                className="absolute inset-0 rounded-2xl object-cover"
              />

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl overflow-hidden p-0">
                  <div className="relative aspect-square w-full">
                    <img
                      src={data.layout.image}
                      alt={data.layout.title}
                      className="absolute inset-0 object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedLayouts() {
  const { hash } = Route.useRouteContext();
  const { data } = useSuspenseQuery(layoutQueries.getRelatedLayouts(hash));

  if (data.rows.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Related Layouts</h2>
        <Button variant="ghost" asChild>
          <Link to="/layouts">View All</Link>
        </Button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.rows.map((relatedLayout) => (
          <LayoutCard key={relatedLayout.hash} {...relatedLayout} />
        ))}
      </div>
    </section>
  );
}
