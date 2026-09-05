CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'lobby',
  max_players integer NOT NULL DEFAULT 4,
  host_client text NOT NULL,
  turn_seat integer NOT NULL DEFAULT 0,
  direction integer NOT NULL DEFAULT 1,
  current_color text,
  draw_pile jsonb NOT NULL DEFAULT '[]'::jsonb,
  discard_pile jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_draw integer NOT NULL DEFAULT 0,
  last_action text,
  winner_client text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  name text NOT NULL,
  seat integer NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  called_uno boolean NOT NULL DEFAULT false,
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, client_id),
  UNIQUE (game_id, seat)
);

CREATE INDEX players_game_id_idx ON public.players(game_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games" ON public.games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create games" ON public.games FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete games" ON public.games FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read players" ON public.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can join as player" ON public.players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can remove players" ON public.players FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER games_set_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;