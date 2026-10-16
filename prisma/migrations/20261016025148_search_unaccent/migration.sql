-- Accent-insensitive search for the user and survey tables (no table changes).
-- unaccent() is only STABLE; the IMMUTABLE wrapper lets a future expression index use it
-- (for example a pg_trgm index on f_unaccent(lower(name))).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
