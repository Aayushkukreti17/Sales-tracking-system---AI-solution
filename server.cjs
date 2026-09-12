const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    console.warn('No .env file found; API routes will be unavailable.');
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) {
        reject(new Error('Audio file is too large. Maximum size is 15 MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(body, contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new Error('Missing multipart boundary');
  const boundary = Buffer.from('--' + (match[1] || match[2]));
  const parts = [];
  let start = body.indexOf(boundary);
  while (start !== -1) {
    const next = body.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const part = body.subarray(start + boundary.length, next);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString('utf8');
      const data = part.subarray(headerEnd + 4, part.length - 2);
      const disposition = headers.match(/Content-Disposition:.*name="([^"]+)"(?:; filename="([^"]*)")?/i);
      const type = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      if (disposition) parts.push({ name: disposition[1], filename: disposition[2], contentType: type ? type[1].trim() : 'application/octet-stream', data });
    }
    start = next;
  }
  return parts;
}

async function transcribe(req, res) {
  const apiKey = process.env.SARVAM_API_KEY || process.env.sarvam_api_key;
  if (!apiKey) return sendJson(res, 500, { error: 'SARVAM_API_KEY is not configured on the server.' });
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return sendJson(res, 400, { error: 'Audio must be uploaded as multipart form data.' });
  const parts = parseMultipart(await readBody(req), contentType);
  const file = parts.find((part) => part.name === 'file' && part.filename);
  if (!file || !file.data.length) return sendJson(res, 400, { error: 'No audio file was received.' });

  const form = new FormData();
  form.append('file', new Blob([file.data], { type: file.contentType }), file.filename);
  form.append('model', parts.find((part) => part.name === 'model')?.data.toString() || 'saaras:v4');
  form.append('mode', parts.find((part) => part.name === 'mode')?.data.toString() || 'transcribe');
  const response = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': apiKey }, body: form });
  const result = await response.json();
  if (!response.ok) return sendJson(res, response.status, { error: result.error?.message || result.message || 'Sarvam transcription failed.' });
  return sendJson(res, 200, { transcript: result.transcript || '' });
}

function serveStatic(req, res) {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  if (relative === '.env' || relative.startsWith('.env/')) return sendJson(res, 404, { error: 'Not found' });
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: 'Not found' });
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

loadEnv();
http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS' && req.url === '/api/transcribe') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }
    if (req.method === 'POST' && req.url === '/api/transcribe') return await transcribe(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || 'Unexpected server error' });
  }
}).listen(PORT, () => console.log(`Tipscart server running at http://localhost:${PORT}`));