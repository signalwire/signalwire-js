const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript', // ES module files
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  // Route requests
  let filePath;
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(__dirname, 'test-page.html');
  } else if (req.url === '/e2e' || req.url === '/e2e/') {
    filePath = path.join(__dirname, 'e2e', 'test-page.html');
  } else if (req.url === '/e2e/transport' || req.url === '/e2e/transport/') {
    filePath = path.join(__dirname, 'e2e', 'test-page-transport.html');
  } else if (req.url.startsWith('/dist/')) {
    // Serve browser bundle and sourcemaps from main package dist directory
    const distRoot = path.resolve(__dirname, '..', 'packages', 'main', 'dist');
    // Strip leading '/' so path.resolve doesn't treat it as absolute
    filePath = path.resolve(__dirname, '..', 'packages', 'main', req.url.slice(1));
    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // Determine content type
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
});
