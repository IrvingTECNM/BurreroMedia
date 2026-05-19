-- BurreroMedia Supabase Setup & RLS Policies

-- 1. Create Tables

-- Profiles table (stores user Netflix-style profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid DEFAULT auth.uid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_color text DEFAULT '#E50914',
  pin text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();

-- Watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tmdb_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv')),
  status text DEFAULT 'want_to_watch' CHECK (status IN ('want_to_watch', 'watching', 'watched')),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tmdb_id)
);

-- Watching Progress table (for "Continue Watching")
CREATE TABLE IF NOT EXISTS public.watching_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tmdb_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv')),
  position_seconds integer NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 0,
  season integer,
  episode integer,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tmdb_id)
);

-- Recommendations table (for Social Feed)
CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tmdb_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv')),
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watching_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Watchlist is open" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist manageable by authenticated users" ON public.watchlist;
DROP POLICY IF EXISTS "Watching progress is open" ON public.watching_progress;
DROP POLICY IF EXISTS "Watching progress manageable by authenticated users" ON public.watching_progress;
DROP POLICY IF EXISTS "Recommendations are open" ON public.recommendations;
DROP POLICY IF EXISTS "Recommendations manageable by authenticated users" ON public.recommendations;

-- The app uses family profiles as product identity, but database access must
-- still require a Supabase Auth session. The client creates an anonymous Auth
-- session before querying these tables.

CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles insertable by authenticated users"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Profiles updatable by owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Watchlist manageable by authenticated users"
  ON public.watchlist FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Watching progress manageable by authenticated users"
  ON public.watching_progress FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recommendations manageable by authenticated users"
  ON public.recommendations FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for the recommendations table
alter publication supabase_realtime add table recommendations;
