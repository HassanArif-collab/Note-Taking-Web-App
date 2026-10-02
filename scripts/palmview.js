/* ============================================================
 * palmview.js - draw recordings as a picture, each contact coloured by
 * what this build makes of it (palmfate.js replays them). Unlabelled
 * writing ("live" recordings) has no drill to say which contact was the
 * pen; the picture does - handwriting looks like handwriting, a resting
 * hand does not.
 *
 *   node scripts/palmview.js [--auto] [--html f] out.html traces/live-....json [...]
 *   node scripts/shot.js file:///<abs path>/out.html out.png "" 1100 <height>
 *
 *   black   drawn and kept             red     drawn, then taken away
 *   green   kept, but shown late       grey    never drawn (the hand)
 * ============================================================ */
'use strict';
var fs = require('fs'), path = require('path');
var fate = require('./palmfate.js').fate;
var args = process.argv.slice(2), opts = {}, files = [], out = null;
for (var a = 0; a < args.length; a++) {
  if (args[a] === '--auto') opts.auto = true;
  else if (args[a] === '--html') opts.html = args[++a];
  else if (!out) out = args[a];
  else files.push(args[a]);
}
var COL = { kept: '#000', late: '#0a0', 'shown-removed': '#e00', never: '#bbb', open: '#08f' };
var html = ['<!doctype html><meta charset="utf-8"><body style="margin:0;font:12px sans-serif;background:#fff">'];

(function next(i) {
  if (i >= files.length) { fs.writeFileSync(out, html.join('\n')); console.log('wrote ' + out); return; }
  var f = files[i], tr = JSON.parse(fs.readFileSync(f, 'utf8'));
  var W = tr.viewW || 1024, Hh = (tr.viewH || 600) + (tr.wrapTop || 0);
  fate(tr, opts).then(function (res) {
    var svg = [], n = {};
    res.contacts.forEach(function (c) {
      var col = COL[c.fate], d = c.pts.map(function (p, j) { return (j ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join('');
      n[c.fate] = (n[c.fate] || 0) + 1;
      svg.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (c.fate === 'never' ? 2 : 2.5) +
               '" stroke-linecap="round" stroke-linejoin="round"/>');
      if (c.path < 3) svg.push('<circle cx="' + c.pts[0][0] + '" cy="' + c.pts[0][1] + '" r="3" fill="' + col + '"/>');
      svg.push('<text x="' + (c.pts[0][0] + 3) + '" y="' + (c.pts[0][1] - 3) + '" fill="' + col + '" font-size="10">' +
               c.k + (c.cancel ? 'c' : '') + '</text>');
    });
    html.push('<div style="padding:4px 8px">' + path.basename(f) + ' - ' + JSON.stringify(n) + '</div>' +
              '<svg width="' + W + '" height="' + Hh + '" style="border:1px solid #ccc;display:block">' + svg.join('') + '</svg>');
    next(i + 1);
  });
})(0);
