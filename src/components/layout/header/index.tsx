import { Suspense } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { SelectTrigger } from "@radix-ui/react-select";
import { GlobeIcon, Menu, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { CreateLayoutModalTrigger } from "@/components/providers/create-layout-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale, locales, setLocale } from "@/paraglide/runtime";
import { userQueries } from "@/server/queries/auth";
import { useTheme } from "../../providers/theme-provider";

export function Header() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg dark:bg-primary">
            <img
              src="/images/anno-planner-logo.webp"
              alt="Anno Planner"
              width={36}
              height={36}
            />
          </div>
          <span className="font-serif text-xl font-bold text-foreground">
            Anno Planner
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                    pathname === "/" ? "text-primary" : "text-muted-foreground",
                  )}
                  asChild
                >
                  <Link to="/">{m.main_navigation_home()}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                    pathname.startsWith("/layouts")
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                  asChild
                >
                  <Link to="/layouts">{m.main_navigation_layouts()}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "bg-transparent text-sm font-medium hover:text-primary!",
                    pathname.startsWith("/news")
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {m.main_navigation_resources()}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-80 space-y-3">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/news"
                          className="block rounded-md p-3 transition-colors hover:bg-muted"
                        >
                          <div className="text-sm font-semibold">
                            {m.main_navigation_news()}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {m.main_navigation_news_description()}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/community"
                          className="block rounded-md p-3 transition-colors hover:bg-muted"
                        >
                          <div className="text-sm font-semibold">
                            {m.main_navigation_community()}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Connect with builders and find useful tools
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>

          <CreateLayoutModalTrigger>
            {m.create_layout_button()}
          </CreateLayoutModalTrigger>

          <Suspense
            fallback={
              <div className="flex size-full items-center justify-center rounded-full bg-muted" />
            }
          >
            <UserDropdown pathname={pathname} />
          </Suspense>
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="mt-8 flex flex-col gap-4">
                <Link
                  to="/"
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    pathname === "/"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {m.main_navigation_home()}
                </Link>
                <Link
                  to="/layouts"
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/layouts")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {m.main_navigation_layouts()}
                </Link>
                <Link
                  to="/news"
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/news")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {m.main_navigation_news()}
                </Link>
                <Link
                  to="/community"
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/community")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {m.main_navigation_community()}
                </Link>

                <UserDropdown pathname={pathname} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function UserDropdown({ pathname }: { pathname: string }) {
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(userQueries.getCurrentUser);

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userQueries.getCurrentUser.queryKey,
      });

      toast.success("Signed out successfully");
    },
    onError: () => {
      toast.error("Failed to sign out");
    },
  });

  if (!data) {
    return (
      <Link
        to="/auth/login"
        search={{ redirect: pathname !== "/" ? pathname : undefined }}
      >
        <Button variant="outline">{m.user_dropdown_sign_in_button()}</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={data.image ?? undefined} />
          <AvatarFallback>{data.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{m.user_dropdown_title()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled>
          <Link to="/profile">{m.user_dropdown_profile_button()}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled>
          <Link to="/settings">{m.user_dropdown_settings_button()}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" asChild>
          <button
            type="button"
            onClick={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
            className="w-full"
          >
            {signOutMutation.isPending && <Spinner />}
            {m.user_dropdown_logout_button()}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageSwitcher() {
  return (
    <Select defaultValue={getLocale()} onValueChange={setLocale}>
      <SelectTrigger asChild>
        <Button variant="ghost" size="icon">
          <GlobeIcon />
        </Button>
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {m.language_name({}, { locale })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
