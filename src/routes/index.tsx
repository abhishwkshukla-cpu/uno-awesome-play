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

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,20,0.92)_0%,rgba(8,10,20,0.6)_45%,transparent_80%)]" />

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col items-center justify-between px-6 py-10 text-center">
        <header className="pointer-events-auto">
          <p className="text-sm uppercase tracking-[0.5em] text-uno-yellow">Online card table</p>
        </header>

        <div className="pointer-events-auto flex flex-col items-center gap-6">
          <h1 className="text-display text-[22vw] leading-none text-uno-yellow drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] sm:text-[9rem]">
            UNO
          </h1>
          <p className="max-w-md text-base text-foreground/85">
            Classic cards, real friends. Choose 2 to 6 seats, share your invite link and play
            live at the same table.
          </p>
          <Link
            to="/play"
            className="text-display animate-pulse-ring rounded-full bg-uno-red px-14 py-5 text-3xl text-white shadow-card transition-transform duration-200 hover:scale-105"
          >
            PLAY UNO
          </Link>
        </div>

        <ul className="pointer-events-auto grid w-full max-w-3xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          {[
            ["2–6 players", "Pick your table size before you deal"],
            ["Invite links", "One link, everyone joins instantly"],
            ["Live table", "Cards fly the moment someone plays"],
          ].map(([title, sub]) => (
            <li
              key={title}
              className="animate-float-y rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur"
            >
              <p className="text-display text-uno-yellow">{title}</p>
              <p className="text-muted-foreground">{sub}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
