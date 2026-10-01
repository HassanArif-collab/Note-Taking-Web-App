/* ============================================================
 * neatcv.js - does Neaten make the user's writing neater, and never
 * break it? Measured on their own reference lines.
 *
 * The reference session has each phrase written twice NEATLY and twice
 * at NORMAL speed. The neat takes are the target: how this writer writes
 * when they take care. Each line is measured with its words known from
 * the phrase (the k-1 widest gaps are where its k words part - not
 * Neaten's own guess), and each word by the bottoms and tops of its
 * letters, the places the pen turned:
 *
 *   off      how far words sit off the line through them, in x-heights
 *   tilt     how far that line slopes, in degrees
 *   size     how much the words' x-heights differ (spread of their log)
 *   slant    how much the words' lean differs, word to word
 *   broken   a word whose strokes moved apart from each other, in px -
 *            neatening may move or turn a word, never pull it apart
 *
 * Then a test with a known answer: each NEAT take is put out of order on
 * purpose - its words nudged up and down, resized, leant and the line
 * tilted, by random amounts - and both it and the original are neatened.
 * Put right, they should come out alike, whatever was done to the copy:
 * "recovered" is how much closer they are after than the spoiling put
 * them, point by point (100% = alike; 0 = no better; below 0 = worse).
 *
 *   node scripts/neatcv.js            MN_HTML=other.html node scripts/neatcv.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');
var fs = require('fs'), path = require('path');
var DIR = path.join(__dirname, '..', 'traces');

function ink(d) {
  return d.ink.filter(function (s) { return s.pts.length; })
    .map(function (s) { return { pen: s.pen, w: s.w, ord: s.ord, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; });
}
function median(v) { var s = v.slice().sort(function (a, b) { return a - b; }), n = s.length; return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }
function mad(v) { var m = median(v); return median(v.map(function (x) { return Math.abs(x - m); })); }
/* the phrase's words, by its k-1 widest gaps */
function words(strokes, k) {
  var iv = strokes.map(function (s, i) {
    var x0 = 1e9, x1 = -1e9;
    s.pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); });
    return { i: i, x0: x0, x1: x1 };
  }).sort(function (a, b) { return a.x0 - b.x0; });
  var groups = [[iv[0]]], right = iv[0].x1, gaps = [], j;
  for (j = 1; j < iv.length; j++) {
    if (iv[j].x0 > right) { gaps.push({ at: groups.length, g: iv[j].x0 - right }); groups.push([]); }
    groups[groups.length - 1].push(iv[j]);
    right = Math.max(right, iv[j].x1);
  }
  var keep = gaps.slice().sort(function (a, b) { return b.g - a.g; }).slice(0, k - 1).map(function (g) { return g.at; });
  var out = [], cur = [];
  groups.forEach(function (g, gi) {
    if (gi && keep.indexOf(gi) >= 0) { out.push(cur); cur = []; }
    g.forEach(function (o) { cur.push(o.i); });
  });
  out.push(cur);
  return out;
}
/* the places a stroke turned: bottoms (it went down, then up) and tops */
function turns(p, hy) {
  var bots = [], tops = [], j, dir = 0, ext = p[0], lo = p[0], hi = p[0];
  for (j = 1; j < p.length; j++) {
    var q = p[j];
    if (dir === 0) {
      if (q[1] > lo[1]) lo = q;
      if (q[1] < hi[1]) hi = q;
      if (lo[1] - q[1] > hy) { bots.push(lo); dir = -1; ext = q; }
      else if (q[1] - hi[1] > hy) { tops.push(hi); dir = 1; ext = q; }
      continue;
    }
    if (dir > 0) {                       /* going down: the lowest so far, until it climbs back */
      if (q[1] > ext[1]) ext = q;
      else if (ext[1] - q[1] > hy) { bots.push(ext); dir = -1; ext = q; }
    } else {
      if (q[1] < ext[1]) ext = q;
      else if (q[1] - ext[1] > hy) { tops.push(ext); dir = 1; ext = q; }
    }
  }
  if (dir > 0) bots.push(ext); else if (dir < 0) tops.push(ext);
  return { bots: bots, tops: tops };
}
/* the densest band of values; a tie goes up the page when hi, down when not */
function band(v, tol, hi) {
  var best = null, bn = -1;
  v.forEach(function (a) {
    var near = v.filter(function (b) { return Math.abs(b - a) <= tol; }), m = near.reduce(function (t, b) { return t + b; }, 0) / near.length;
    if (near.length > bn || (near.length === bn && (hi ? m < best : m > best))) { bn = near.length; best = m; }
  });
  return best;
}
function measureWord(strokes, idx, hy) {
  var B = [], T = [], sx = 0, sy = 0, xs = 0, n = 0;
  idx.forEach(function (i) {
    var p = strokes[i].pts;
    if (p.length < 3) return;
    var t = turns(p, hy);
    B = B.concat(t.bots); T = T.concat(t.tops);
    for (var j = 1; j < p.length; j++) {
      var dx = p[j][0] - p[j - 1][0], dy = p[j][1] - p[j - 1][1];
      if (Math.abs(dy) >= Math.abs(dx) * 1.4) { sx += dy > 0 ? -dx : dx; sy += Math.abs(dy); }
      xs += p[j][0]; n++;
    }
  });
  if (B.length < 1 || T.length < 1 || !n) return null;
  var guess = median(B.map(function (b) { return b[1]; })) - median(T.map(function (t) { return t[1]; }));
  var tol = Math.max(2, Math.abs(guess) * 0.15);
  var base = band(B.map(function (b) { return b[1]; }), tol, true), mean = band(T.map(function (t) { return t[1]; }), tol, false);
  return { x: xs / n, bot: base, xh: Math.max(2, base - mean), slant: sy > 0 ? sx / sy : null };
}
function measureLine(strokes, ws) {
  var all = [];
  strokes.forEach(function (s) { s.pts.forEach(function (p) { all.push(p[1]); }); });
  var hy = Math.max(2, (Math.max.apply(null, all) - Math.min.apply(null, all)) * 0.06);
  var m = ws.map(function (w) { return measureWord(strokes, w, hy); }).filter(Boolean);
  if (m.length < 2) return null;
  var xh = median(m.map(function (o) { return o.xh; }));
  /* least squares through the words' bases: with three words a robust
     line passes through two of them and calls the line perfect */
  var n = m.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  m.forEach(function (o) { sx += o.x; sy += o.bot; sxx += o.x * o.x; sxy += o.x * o.bot; });
  var k = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), b = (sy - k * sx) / n;
  var off = m.reduce(function (t, o) { return t + Math.abs(o.bot - (k * o.x + b)); }, 0) / n / xh;
  var ss = m.map(function (o) { return o.slant; }).filter(function (s) { return s !== null; });
  return { off: off, tilt: Math.abs(Math.atan(k) * 180 / Math.PI), size: mad(m.map(function (o) { return Math.log(o.xh); })),
           slant: ss.length > 1 ? mad(ss) : 0, xh: xh };
}
/* the turn and shift that best lays points B over points A */
function rigidFit(B, A) {
  var bx = 0, by = 0, ax = 0, ay = 0, n = B.length, i, sc = 0, ss = 0;
  for (i = 0; i < n; i++) { bx += B[i][0]; by += B[i][1]; ax += A[i][0]; ay += A[i][1]; }
  bx /= n; by /= n; ax /= n; ay /= n;
  for (i = 0; i < n; i++) {
    var u = B[i][0] - bx, v = B[i][1] - by, p = A[i][0] - ax, q = A[i][1] - ay;
    sc += u * p + v * q; ss += u * q - v * p;
  }
  var th = Math.atan2(ss, sc), c = Math.cos(th), sn = Math.sin(th);
  return function (pt) { var u = pt[0] - bx, v = pt[1] - by; return [ax + u * c - v * sn, ay + u * sn + v * c]; };
}
function mid(s) { var x = 0, y = 0; s.pts.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / s.pts.length, y / s.pts.length]; }
/* how far apart a word's strokes were pulled: each stroke's middle, after,
   against where turning and moving the whole word as one piece would
   have put it */
