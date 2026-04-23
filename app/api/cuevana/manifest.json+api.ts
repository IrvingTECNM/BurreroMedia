export async function GET(request: Request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  });

  return new Response(
    JSON.stringify({
      id: "com.burreromedia.cuevana",
      version: "1.0.0",
      name: "Cuevana3 Backend",
      description: "Películas y Series HD en múltiples idiomas (Latino, Sub, Español) con 7 servidores",
      types: ["movie"],
      catalogs: [],
      resources: ["stream"],
      idPrefixes: ["tmdb", "tt"]
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
