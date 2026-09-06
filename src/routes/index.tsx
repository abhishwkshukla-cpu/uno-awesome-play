import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const LandingScene = lazy(() => import("@/components/uno3d/LandingScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNO Arena — Play UNO Online with 2 to 6 Friends" },
      {
        name: "description",
        content:
          "Spin up a 3D UNO table in seconds. Pick 2 to 6 players, share an invite link and play classic UNO online with animated cards.",
      },
      { property: "og:title", content: "UNO Arena — Play UNO Online with Friends" },
      {
        property: "og:description",
        content:
          "A 3D UNO table you can share with a link. 2 to 6 players, classic rules, animated cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <ClientOnly fallback={<div className="h-full w-full bg-background" />}>
          <Suspense fallback={<div className="h-full w-full bg-background" />}>
            <LandingScene />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-background/25" />

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="pointer-events-auto flex flex-col items-center gap-8">
          <h1 className="text-display text-[22vw] leading-none text-uno-yellow drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] sm:text-[9rem]">
            UNO
          </h1>
          <Link
            to="/play"
            className="text-display animate-pulse-ring rounded-full bg-uno-red px-16 py-5 text-3xl text-primary-foreground shadow-card transition-transform duration-150 hover:scale-105"
          >
            PLAY
          </Link>
        </div>
      </div>
    </main>
  );
}