function broken(before, after, ws) {
  var worst = 0;
  ws.forEach(function (w) {
    if (w.length < 2) return;
    var B = w.map(function (i) { return mid(before[i]); }), A = w.map(function (i) { return mid(after[i]); }), f = rigidFit(B, A);
    B.forEach(function (b, i) { var q = f(b); worst = Math.max(worst, Math.sqrt(Math.pow(q[0] - A[i][0], 2) + Math.pow(q[1] - A[i][1], 2))); });
  });
  return worst;
}
/* how far a line's points are from the original's, once the line as a
   whole is laid over it (a rule snap or a levelling is not damage) */
function lineErr(orig, got) {
  var B = [], A = [];
  orig.forEach(function (s, i) { s.pts.forEach(function (p, j) { B.push(p); A.push(got[i].pts[j]); }); });
  var f = rigidFit(A, B), t = 0;
  A.forEach(function (a, i) { var q = f(a); t += Math.sqrt(Math.pow(q[0] - B[i][0], 2) + Math.pow(q[1] - B[i][1], 2)); });
  return t / A.length;
}
/* a stroke drawn the way the app draws it: a curve through the midpoints of its samples */
function curve(p) {
  var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1), i, n = p.length;
  for (i = 1; i < n; i++) {
    var mx = i >= n - 1 ? p[i][0] : (p[i][0] + p[i + 1][0]) / 2, my = i >= n - 1 ? p[i][1] : (p[i][1] + p[i + 1][1]) / 2;
    d += 'Q' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
  }
  return d;
}
function rng(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
/* nudge, resize and lean each word, and tilt the line - on purpose */
function spoil(strokes, ws, xh, r) {
  var out = strokes.map(function (s) { return { pen: s.pen, w: s.w, ord: s.ord, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; });
  var lx0 = 1e9, lx1 = -1e9, ly = 0, ln = 0;
  ws.forEach(function (w) {
    var x0 = 1e9, x1 = -1e9, y1 = -1e9;
    w.forEach(function (i) { out[i].pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); });
    var dy = (r() - 0.5) * 0.6 * xh, k = Math.exp((r() - 0.5) * 0.3), sh = (r() - 0.5) * 0.2, cx = (x0 + x1) / 2, by = y1;
    var only = process.env.SPOIL;            /* SPOIL=dy|k|sh|rot: one kind of damage at a time */
    if (only && only !== 'dy') dy = 0;
    if (only && only !== 'k') k = 1;
    if (only && only !== 'sh') sh = 0;
    w.forEach(function (i) { out[i].pts.forEach(function (p) {
      var x = cx + (p[0] - cx) * k, y = by + (p[1] - by) * k;
      p[0] = x + sh * (by - y); p[1] = y + dy;
    }); });
  });
  out.forEach(function (s) { s.pts.forEach(function (p) { lx0 = Math.min(lx0, p[0]); lx1 = Math.max(lx1, p[0]); ly += p[1]; ln++; }); });
  var th = (process.env.SPOIL && process.env.SPOIL !== 'rot' ? 0 : 1) * (r() - 0.5) * 6 * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), cx2 = (lx0 + lx1) / 2, cy = ly / ln;
  out.forEach(function (s) { s.pts.forEach(function (p) { var u = p[0] - cx2, v = p[1] - cy; p[0] = cx2 + u * c - v * sn; p[1] = cy + u * sn + v * c; }); });
  return out;
}
function neaten(list) {
  var app = H.load({ quiet: true });
  app.flushFrames();
  app.loadInk(list);
  var before = app.strokes();
  app.win.__mnNeaten();
  app.flushFrames();
  var after = app.strokes();
  return { before: before, after: after.length === before.length ? after : before };
}

