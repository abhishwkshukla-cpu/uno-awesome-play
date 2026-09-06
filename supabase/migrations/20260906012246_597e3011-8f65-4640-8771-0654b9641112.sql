ALTER TABLE public.games
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE INDEX games_public_lobby_idx
ON public.games (max_players, created_at)
WHERE is_public = true AND status = 'lobby';

CREATE OR REPLACE FUNCTION public.find_or_create_match(
  p_client_id text,
  p_name text,
  p_max_players integer
)
RETURNS TABLE(code text, is_host boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_seat integer;
  v_code text;
BEGIN
  IF length(trim(p_client_id)) < 8 OR length(trim(p_name)) < 1 OR length(trim(p_name)) > 16 THEN
    RAISE EXCEPTION 'Invalid player details';
  END IF;
  IF p_max_players < 2 OR p_max_players > 6 THEN
    RAISE EXCEPTION 'Player count must be between 2 and 6';
  END IF;

  PERFORM pg_advisory_xact_lock(p_max_players);

  SELECT g.* INTO v_game
  FROM public.games g
  WHERE g.is_public = true
    AND g.status = 'lobby'
    AND g.max_players = p_max_players
    AND NOT EXISTS (
      SELECT 1 FROM public.players existing
      WHERE existing.game_id = g.id AND existing.client_id = trim(p_client_id)
    )
    AND (SELECT count(*) FROM public.players count_players WHERE count_players.game_id = g.id) < g.max_players
  ORDER BY g.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_game.id IS NULL THEN
    LOOP
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.games g WHERE g.code = v_code);
    END LOOP;

    INSERT INTO public.games (code, max_players, host_client, status, is_public)
    VALUES (v_code, p_max_players, trim(p_client_id), 'lobby', true)
    RETURNING * INTO v_game;

    INSERT INTO public.players (game_id, client_id, name, seat, is_host)
    VALUES (v_game.id, trim(p_client_id), trim(p_name), 0, true);

    RETURN QUERY SELECT v_game.code, true;
    RETURN;
  END IF;

  SELECT candidate INTO v_seat
  FROM generate_series(0, v_game.max_players - 1) candidate
  WHERE NOT EXISTS (
    SELECT 1 FROM public.players occupied
    WHERE occupied.game_id = v_game.id AND occupied.seat = candidate
  )
  ORDER BY candidate
  LIMIT 1;

  INSERT INTO public.players (game_id, client_id, name, seat, is_host)
  VALUES (v_game.id, trim(p_client_id), trim(p_name), v_seat, false);

  RETURN QUERY SELECT v_game.code, false;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_create_match(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_or_create_match(text, text, integer) TO anon, authenticated, service_role;