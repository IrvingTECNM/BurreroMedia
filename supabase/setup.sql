-- BurreroMedia Supabase Setup & RLS Policies

-- 1. Create Tables

-- Profiles table (stores user Netflix-style profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_color text DEFAULT '#E50914',
  pin text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- For this specific app structure where all users potentially share the same Supabase anon key 
-- to view profiles (like a family Netflix account), we allow open access to read profiles.
-- (In a real production app with individual accounts, this would use auth.uid())

-- Profiles: Anyone can read, insert, and update profiles (family mode)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles can be inserted by everyone" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Profiles can be updated by everyone" ON public.profiles FOR UPDATE USING (true);

-- Watchlist: Anyone can read and manage (since auth is custom over anon key)
CREATE POLICY "Watchlist is open" ON public.watchlist FOR ALL USING (true);

-- Watching Progress: Anyone can read and manage 
CREATE POLICY "Watching progress is open" ON public.watching_progress FOR ALL USING (true);

-- Recommendations: Anyone can read and manage 
CREATE POLICY "Recommendations are open" ON public.recommendations FOR ALL USING (true);

-- Enable realtime for the recommendations table
alter publication supabase_realtime add table recommendations;
