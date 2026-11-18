const http = require('http');

const PORT = 5000;

function createServer() {
  return http.createServer((req, res) => {
    // CORS headers for local testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost:5000'}`);
    const pathname = url.pathname;

    res.setHeader('Content-Type', 'application/json');

    // 1. Auth Login (Real backend response)
    if (req.method === 'POST' && pathname === '/api/v1/auth/login') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'simulated_real_jwt_token',
            refreshToken: 'simulated_real_refresh_token',
            user: {
              id: 'usr_real_01',
              name: 'Real Admin User',
              email: 'admin@ecobin.eg',
              role: 'SysAdmin',
            },
          },
        })
      );
      return;
    }

    // 2. Admin Bins List (Real backend response)
    if (req.method === 'GET' && pathname === '/api/v1/admin/bins') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          data: [],
          meta: {
            page: 1,
            pageSize: 20,
            totalItems: 0,
            totalPages: 0,
          },
        })
      );
      return;
    }

    // 3. Proposed endpoint: /api/v1/admin/bins/map (Simulate 404 unimplemented)
    if (pathname === '/api/v1/admin/bins/map') {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Endpoint /api/v1/admin/bins/map is not implemented on this backend version.',
          },
        })
      );
      return;
    }

    // Default 404 for unhandled paths
    res.writeHead(404);
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Path ${pathname} not found on simulated real backend`,
        },
      })
    );
  });
}

// If run with --test, execute self-test and terminate
if (process.argv.includes('--test')) {
  const server = createServer().listen(PORT, async () => {
    console.log(`[Simulator] Started on http://localhost:${PORT}`);
    const results = [];

    async function testEndpoint(name, path, method = 'GET', body = null) {
      try {
        const response = await fetch(`http://localhost:${PORT}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        results.push({ name, path, status: response.status, ok: response.ok, data: json });
        console.log(`  [${response.status}] ${method} ${path} ->`, json.success ? 'SUCCESS' : json.error?.code);
      } catch (err) {
        results.push({ name, path, error: err.message });
        console.error(`  [FAIL] ${method} ${path} ->`, err.message);
      }
    }

    await testEndpoint('Auth Login', '/api/v1/auth/login', 'POST', { email: 'admin@ecobin.eg', password: 'password123' });
    await testEndpoint('Admin Bins List', '/api/v1/admin/bins?page=1&pageSize=20', 'GET');
    await testEndpoint('PROPOSED Map Live Feed', '/api/v1/admin/bins/map', 'GET');

    server.close(() => {
      console.log('[Simulator] Self-test complete. Server closed.');
    });
  });
} else {
  const server = createServer().listen(PORT, () => {
    console.log(`[Simulator] Real backend simulation running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.');
  });
}
