const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  const manifest = {
    id: 'com.burreromedia.lamovie',
    version: '2.0.0',
    name: 'La.Movie',
    description: 'Películas y Series en La.Movie (Latino/Subtitulado) — Vimeos, Goodstream, HLSWish',
    idPrefixes: ['tmdb:'],
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    behaviorHints: {
      configurable: false,
      configurationRequired: false
    }
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
