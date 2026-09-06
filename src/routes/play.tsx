import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe2, Link2, LogIn, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getPlayerName, setPlayerName, makeRoomCode } from "@/lib/identity";
import { Button } from "@/components/ui/button";

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

  async function quickMatch() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter your player name first");
      return;
    }
    setBusy(true);
    setPlayerName(trimmed);
    const { data, error } = await supabase.rpc("find_or_create_match", {
      p_client_id: getClientId(),
      p_name: trimmed,
      p_max_players: seats,
    });
    setBusy(false);
    const match = data?.[0];
    if (error || !match) {
      toast.error("Could not find a match. Try again.");
      return;
    }
    navigate({ to: "/room/$code", params: { code: match.code } });
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
    <main className="night-page min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center">
        <div className="text-center">
        <Link to="/" className="text-display text-5xl text-uno-yellow">
          UNO
        </Link>
        <h1 className="mt-3 text-2xl font-black">Choose your game</h1>
        </div>

      <section className="mt-8 rounded-lg border border-border bg-card/85 p-5 shadow-card backdrop-blur-md sm:p-7">
        <label className="text-sm font-bold text-muted-foreground">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="e.g. Abhishek"
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
        />

        <p className="mt-6 text-sm font-bold text-muted-foreground">
          Match size
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <Button
              key={n}
              type="button"
              variant={seats === n ? "default" : "secondary"}
              onClick={() => setSeats(n)}
              className={`text-display h-12 min-w-0 rounded-md border text-xl ${seats === n ? "border-uno-yellow bg-uno-red shadow-glow" : "border-border"}`}
            >
              {n}
            </Button>
          ))}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button onClick={createRoom} disabled={busy} className="h-auto rounded-md bg-uno-red px-5 py-5 text-left hover:bg-uno-red/90">
            <Link2 className="size-6" />
            <span><span className="block text-lg font-black">Invite friends</span><span className="block text-xs font-normal opacity-80">Create a private room</span></span>
          </Button>
          <Button onClick={quickMatch} disabled={busy} className="h-auto rounded-md bg-uno-blue px-5 py-5 text-left hover:bg-uno-blue/90">
            <Globe2 className="size-6" />
            <span><span className="block text-lg font-black">Quick match</span><span className="block text-xs font-normal opacity-80">Play with new people</span></span>
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card/75 p-5 backdrop-blur-md">
        <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Users className="size-4" /> Join a private room
        </p>
        <div className="mt-3 flex gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="ABC12"
            className="text-display min-w-0 flex-1 rounded-md border border-input bg-background/85 px-4 py-3 text-xl tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={joinRoom}
            className="h-auto rounded-md bg-uno-blue px-5 hover:bg-uno-blue/90"
            aria-label="Join room"
          >
            <LogIn className="size-5" /><span className="hidden sm:inline">Join</span>
          </Button>
        </div>
      </section>
      </div>
    </main>
  );
}
