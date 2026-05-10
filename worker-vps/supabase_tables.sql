-- 1. Tabla para gestionar las peticiones de descarga (VIP Requests)
CREATE TABLE public.vip_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id text NOT NULL,
    media_type text NOT NULL, -- 'movie' o 'series'
    title text NOT NULL,
    provider text NOT NULL, -- Ej: 'cinecalidad', 'lamovie'
    source_url text NOT NULL, -- Enlace de la página de donde raspará
    status text DEFAULT 'pending', -- 'pending', 'downloading', 'ready', 'error'
    error_log text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Tabla para el inventario de la Seedbox (VIP Library)
CREATE TABLE public.vip_library (
    tmdb_id text PRIMARY KEY,
    media_type text NOT NULL,
    file_name text NOT NULL,
    quality text DEFAULT '1080p',
    status text DEFAULT 'ready_local', -- 'ready_local' (en disco de la VPS) o 'ready_drive' (solo en GDrive)
    added_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Opcional pero recomendado para seguridad en el frontend)
ALTER TABLE public.vip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_library ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para permitir lectura/escritura a los usuarios autenticados
CREATE POLICY "Permitir lectura a todos" ON public.vip_requests FOR SELECT USING (true);
CREATE POLICY "Permitir insertar a usuarios" ON public.vip_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir lectura a todos" ON public.vip_library FOR SELECT USING (true);
