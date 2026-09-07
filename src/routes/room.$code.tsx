import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getPlayerName, setPlayerName } from "@/lib/identity";
import { UnoCardFace } from "@/components/UnoCardFace";
import {
  buildDeck,
  canPlay,
  cardLabel,
  COLORS,
  COLOR_HEX,
  shuffle,
  type CardColor,
  type UnoCard,
} from "@/lib/uno";

export const Route = createFileRoute("/room/$code")({
  head: () => ({
    meta: [
      { title: "UNO Room — Join the Table" },
      {
        name: "description",
        content:
          "Join this UNO room, take a seat and play live with up to 6 players. Classic rules, animated cards, instant turns.",
      },
      { property: "og:title", content: "Join my UNO table" },
      {
        property: "og:description",
        content: "Tap to take a seat and play UNO live with friends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

interface GameRow {
  id: string;
  code: string;
  status: string;
  max_players: number;
  host_client: string;
  turn_seat: number;
  direction: number;
  current_color: string | null;
  draw_pile: unknown;
  discard_pile: unknown;
  pending_draw: number;
  last_action: string | null;
  winner_client: string | null;
}

interface PlayerRow {
  id: string;
  game_id: string;
  client_id: string;
  name: string;
  seat: number;
  is_host: boolean;
  called_uno: boolean;
  hand: unknown;
}

const seatColor = (i: number) => COLOR_HEX[COLORS[i % COLORS.length]!];
const toJson = (cards: UnoCard[]) => cards as unknown as never;

const asCards = (value: unknown): UnoCard[] => (Array.isArray(value) ? (value as UnoCard[]) : []);

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pickColorFor, setPickColorFor] = useState<UnoCard | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setClientId(getClientId());
    setNameInput(getPlayerName());
  }, []);

  const load = useCallback(async () => {
    const { data: g } = await supabase
      .from("games")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (!g) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setGame(g as GameRow);
    const { data: ps } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", g.id)
      .order("seat");
    setPlayers((ps ?? []) as PlayerRow[]);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;
    const channel = supabase
      .channel(`room-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as GameRow | undefined;
          if (row?.id) setGame(row);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            setPlayers((prev) => prev.filter((p) => p.id !== old.id));
            return;
          }
          const row = payload.new as PlayerRow | undefined;
          if (!row?.id) return;
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === row.id);
            const next = exists ? prev.map((p) => (p.id === row.id ? row : p)) : [...prev, row];
            return next.sort((a, b) => a.seat - b.seat);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [game?.id]);

  // Auto-start once every seat is filled (host does the deal).
  useEffect(() => {
    if (!game || game.status !== "lobby") return;
    if (game.host_client !== clientId) return;
    if (players.length < game.max_players) return;
    void startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.max_players, game?.host_client, players.length, clientId]);


  const me = players.find((p) => p.client_id === clientId) ?? null;
  const isHost = !!game && game.host_client === clientId;
  const discard = asCards(game?.discard_pile);
  const top = discard[discard.length - 1];
  const myHand = asCards(me?.hand);
  const myTurn = !!game && !!me && game.status === "playing" && game.turn_seat === me.seat;
  const currentColor = (game?.current_color ?? null) as CardColor | null;
  const inviteLink = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/room/${code.toUpperCase()}`),
    [code],
  );

  /* ---------------------------- actions ---------------------------- */

  async function takeSeat() {
    if (!game) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Enter your name first");
      return;
    }
    if (game.status !== "lobby") {
      toast.error("This game already started");
      return;
    }
    if (players.length >= game.max_players) {
      toast.error("Table is full");
      return;
    }
    setPlayerName(trimmed);
    const used = new Set(players.map((p) => p.seat));
    let seat = 0;
    while (used.has(seat)) seat += 1;
    const { error } = await supabase.from("players").insert({
      game_id: game.id,
      client_id: clientId,
      name: trimmed,
      seat,
    });
    if (error) toast.error("Could not take a seat");
    else void load();
  }

  async function startGame() {
    if (!game || !isHost) return;
    if (players.length < 2) {
      toast.error("You need at least 2 players");
      return;
    }
    setWorking(true);
    let deck = buildDeck();
    const hands: Record<string, UnoCard[]> = {};
    for (const p of players) hands[p.id] = [];
    for (let r = 0; r < 7; r++) {
      for (const p of players) hands[p.id]!.push(deck.pop()!);
    }
    let first = deck.pop()!;
    while (first.color === "wild") {
      deck = shuffle([...deck, first]);
      first = deck.pop()!;
    }
    await Promise.all(
      players.map((p) => supabase.from("players").update({ hand: toJson(hands[p.id]!), called_uno: false }).eq("id", p.id)),
    );
    await supabase
      .from("games")
      .update({
        status: "playing",
        draw_pile: toJson(deck),
        discard_pile: toJson([first]),
        current_color: first.color,
        turn_seat: players[0]!.seat,
        direction: 1,
        winner_client: null,
        last_action: "Game started",
      })
      .eq("id", game.id);
    setWorking(false);
  }

  function seatOrder() {
    return players.map((p) => p.seat);
  }

  function seatAfter(seat: number, steps: number, direction: number) {
    const order = seatOrder();
    const idx = order.indexOf(seat);
    const next = (((idx + steps * direction) % order.length) + order.length) % order.length;
    return order[next]!;
  }

  function drawCards(count: number, drawPile: UnoCard[], discardPile: UnoCard[]) {
    let pile = [...drawPile];
    let disc = [...discardPile];
    const taken: UnoCard[] = [];
    for (let i = 0; i < count; i++) {
      if (pile.length === 0) {
        const keep = disc.slice(-1);
        const recycled = disc.slice(0, -1).map((c) => ({ ...c, color: c.value === "wild" || c.value === "wild4" ? ("wild" as const) : c.color }));
        pile = shuffle(recycled);
        disc = keep;
        if (pile.length === 0) break;
      }
      taken.push(pile.pop()!);
    }
    return { taken, pile, disc };
  }

  async function playCard(card: UnoCard, chosenColor?: CardColor) {
    if (!game || !me || !myTurn || working) return;
    if (!canPlay(card, top, currentColor)) {
      toast.error("You can't play that card");
      return;
    }
    if (card.color === "wild" && !chosenColor) {
      setPickColorFor(card);
      return;
    }
    setWorking(true);
    setPickColorFor(null);

    const newHand = myHand.filter((c) => c.id !== card.id);
    let pile = asCards(game.draw_pile);
    let disc = [...discard, card];
    const color: CardColor = card.color === "wild" ? chosenColor! : card.color;
    let direction = game.direction;
    let steps = 1;
    let victimSeat: number | null = null;
    let victimDraw = 0;

    if (card.value === "reverse") {
      if (players.length === 2) steps = 2;
      else direction = -direction;
    } else if (card.value === "skip") {
      steps = 2;
    } else if (card.value === "draw2" || card.value === "wild4") {
      victimSeat = seatAfter(me.seat, 1, direction);
      victimDraw = card.value === "draw2" ? 2 : 4;
      steps = 2;
    }

    if (victimSeat !== null) {
      const victim = players.find((p) => p.seat === victimSeat)!;
      const res = drawCards(victimDraw, pile, disc);
      pile = res.pile;
      disc = res.disc;
      await supabase
        .from("players")
        .update({ hand: toJson([...asCards(victim.hand), ...res.taken]), called_uno: false })
        .eq("id", victim.id);
    }

    const won = newHand.length === 0;
    await supabase
      .from("players")
      .update({ hand: toJson(newHand), called_uno: newHand.length === 1 ? me.called_uno : false })
      .eq("id", me.id);

    await supabase
      .from("games")
      .update({
        draw_pile: toJson(pile),
        discard_pile: toJson(disc),
        current_color: color,
        direction,
        turn_seat: won ? me.seat : seatAfter(me.seat, steps, direction),
        status: won ? "finished" : "playing",
        winner_client: won ? clientId : null,
        last_action: `${me.name} played ${color === "wild" ? "" : color} ${cardLabel(card)}`.trim(),
      })
      .eq("id", game.id);
    setWorking(false);
    if (won) toast.success("You won the round! 🎉");
  }

  async function drawCard() {
    if (!game || !me || !myTurn || working) return;
    setWorking(true);
    const res = drawCards(1, asCards(game.draw_pile), discard);
    await supabase
      .from("players")
      .update({ hand: toJson([...myHand, ...res.taken]), called_uno: false })
      .eq("id", me.id);
    await supabase
      .from("games")
      .update({
        draw_pile: toJson(res.pile),
        discard_pile: toJson(res.disc),
        turn_seat: seatAfter(me.seat, 1, game.direction),
        last_action: `${me.name} drew a card`,
      })
      .eq("id", game.id);
    setWorking(false);
  }

  async function callUno() {
    if (!me) return;
    await supabase.from("players").update({ called_uno: true }).eq("id", me.id);
    toast.success("UNO!");
  }

  async function playAgain() {
    if (!isHost || !game) return;
    await supabase
      .from("games")
      .update({ status: "lobby", discard_pile: toJson([]), draw_pile: toJson([]), winner_client: null, last_action: null })
      .eq("id", game.id);
    await Promise.all(players.map((p) => supabase.from("players").update({ hand: toJson([]), called_uno: false }).eq("id", p.id)));
  }

  /* ---------------------------- render ---------------------------- */

  if (loading) {
    return <Centered>Shuffling the deck…</Centered>;
  }

  if (notFound || !game) {
    return (
      <Centered>
        <p className="text-display text-2xl">Room {code.toUpperCase()} doesn&apos;t exist</p>
        <Link to="/play" className="mt-4 rounded-xl bg-uno-red px-6 py-3 text-white">
          Start a new table
        </Link>
      </Centered>
    );
  }

  if (!me) {
    return (
      <Centered>
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-6 text-center backdrop-blur">
          <p className="text-display text-3xl text-uno-yellow">Join room {game.code}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {players.length} / {game.max_players} seats taken
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={16}
            placeholder="Your name"
            className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={takeSeat}
            className="text-display mt-4 w-full rounded-2xl bg-uno-red py-3 text-xl text-white"
          >
            Take a seat
          </button>
        </div>
      </Centered>
    );
  }

  if (game.status === "lobby") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-5 py-12">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Waiting room</p>
          <p className="text-display mt-2 text-6xl tracking-[0.2em] text-uno-yellow">{game.code}</p>
        </div>

        <div className="rounded-3xl border border-border bg-card/80 p-6 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Invite link
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="w-full truncate rounded-xl border border-input bg-background px-3 py-3 text-sm"
            />
            <button
              onClick={() => {
                void navigator.clipboard.writeText(inviteLink);
                toast.success("Invite link copied");
              }}
              className="text-display rounded-xl bg-uno-blue px-5 text-white"
            >
              Copy
            </button>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Players {players.length}/{game.max_players}
          </p>
          <ul className="mt-3 space-y-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="animate-card-in flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="text-display flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: seatColor(i) }}
                >
                  {i + 1}
                </span>
                <span className="font-semibold">{p.name}</span>
                {p.is_host && <span className="text-xs text-uno-yellow">HOST</span>}
                {p.client_id === clientId && <span className="text-xs text-muted-foreground">you</span>}
              </li>
            ))}
            {Array.from({ length: Math.max(0, game.max_players - players.length) }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="animate-float-y rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
              >
                Waiting for a player…
              </li>
            ))}
          </ul>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2 || working}
              className="text-display mt-6 w-full rounded-2xl bg-uno-red py-4 text-2xl text-white disabled:opacity-50"
            >
              {players.length < 2 ? "Need 2+ players" : "Deal the cards"}
            </button>
          ) : (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Waiting for the host to start…
            </p>
          )}
        </div>
      </main>
    );
  }

  const others = players.filter((p) => p.client_id !== clientId);
  const winner = players.find((p) => p.client_id === game.winner_client);

  return (
    <main className="flex min-h-screen flex-col gap-4 px-4 py-5">
      <header className="flex items-center justify-between text-sm">
        <Link to="/" className="text-display text-2xl text-uno-yellow">
          UNO
        </Link>
        <span className="text-muted-foreground">{game.last_action ?? "Good luck!"}</span>
        <span className="rounded-full bg-secondary px-3 py-1 tracking-widest">{game.code}</span>
      </header>

      <section className="flex flex-wrap justify-center gap-3">
        {others.map((p, i) => {
          const active = p.seat === game.turn_seat && game.status === "playing";
          return (
            <div
              key={p.id}
              className={`rounded-2xl border px-4 py-3 text-center transition-all ${
                active ? "border-uno-yellow bg-card shadow-glow" : "border-border bg-card/60"
              }`}
            >
              <p className="font-semibold" style={{ color: seatColor(i) }}>
                {p.name}
              </p>
              <div className="mt-2 flex justify-center -space-x-6">
                {asCards(p.hand)
                  .slice(0, 6)
                  .map((c, k) => (
                    <div key={c.id} className="animate-card-in" style={{ animationDelay: `${k * 40}ms` }}>
                      <UnoCardFace back size="sm" />
                    </div>
                  ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {asCards(p.hand).length} cards {p.called_uno ? "· UNO!" : ""}
              </p>
            </div>
          );
        })}
      </section>

      <section className="flex flex-1 flex-col items-center justify-center gap-5">
        <div
          className="flex items-center gap-8 rounded-[2rem] border border-border p-8"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${
              currentColor && currentColor !== "wild" ? COLOR_HEX[currentColor] : "#333"
            }33, transparent 70%)`,
          }}
        >
          <button
            onClick={drawCard}
            disabled={!myTurn || working}
            className="transition-transform hover:-translate-y-2 disabled:opacity-60"
            aria-label="Draw a card"
          >
            <UnoCardFace back size="lg" />
          </button>
          {top && (
            <div key={top.id} className="animate-card-in">
              <UnoCardFace card={top} size="lg" />
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Current colour:{" "}
          <span
            className="text-display"
            style={{ color: currentColor && currentColor !== "wild" ? COLOR_HEX[currentColor] : undefined }}
          >
            {currentColor ?? "—"}
          </span>
          {" · "}
          {game.status === "finished"
            ? `${winner?.name ?? "Someone"} won!`
            : myTurn
              ? "Your turn"
              : `${players.find((p) => p.seat === game.turn_seat)?.name ?? ""}'s turn`}
        </p>

        {game.status === "finished" && (
          <div className="rounded-2xl border border-uno-yellow bg-card px-6 py-4 text-center">
            <p className="text-display text-2xl text-uno-yellow">
              {winner?.client_id === clientId ? "You won!" : `${winner?.name} wins!`}
            </p>
            {isHost && (
              <button onClick={playAgain} className="text-display mt-3 rounded-xl bg-uno-red px-6 py-2 text-white">
                Play again
              </button>
            )}
          </div>
        )}
      </section>

      <section className="sticky bottom-0 rounded-t-3xl border-t border-border bg-card/85 px-3 pb-4 pt-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Your hand · {myHand.length}</p>
          <button
            onClick={callUno}
            disabled={myHand.length !== 1 || me.called_uno}
            className="text-display animate-pulse-ring rounded-full bg-uno-yellow px-6 py-2 text-xl text-uno-ink disabled:animate-none disabled:opacity-40"
          >
            UNO!
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 pt-6">
          {myHand.map((c, i) => (
            <div key={c.id} className="animate-card-in" style={{ animationDelay: `${i * 35}ms` }}>
              <UnoCardFace
                card={c}
                size="md"
                onClick={() => playCard(c)}
                disabled={!myTurn || !canPlay(c, top, currentColor) || working}
              />
            </div>
          ))}
        </div>
      </section>

      {pickColorFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-display text-2xl">Choose a colour</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => playCard(pickColorFor, c)}
                  className="text-display h-20 rounded-2xl text-xl text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: COLOR_HEX[c] }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      {children}
    </div>
  );
}