var takes = fs.readdirSync(DIR).filter(function (f) { return /^ref-(E|M)/.test(f); }).sort();
var rows = {}, worstBreak = 0, worstFile = '', rec = [], R = rng(7);
takes.forEach(function (f) {
  var d = JSON.parse(fs.readFileSync(path.join(DIR, f)));
  if (!d.ink || !d.ink.length) return;
  var item = d.ref.item, mode = d.ref.mode, k = d.ref.text.replace(/\(.*\)/, '').trim().split(/\s+/).length;
  var run = neaten(ink(d)), ws = words(run.before, k);
  if (process.env.TAKE && f.indexOf(process.env.TAKE) === 4) rec.take = [run.before, run.after, f.slice(4, 18)];
  var mb = measureLine(run.before, ws), ma = measureLine(run.after, ws), br = broken(run.before, run.after, ws);
  if (!mb || !ma) return;
  if (br > worstBreak) { worstBreak = br; worstFile = f.slice(4, 18); }
  var r = rows[item] = rows[item] || { neat: [], neatA: [], norm: [], normA: [] };
  if (mode === 'neat') { r.neat.push(mb); r.neatA.push(ma); } else { r.norm.push(mb); r.normA.push(ma); }
  if (mode === 'neat') {
    for (var t = 0; t < 3; t++) {
      var bad = spoil(run.before, ws, mb.xh, R), fix = neaten(bad);
      /* put right, the spoiled copy and the original should come out alike */
      var e0 = lineErr(run.before, bad), e1 = lineErr(run.after, fix.after);
      rec.push({ f: f.slice(4, 18), e0: e0, e1: e1, br: broken(fix.before, fix.after, ws), draw: [run.before, bad, fix.after] });
    }
  }
});
function avg(list, key) { return list.length ? list.reduce(function (t, o) { return t + o[key]; }, 0) / list.length : 0; }
function cell(r, key, dp) {
  return (avg(r.neat, key).toFixed(dp) + ' | ' + avg(r.norm, key).toFixed(dp) + '>' + avg(r.normA, key).toFixed(dp) + '  ');
}
console.log('              (each: neat | normal > normal neatened)');
console.log('item   off (x-heights)        tilt (deg)              size spread            slant spread');
var all = { neat: [], norm: [], normA: [], neatA: [] };
Object.keys(rows).sort().forEach(function (item) {
  var r = rows[item];
  ['neat', 'norm', 'normA', 'neatA'].forEach(function (k) { all[k] = all[k].concat(r[k]); });
  console.log(('    ' + item).slice(-4) + '   ' + cell(r, 'off', 3) + cell(r, 'tilt', 2) + '    ' + cell(r, 'size', 3) + cell(r, 'slant', 3));
});
console.log(' all   ' + cell(all, 'off', 3) + cell(all, 'tilt', 2) + '    ' + cell(all, 'size', 3) + cell(all, 'slant', 3));
console.log('neat takes after Neaten: off ' + avg(all.neat, 'off').toFixed(3) + '>' + avg(all.neatA, 'off').toFixed(3) +
            '  tilt ' + avg(all.neat, 'tilt').toFixed(2) + '>' + avg(all.neatA, 'tilt').toFixed(2) +
            '  size ' + avg(all.neat, 'size').toFixed(3) + '>' + avg(all.neatA, 'size').toFixed(3) +
            '  slant ' + avg(all.neat, 'slant').toFixed(3) + '>' + avg(all.neatA, 'slant').toFixed(3));
