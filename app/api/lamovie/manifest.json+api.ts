const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  const manifest = {
    id: 'com.burreromedia.lamovie',
    version: '1.0.0',
    name: 'La.Movie',
    description: 'Buscador de películas en La.Movie (Latino/Subtitulado)',
    idPrefixes: ['tmdb:'],
    resources: ['stream'],
    types: ['movie'],
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
