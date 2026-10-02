const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, 'data', 'invoices.json');
const BOOKINGS_FILE = path.join(ROOT_DIR, 'data', 'bookings.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function ensureDataFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
  }
}

function readInvoices() {
  ensureDataFile(DATA_FILE);
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeInvoices(invoices) {
  ensureDataFile(DATA_FILE);
  fs.writeFileSync(DATA_FILE, JSON.stringify(invoices, null, 2));
}

function readBookings() {
  ensureDataFile(BOOKINGS_FILE);
  try {
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeBookings(bookings) {
  ensureDataFile(BOOKINGS_FILE);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/bookings') {
    if (req.method === 'GET') {
      sendJson(res, 200, readBookings());
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const booking = JSON.parse(body || '{}');
          if (!booking || Array.isArray(booking) || typeof booking !== 'object') {
            throw new Error('Invalid booking data.');
          }
          const bookings = readBookings();
          booking.id = booking.id || `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
          bookings.unshift(booking);
          writeBookings(bookings);
          sendJson(res, 200, { ok: true, booking, bookings });
        } catch (error) {
          sendJson(res, 400, { ok: false, error: 'Invalid booking data.' });
        }
      });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const bookings = JSON.parse(body || '[]');
          writeBookings(Array.isArray(bookings) ? bookings : []);
          sendJson(res, 200, { ok: true, bookings: readBookings() });
        } catch (error) {
          sendJson(res, 400, { ok: false, error: 'Invalid bookings data.' });
        }
      });
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  if (requestUrl.pathname === '/api/invoices') {
    if (req.method === 'GET') {
      sendJson(res, 200, readInvoices());
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const invoices = JSON.parse(body || '[]');
          writeInvoices(Array.isArray(invoices) ? invoices : []);
          sendJson(res, 200, { ok: true, invoices: readInvoices() });
        } catch (error) {
          sendJson(res, 400, { ok: false, error: 'Invalid invoice data.' });
        }
      });
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  // Handle runtime uploads (POST JSON with base64 data URLs) -> saves to /uploads and returns URLs
  if (requestUrl.pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const files = Array.isArray(payload.files) ? payload.files : [];
        const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const urls = [];
        files.forEach((f) => {
          try {
            const name = f.name || `${Date.now()}`;
            const data = f.data || '';
            const match = data.match(/^data:(.+);base64,(.+)$/);
            let ext = path.extname(name) || '';
            if (match) {
              const mime = match[1];
              const b64 = match[2];
              if (!ext) {
                if (mime === 'image/png') ext = '.png';
                else if (mime === 'image/jpeg') ext = '.jpg';
                else if (mime === 'image/webp') ext = '.webp';
                else if (mime === 'image/gif') ext = '.gif';
                else ext = '.bin';
              }
              const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
              const outPath = path.join(UPLOADS_DIR, safeName);
              const buffer = Buffer.from(b64, 'base64');
              fs.writeFileSync(outPath, buffer);
              urls.push(`/uploads/${safeName}`);
            }
          } catch (err) {
            console.error('Failed saving upload', err);
          }
        });
        sendJson(res, 200, { ok: true, urls });
      } catch (err) {
        console.error('Upload handler error', err);
        sendJson(res, 400, { ok: false, error: 'Invalid upload payload' });
      }
    });
    return;
  }

  let filePath = requestUrl.pathname === '/' ? path.join(ROOT_DIR, 'index.html') : path.join(ROOT_DIR, decodeURIComponent(requestUrl.pathname));
  if (!filePath.startsWith(ROOT_DIR)) {
    filePath = ROOT_DIR;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  serveStaticFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Also available on your local network at http://<your-ip>:${PORT}`);
});
