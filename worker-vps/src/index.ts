import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

dotenv.config();

const execAsync = util.promisify(exec);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const CACHE_DIR = process.env.CACHE_DIR || '/var/www/burreromedia/cache';
const RCLONE_REMOTE = process.env.RCLONE_REMOTE || 'gdrive:BurreroMedia';

if (!supabaseUrl || !supabaseKey) {
  console.error("[Worker] ❌ Faltan credenciales de Supabase en el archivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processPendingRequests() {
  console.log(`[Worker] Buscando peticiones de descarga pendientes...`);
  
  const { data: requests, error } = await supabase
    .from('vip_requests')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error("[Worker] Error de Supabase:", error.message);
    return;
  }

  if (!requests || requests.length === 0) {
    return;
  }

  for (const req of requests) {
    console.log(`[Worker] Procesando petición ID ${req.id} - ${req.title}`);
    
    // Marcar como en proceso
    await supabase.from('vip_requests').update({ status: 'downloading' }).eq('id', req.id);

    try {
      // 1. Obtener el enlace de descarga directo (Scraping a Cinecalidad/la.movie)
      const downloadLink = await getDownloadLink(req.source_url, req.provider);
      
      if (!downloadLink) {
        throw new Error("No se pudo extraer un enlace de descarga válido (Mega, 1Fichier, Mediafire)");
      }

      console.log(`[Worker] Enlace encontrado: ${downloadLink}. Iniciando descarga a la VPS...`);

      const fileName = `${req.tmdb_id}_${req.media_type}.mp4`;
      const localPath = path.join(CACHE_DIR, fileName);

      // 2. Descargar el archivo localmente (Usando herramientas CLI según el servidor)
      // Ejemplo simplificado usando curl para enlaces directos puros
      // En la vida real, usaremos megacmd para Mega o jDownloader para 1fichier
      console.log(`[Worker] Descargando a ${localPath}... (Esto tomará tiempo)`);
      // await execAsync(`curl -L -o "${localPath}" "${downloadLink}"`);
      
      // Simulamos la espera por ahora
      await new Promise(r => setTimeout(r, 5000));
      console.log(`[Worker] ✅ Descarga finalizada.`);

      // 3. Subir a Google Drive usando Rclone (En segundo plano)
      console.log(`[Worker] Subiendo respaldo a Google Drive via Rclone...`);
      // Ejecutamos rclone copy sin esperar a que termine para no bloquear, o lo esperamos.
      // await execAsync(`rclone copy "${localPath}" "${RCLONE_REMOTE}/" -P`);

      // 4. Actualizar vip_library para que la App ya lo vea disponible
      await supabase.from('vip_library').insert({
        tmdb_id: req.tmdb_id,
        media_type: req.media_type,
        file_name: fileName,
        quality: '1080p',
        status: 'ready_local'
      });

      // 5. Marcar petición como lista
      await supabase.from('vip_requests').update({ status: 'ready' }).eq('id', req.id);
      
      console.log(`[Worker] 🎉 Proceso exitoso para ${req.title}`);

    } catch (e: any) {
      console.error(`[Worker] ❌ Error procesando ${req.id}:`, e.message);
      await supabase.from('vip_requests').update({ status: 'error', error_log: e.message }).eq('id', req.id);
    }
  }
}

/**
 * Función que raspará la página de la película para sacar los links de descarga.
 */
async function getDownloadLink(sourceUrl: string, provider: string): Promise<string | null> {
    console.log(`[Scraper] Extrayendo links de descarga para ${provider} en ${sourceUrl}...`);
    // TODO: Lógica de Cheerio para extraer links de Cinecalidad o la.movie.
    return "https://example.com/direct_video.mp4";
}

// Iniciar el polling (revisar cada 60 segundos)
setInterval(processPendingRequests, 60 * 1000);
processPendingRequests();
