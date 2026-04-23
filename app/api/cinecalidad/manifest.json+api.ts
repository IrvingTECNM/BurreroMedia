export async function GET(request: Request) {
  // CORS Headers are essential for Stremio cross-origin requests
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  });

  return new Response(
    JSON.stringify({
      id: "com.burreromedia.cinecalidad",
      version: "1.0.0",
      name: "Cinecalidad Backend",
      description: "Películas HD en Español adaptadas a través del motor Serverless de BurreroMedia",
      types: ["movie"],
      catalogs: [],
      resources: ["stream"],
      idPrefixes: ["tmdb", "tt", "cc_"]
    }),
    { status: 200, headers }
  );
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
