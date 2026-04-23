/**
 * Vercel Serverless Entry Point
 *
 * Bridges Expo Router's server output to Vercel's serverless functions.
 * All requests are routed through this handler, which serves both
 * pre-rendered HTML pages and API routes from dist/server/.
 */
const { createRequestHandler } = require("@expo/server/adapter/vercel");
const path = require("path");

module.exports = createRequestHandler({
  build: path.join(__dirname, "../dist/server"),
});
