/**
 * CORS Proxy Worker for Middag
 *
 * Deploy: wrangler deploy cors-proxy-worker.js
 *
 * Set environment variable:
 * wrangler secret put DEFAULT_RECIPE_URL
 * (then paste your Excel file URL)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    try {
      // Get URL from query param, or use default from environment
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url') || env.DEFAULT_RECIPE_URL;

      if (!targetUrl) {
        return new Response('No URL provided and no default configured', {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Fetch the target URL
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Middag-CORS-Proxy/1.0'
        }
      });

      // Clone response and add CORS headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // Add CORS headers
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return newResponse;

    } catch (error) {
      return new Response(`Error fetching URL: ${error.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
