import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getPlayerName, setPlayerName, makeRoomCode } from "@/lib/identity";
import { UnoCardFace } from "@/components/UnoCardFace";
import { COLORS } from "@/lib/uno";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Start an UNO Table — Choose 2 to 6 Players" },
      {
        name: "description",
        content:
          "Name your player, choose a table of 2 to 6 seats and create an UNO room, or join a friend with their room code.",
      },
      { property: "og:title", content: "Start an UNO Table" },
      {
        property: "og:description",
        content: "Create an UNO room for 2 to 6 players, or join with a room code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaySetup,
});

function PlaySetup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getPlayerName());
  }, []);

  async function createRoom() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter your player name first");
      return;
    }
    setBusy(true);
    setPlayerName(trimmed);
    const clientId = getClientId();
    const code = makeRoomCode();
    const { data: game, error } = await supabase
      .from("games")
      .insert({ code, max_players: seats, host_client: clientId, status: "lobby" })
      .select()
      .single();
    if (error || !game) {
      setBusy(false);
      {
      toast.error("Could not create the table. Try again.");
      return;
    }
    }
    const { error: pErr } = await supabase.from("players").insert({
      game_id: game.id,
      client_id: clientId,
      name: trimmed,
      seat: 0,
      is_host: true,
    });
    setBusy(false);
    if (pErr) {
      toast.error("Could not take a seat. Try again.");
      return;
    }
    navigate({ to: "/room/$code", params: { code } });
  }

  async function joinRoom() {
    const trimmed = name.trim();
    const code = joinCode.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Enter your player name first");
      return;
    }
    if (!code) {
      toast.error("Enter the room code");
      return;
    }
    setPlayerName(trimmed);
    navigate({ to: "/room/$code", params: { code } });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-5 py-12">
      <div className="text-center">
        <Link to="/" className="text-display text-4xl text-uno-yellow">
          UNO
        </Link>
        <h1 className="text-display mt-4 text-3xl">Set up your table</h1>
        <p className="mt-2 text-muted-foreground">
          Pick how many friends are playing, then share the invite link.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card/80 p-6 backdrop-blur">
        <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="e.g. Abhishek"
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
        />

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Players at the table
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setSeats(n)}
              className={`text-display h-14 w-14 rounded-2xl border text-2xl transition-transform hover:scale-105 ${
                seats === n
                  ? "border-uno-yellow bg-uno-red text-white shadow-glow"
                  : "border-border bg-secondary text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {COLORS.slice(0, Math.min(seats, 4)).map((c, i) => (
            <div key={c} className="animate-card-in" style={{ animationDelay: `${i * 70}ms` }}>
              <UnoCardFace card={{ id: `p${i}`, color: c, value: String(i + 1) as never }} size="sm" />
            </div>
          ))}
        </div>

        <button
          onClick={createRoom}
          disabled={busy}
          className="text-display mt-7 w-full rounded-2xl bg-uno-red py-4 text-2xl text-white shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {busy ? "Dealing…" : "Create table"}
        </button>
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Got an invite code?
        </p>
        <div className="mt-3 flex gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="ABC12"
            className="text-display w-full rounded-xl border border-input bg-background px-4 py-3 text-xl tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={joinRoom}
            className="text-display rounded-xl bg-uno-blue px-6 text-lg text-white transition-transform hover:scale-105"
          >
            Join
          </button>
        </div>
      </section>
    </main>
  );
}
