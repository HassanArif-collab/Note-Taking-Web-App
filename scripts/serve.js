/* ============================================================
 * serve.js - the app, served from this PC, so the iPad can post
 * its recordings straight back.
 *
 * Uploading to GitHub failed because a 2012 TLS stack cannot
 * negotiate with a modern HTTPS endpoint. Plain HTTP on the LAN
 * has no TLS to fail, and serving the app from the same origin
 * means no CORS and no mixed-content block either.
 *
 *   node scripts/serve.js
 *
 * Then open the printed address on the iPad. Recordings land in
 * traces/ as they are made.
 * ============================================================ */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.resolve(__dirname, '..');
var TRACES = path.join(ROOT, 'traces');
var PORT = Number(process.env.PORT || 8080);

if (!fs.existsSync(TRACES)) fs.mkdirSync(TRACES);

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function lanAddresses() {
  var out = [], ifs = os.networkInterfaces(), name, i;
  for (name in ifs) {
    if (!Object.prototype.hasOwnProperty.call(ifs, name)) continue;
    for (i = 0; i < ifs[name].length; i++) {
      var a = ifs[name][i];
      if (a.family === 'IPv4' && !a.internal) out.push({ name: name, addr: a.address });
    }
  }
  return out;
}

function safeName(s) {
  return String(s || 'trace').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60);
}

function stamp() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
         p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

function saveTrace(body, res) {
  var obj = null;
  try { obj = JSON.parse(body); } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('bad json');
    console.log('  !! rejected a malformed upload (' + body.length + ' bytes)');
    return;
  }
  var label = safeName(obj.label || 'trace');
  var file = path.join(TRACES, label + '-' + stamp() + '.json');
  fs.writeFileSync(file, JSON.stringify(obj, null, 0));
  var n = (obj.samples || []).length;
  /* the drill's own verdict counts, so the terminal is a live scoreboard */
  var ink = 0, palm = 0, k;
  for (k = 0; k < (obj.samples || []).length; k++) {
    var r = obj.samples[k];
    if (r[0] === 'v' && r[2] === 'ink') ink++;
    if (r[0] === 'v' && (r[2] === 'palm' || r[2] === 'dwell' ||
        r[2] === 'discarded' || r[2] === 'jumping' || r[2] === 'usurped')) palm++;
  }
  console.log('  <- ' + path.basename(file) + '   ' + n + ' samples, ' +
              ink + ' inked, ' + palm + ' rejected');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
}

http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url.split('?')[0] === '/trace') {
    var body = '';
    req.setEncoding('utf8');
    req.on('data', function (c) {
      body += c;
      if (body.length > 20e6) { req.destroy(); }
    });
    req.on('end', function () { saveTrace(body, res); });
    return;
  }

  if (req.url.split('?')[0] === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('mathnotes');
    return;
  }

  var rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  var file = path.join(ROOT, rel.replace(/^\/+/, ''));
  /* never serve outside the repo */
  if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  /* no caching: the point is that a reload gets the new build */
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(fs.readFileSync(file));
}).listen(PORT, '0.0.0.0', function () {
  var a = lanAddresses(), i;
  console.log('');
  console.log('MathNotes test server');
  console.log('  recordings land in  ' + TRACES);
  console.log('');
  if (!a.length) {
    console.log('  No network address found - is wifi on?');
  } else {
    console.log('  Open this on the iPad (same wifi):');
    for (i = 0; i < a.length; i++) {
      console.log('      http://' + a[i].addr + ':' + PORT + '     (' + a[i].name + ')');
    }
  }
  console.log('');
  console.log('  Ctrl+C to stop.');
  console.log('');
});