console.log('worst a word was pulled apart: ' + worstBreak.toFixed(1) + 'px  (' + worstFile + ')');
var e0 = rec.reduce(function (t, o) { return t + o.e0; }, 0), e1 = rec.reduce(function (t, o) { return t + o.e1; }, 0);
var rb = rec.reduce(function (t, o) { return Math.max(t, o.br); }, 0);
console.log('spoiled on purpose, ' + rec.length + ' lines: ' + (e0 / rec.length).toFixed(2) + 'px off the original -> ' + (e1 / rec.length).toFixed(2) +
            'px after Neaten: recovered ' + Math.round(100 * (1 - e1 / e0)) + '%  (worst pulled apart ' + rb.toFixed(1) + 'px)');
if (process.argv[2] === 'v') rec.forEach(function (o) { console.log('   ' + o.f + ' ' + o.e0.toFixed(2) + ' -> ' + o.e1.toFixed(2) + '  apart ' + o.br.toFixed(1)); });
/* DRAW=<n> node scripts/neatcv.js: the n-th spoiled line, as written, spoiled and put back */
if (process.env.DRAW || process.env.TAKE) {
  var o = process.env.TAKE ? { draw: rec.take, f: rec.take[2] } : rec[+process.env.DRAW], html = '<html><body style="margin:0;background:#fff;font:14px sans-serif">';
  (process.env.TAKE ? ['as written', 'neatened'] : ['as written', 'spoiled', 'neatened']).forEach(function (lab, k) {
    var st = o.draw[k], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    o.draw[0].forEach(function (s) { s.pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); });
    html += '<div>' + lab + ' (' + o.f + ')</div><svg width="1000" height="200" viewBox="' + (x0 - 20) + ' ' + (y0 - 40) + ' ' + (x1 - x0 + 40) + ' ' + (y1 - y0 + 80) + '">';
    html += '<line x1="' + (x0 - 20) + '" x2="' + (x1 + 20) + '" y1="' + y1 + '" y2="' + y1 + '" stroke="#cde"/>';
    st.forEach(function (s) {
      html += s.pts.length === 1 ? '<circle cx="' + s.pts[0][0] + '" cy="' + s.pts[0][1] + '" r="2"/>' :
        '<path fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="' + curve(s.pts) + '"/>';
    });
    html += '</svg>';
  });
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'draw.html'), html + '</body></html>');
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'spoiled.json'), JSON.stringify(o.draw[1]));
}
