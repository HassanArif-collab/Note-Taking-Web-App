/* ============================================================
 * zoomshake.js - replay recordings with the screen redrawing every
 * frame, the way the device does, and count how often the zoom turns
 * back on itself. A zoom that reverses direction every few frames is
 * the page visibly shaking.
 *
 *   node scripts/zoomshake.js [build.html] [trace ...]
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var H = require('./harness.js');

var args = process.argv.slice(2);
var html = args.length && /\.html$/.test(args[0]) ? args.shift() : undefined;
var files = args.length ? args : ['live-20260926-150141', 'live-20260926-150201', 'live-20260926-150221'];

files.forEach(function (name) {
  var t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'traces', name.replace(/\.json$/, '') + '.json'), 'utf8'));
  var app = H.load({ quiet: true, html: html, dpr: t.dpr || 2, viewW: t.viewW || 1024, viewH: t.viewH || 712,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'R', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'R', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' },
      set: { palmLevel: typeof t.palmLevel === 'number' ? t.palmLevel : 2, hand: t.hand || 0 } }) } });
  app.flushFrames();
  var lastT = 0, nextFrame = 16.7, zs = [], i, r;
  function frameTo(tt) {
    while (nextFrame <= tt) {
      app.tick(nextFrame - lastT); lastT = nextFrame; nextFrame += 16.7;
      app.flushFrames();
      zs.push(app.geom().zoom);
    }
  }
  for (i = 0; i < t.samples.length; i++) {
    r = t.samples[i];
    if (typeof r[0] !== 'number') continue;
    frameTo(r[4]);
    if (r[4] > lastT) { app.tick(r[4] - lastT); lastT = r[4]; }
    if (r[0] === 0) app.down(r[1], r[2], r[3], r[5] || 0);
    else if (r[0] === 1) app.moveTo(r[1], r[2], r[3]);
    else app.up(r[1], r[0] === 3);
  }
  frameTo(lastT + 500);
  var rev = 0, dir = 0, prev = zs[0], changes = 0, k, dz, nd;
  for (k = 1; k < zs.length; k++) {
    dz = zs[k] - prev;
    if (Math.abs(dz) < 0.002) continue;
    changes++;
    nd = dz > 0 ? 1 : -1;
    if (dir && nd !== dir) rev++;
    dir = nd; prev = zs[k];
  }
  console.log(name + ': zoom changed on ' + changes + ' frames, reversed ' + rev + ' times, range ' +
              Math.min.apply(null, zs).toFixed(2) + '-' + Math.max.apply(null, zs).toFixed(2));
});
process.exit(0);
