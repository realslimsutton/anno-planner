import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
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
            <p className="max-w-md text-sm text-muted-foreground">
              {m.footer_description()}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {m.footer_disclaimer()}
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/layouts"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Browse Layouts
                </Link>
              </li>
              <li>
                <Link
                  to="/auth/login"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Anno Planner
        </div>
      </div>
    </footer>
  );
}
