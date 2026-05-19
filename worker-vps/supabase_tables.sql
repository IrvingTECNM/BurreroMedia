-- 1. Tabla para gestionar las peticiones de descarga (VIP Requests)
CREATE TABLE IF NOT EXISTS public.vip_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid DEFAULT auth.uid(),
    tmdb_id text NOT NULL,
    media_type text NOT NULL, -- 'movie' o 'series'
    title text NOT NULL,
    provider text NOT NULL, -- Ej: 'cinecalidad', 'lamovie'
    source_url text NOT NULL, -- Enlace de la pagina de donde raspar
    status text DEFAULT 'pending', -- 'pending', 'downloading', 'ready', 'error'
    error_log text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.vip_requests
    ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();

-- 2. Tabla para el inventario de la Seedbox (VIP Library)
CREATE TABLE IF NOT EXISTS public.vip_library (
    tmdb_id text PRIMARY KEY,
    media_type text NOT NULL,
    file_name text NOT NULL,
    quality text DEFAULT '1080p',
    status text DEFAULT 'ready_local', -- 'ready_local' en VPS o 'ready_drive' en GDrive
    added_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.vip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.vip_requests;
DROP POLICY IF EXISTS "Permitir insertar a usuarios" ON public.vip_requests;
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.vip_library;
DROP POLICY IF EXISTS "Permitir lectura autenticada" ON public.vip_requests;
DROP POLICY IF EXISTS "Permitir insertar a usuarios autenticados" ON public.vip_requests;
DROP POLICY IF EXISTS "Permitir lectura autenticada" ON public.vip_library;

CREATE POLICY "Permitir lectura autenticada" ON public.vip_requests
    FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir insertar a usuarios autenticados" ON public.vip_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir lectura autenticada" ON public.vip_library
    FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
