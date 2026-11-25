import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Provider as ReduxProvider } from "react-redux";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { store } from "@/store";
import { AppDataLoader } from "@/components/common/AppDataLoader";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "LiftSmart — AI Fitness Coach" },
      {
        name: "description",
        content:
          "LiftSmart is an AI fitness and nutrition coach that rewrites your training and macros every day based on how you actually perform.",
      },
      { name: "theme-color", content: "#101216" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "LiftSmart — AI Fitness Coach" },
      {
        property: "og:description",
        content:
          "Adaptive training, nutrition and recovery coaching in your pocket. Built for people who want to stay consistent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Hardcoded before HeadContent so iOS reads viewport-fit=cover on every load */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: `
          #ls-splash {
            position: fixed; inset: 0; z-index: 9999;
            background: oklch(0.16 0.012 260);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 20px;
            transition: opacity 0.4s ease, visibility 0.4s ease;
          }
          #ls-splash.ls-hidden { opacity: 0; visibility: hidden; }
          .ls-logo {
            width: 72px; height: 72px; border-radius: 22px;
            background: linear-gradient(135deg, oklch(0.75 0.17 158) 0%, oklch(0.86 0.16 165) 100%);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 40px oklch(0.75 0.17 158 / 0.35);
          }
          .ls-logo svg { width: 36px; height: 36px; fill: oklch(0.17 0.03 165); }
          .ls-name {
            font-family: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
            color: oklch(0.97 0.004 250);
          }
          .ls-bar-track {
            width: 120px; height: 3px; border-radius: 999px;
            background: oklch(0.97 0.004 250 / 0.1); overflow: hidden;
          }
          .ls-bar {
            height: 100%; border-radius: 999px;
            background: linear-gradient(90deg, oklch(0.75 0.17 158), oklch(0.86 0.16 165));
            animation: ls-load 1.6s ease-in-out infinite;
          }
          @keyframes ls-load {
            0%   { width: 0%;   margin-left: 0%; }
            50%  { width: 60%;  margin-left: 20%; }
            100% { width: 0%;   margin-left: 100%; }
          }
        `}} />
      </head>
      <body>
        <div id="ls-splash" aria-hidden="true">
          <div className="ls-logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 5.5A1 1 0 0 1 7.5 4.5h1A1 1 0 0 1 9.5 5.5v13a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-13ZM14.5 5.5A1 1 0 0 1 15.5 4.5h1a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-13ZM3 10.5A1 1 0 0 1 4 9.5h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3ZM18 10.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3ZM9.5 11.5h5v1h-5v-1Z"/>
            </svg>
          </div>
          <div className="ls-name">LiftSmart</div>
          <div className="ls-bar-track"><div className="ls-bar"></div></div>
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Give the app one frame to paint, then fade out the splash
    const raf = requestAnimationFrame(() => {
      const splash = document.getElementById("ls-splash");
      if (splash) {
        splash.classList.add("ls-hidden");
        splash.addEventListener("transitionend", () => splash.remove(), { once: true });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) =>
        console.warn("[sw] registration failed", err)
      );
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppDataLoader />
        <Outlet />
        <Toaster position="top-center" offset="calc(env(safe-area-inset-top) + 8px)" />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
