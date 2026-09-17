/* ============================================================
 * replay.js - replay one recorded trace through the engine and
 * show, contact by contact, what became of it.
 *
 *   node scripts/replay.js traces/palm-rest-....json
 *   node scripts/replay.js <file> --inked      only contacts that drew
 *   node scripts/replay.js <file> --html old.html
 *
 * score.js answers "is it right". This answers "why".
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var core = require('./replay-core.js');

var file = null, htmlPath = null, onlyInked = false;
for (var a = 2; a < process.argv.length; a++) {
  var v = process.argv[a];
  if (v === '--html') htmlPath = process.argv[++a];
  else if (v === '--inked') onlyInked = true;
  else if (!file) file = v;
}
if (!file) {
  console.log('usage: node scripts/replay.js <trace.json> [--inked] [--html <index.html>]');
  process.exit(2);
}

var trace = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!trace.samples || !trace.samples.length) {
  console.log('trace has no samples');
  process.exit(2);
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}
function lpad(s, n) {
  s = String(s);
  while (s.length < n) s = ' ' + s;
  return s;
}

core.replay(trace, { html: htmlPath }, function (r) {
  var drill = trace.drill || trace.label || 'unlabelled';
  console.log('');
  console.log(path.basename(file) + '   [' + drill + ']' +
              (htmlPath ? '   against ' + htmlPath : '   against current index.html'));
  console.log('  ' + (trace.viewW || '?') + 'x' + (trace.viewH || '?') +
              ', palm level ' + (['Off', 'Med', 'Max', 'Strict'][trace.palmLevel] || '?') +
              ', hand ' + (['Right', 'Left', 'Both'][trace.hand] || '?') +
              ', ' + trace.samples.length + ' samples, ' +
              r.order.length + ' contacts');
  console.log('');
  console.log('  ' + pad('contact', 12) + lpad('life', 7) + lpad('travel', 8) +
              lpad('net', 7) + lpad('px/ms', 8) + '   ' +
              pad('device', 14) + 'now');
  console.log('  ' + pad('-------', 12) + lpad('----', 7) + lpad('------', 8) +
              lpad('---', 7) + lpad('-----', 8) + '   ' +
              pad('------', 14) + '---');

  var shown = 0, k;
  for (k = 0; k < r.order.length; k++) {
    var id = r.order[k], c = r.contacts[id];
    var dur = (c.upAt == null ? r.lastT : c.upAt) - c.downAt;
    var net = Math.sqrt((c.lx - c.x0) * (c.lx - c.x0) + (c.ly - c.y0) * (c.ly - c.y0));
    var dev = r.device.verdicts[id] || '-';
    var now = r.verdicts[id] || '-';
    var drew = (now === 'ink' || now === 'shortmark');
    if (onlyInked && !drew) continue;
    shown++;
    console.log('  ' + pad(id, 12) + lpad(dur + 'ms', 7) +
                lpad(Math.round(c.path) + 'px', 8) +
                lpad(Math.round(net) + 'px', 7) +
                lpad((c.path / Math.max(dur, 1)).toFixed(3), 8) + '   ' +
                pad(dev, 14) + now + (drew ? '   <- DREW' : ''));
  }
  if (!shown) console.log('  (none)');

  /* what the gesture engine made of it */
  var g = {}, q;
  for (q = 0; q < r.gestures.length; q++) {
    g[r.gestures[q][1]] = (g[r.gestures[q][1]] || 0) + 1;
  }
  var gl = [], w;
  for (w in g) { if (Object.prototype.hasOwnProperty.call(g, w)) gl.push(w + ' x' + g[w]); }
  console.log('');
  console.log('  gestures: ' + (gl.length ? gl.sort().join(', ') : 'none') +
              '     zoom ended at ' + (r.zoom || 1));
  console.log('  strokes left on the page: ' + r.strokes.length + '   dots: ' + r.dots);
  console.log('');
});
