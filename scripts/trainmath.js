/* ============================================================
 * trainmath.js - teach maths answers to read digits, from many hands.
 *
 * Trains the small network in index.html (MATH_NET) on the UCI
 * "Pen-Based Recognition of Handwritten Digits" set: 7,494 digits written
 * on a tablet by 30 people, tested on 3,498 more by 14 people it never
 * sees in training - and on the user's own maths session, which it never
 * sees either. The data is downloaded into data/pendigits on first run
 * (data/ is never committed).
 *
 * Every epoch shows each digit slightly turned, slanted and stretched, so
 * the network learns the digit and not the angle one person writes at.
 *
 *   node scripts/trainmath.js          train, score, and write the weights in
 *   node scripts/trainmath.js --dry    train and score only
 * ============================================================ */
'use strict';
var fs = require('fs'), path = require('path'), https = require('https'), zlib = require('zlib');
var execSync = require('child_process').execSync;
var H = require('./harness.js');
var ROOT = path.join(__dirname, '..');
var DATA = path.join(ROOT, 'data', 'pendigits');
var URL = 'https://archive.ics.uci.edu/ml/machine-learning-databases/pendigits/';

function fetch(name) {
  var file = path.join(DATA, name);
  if (fs.existsSync(file)) return Promise.resolve(file);
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  return new Promise(function (ok, bad) {
    https.get(URL + name, function (res) {
      var parts = [];
      res.on('data', function (c) { parts.push(c); });
      res.on('end', function () { fs.writeFileSync(file, Buffer.concat(parts)); ok(file); });
    }).on('error', bad);
  });
}
/* the original pen paths, UNIPEN format, unpacked with gzip (it reads .Z) */
function unipen(zfile) {
  var plain = zfile.replace(/\.Z$/, '');
  if (!fs.existsSync(plain)) fs.writeFileSync(plain, execSync('gzip -dc "' + zfile + '"'));
  var out = [], cur = null, stroke = null, m;
  fs.readFileSync(plain, 'utf8').split(/\r?\n/).forEach(function (l) {
    if ((m = /^\.SEGMENT DIGIT\s+\S+\s+\S+\s+"(\d)"/.exec(l))) { cur = { c: m[1], s: [] }; out.push(cur); stroke = null; return; }
    if (/^\.PEN_DOWN/.test(l)) { if (cur) { stroke = []; cur.s.push(stroke); } return; }
    if (/^\.PEN_UP/.test(l)) { stroke = null; return; }
    if (stroke && (m = /^\s*(-?\d+)\s+(-?\d+)/.exec(l))) stroke.push([+m[1], -m[2]]);   /* the tablet's y runs up */
  });
  return out.filter(function (d) { d.s = d.s.filter(function (s) { return s.length; }); return d.s.length; });
}

var CLS = '0123456789+-x()';

/* SIGNS, DRAWN BY HAND - BY A PROGRAM. There is no public set of
   handwritten pluses and brackets as handy as the digits, and the signs
   are simple shapes, so they are generated: every one a little different
   in length, slant, bend, a hook at an end, which stroke comes first and
   which way it is drawn. The network learns where a plus ends and a 7
   with a bar through it begins from these and the real digits together. */
function bentLine(x0, y0, x1, y1, bend, hook, rnd) {
  var pts = [], n = 10 + Math.floor(rnd() * 8), i, t, nx = -(y1 - y0), ny = x1 - x0;
  for (i = 0; i <= n; i++) {
    t = i / n;
    var b = bend * 4 * t * (1 - t);
    pts.push([x0 + (x1 - x0) * t + nx * b, y0 + (y1 - y0) * t + ny * b]);
  }
  if (hook) {
    /* a flick at one end, the way a pen comes down or lifts off */
    var end = rnd() < 0.5, a = end ? pts[pts.length - 1] : pts[0], L = Math.sqrt(nx * nx + ny * ny) * (0.08 + rnd() * 0.12);
    var th = Math.atan2(ny, nx) + (rnd() - 0.5) * 1.5, hp = [a[0] + Math.cos(th) * L, a[1] + Math.sin(th) * L];
    if (end) pts.push(hp); else pts.unshift(hp);
  }
  if (rnd() < 0.5) pts.reverse();
  return pts;
}
function makeSign(c, rnd) {
  var s = [], a, b, th, k;
  function R(lo, hi) { return lo + rnd() * (hi - lo); }
  if (c === '+') {
    a = R(0.6, 1.4); b = R(0.6, 1.4); th = R(-0.25, 0.25);
    var ox = R(-0.25, 0.25) * a, oy = R(-0.25, 0.25) * b, tv = Math.PI / 2 + R(-0.35, 0.35);
    s.push(bentLine(-a / 2 * Math.cos(th), -a / 2 * Math.sin(th), a / 2 * Math.cos(th), a / 2 * Math.sin(th), R(-0.12, 0.12), rnd() < 0.3, rnd));
    s.push(bentLine(ox - b / 2 * Math.cos(tv), oy - b / 2 * Math.sin(tv), ox + b / 2 * Math.cos(tv), oy + b / 2 * Math.sin(tv), R(-0.12, 0.12), rnd() < 0.3, rnd));
  } else if (c === '-') {
    a = R(0.6, 1.6); th = R(-0.2, 0.2);
    s.push(bentLine(-a / 2 * Math.cos(th), -a / 2 * Math.sin(th), a / 2 * Math.cos(th), a / 2 * Math.sin(th), R(-0.1, 0.1), rnd() < 0.3, rnd));
  } else if (c === 'x') {
    a = R(0.7, 1.3); b = R(0.7, 1.3);
    var t1 = R(0.5, 1.1), t2 = Math.PI - R(0.5, 1.1), o1 = R(-0.2, 0.2), o2 = R(-0.2, 0.2);
    s.push(bentLine(o1 - a / 2 * Math.cos(t1), -a / 2 * Math.sin(t1), o1 + a / 2 * Math.cos(t1), a / 2 * Math.sin(t1), R(-0.3, 0.3), rnd() < 0.3, rnd));
    s.push(bentLine(o2 - b / 2 * Math.cos(t2), -b / 2 * Math.sin(t2), o2 + b / 2 * Math.cos(t2), b / 2 * Math.sin(t2), R(-0.3, 0.3), rnd() < 0.3, rnd));
  } else {
    /* a bracket: an arc, tall and thin, sometimes with a tail */
    var bow = R(0.12, 0.4) * (c === '(' ? -1 : 1), hh = 1, n = 12 + Math.floor(rnd() * 8), p = [], sl = R(-0.15, 0.15);
    for (k = 0; k <= n; k++) {
      var t = k / n, y = -hh / 2 + hh * t;
      p.push([bow * Math.sin(Math.PI * t) + sl * y + R(-0.01, 0.01), y]);
    }
    if (rnd() < 0.35) {
      var e = p[p.length - 1], tl = R(0.08, 0.25);
      p.push([e[0] - Math.sign(bow) * tl, e[1] + R(-0.02, 0.06)]);
    }
    if (rnd() < 0.15) p.reverse();
    s.push(p);
  }
  if (rnd() < 0.5) s.reverse();
  /* into the digit set's coordinates: a box about 100 across */
  return s.map(function (st) { return st.map(function (q) { return [q[0] * 100, q[1] * 100]; }); });
}
function rng(seed) { var r = seed; return function () { r = (r * 16807) % 2147483647; return r / 2147483647; }; }
/* a digit turned, slanted, stretched and shaken a little */
function warp(strokes, rnd) {
  var th = (rnd() - 0.5) * 0.4, sh = (rnd() - 0.5) * 0.5, sx = 1 + (rnd() - 0.5) * 0.3, c = Math.cos(th), s = Math.sin(th);
  var j = 0.012 * (rnd() + 0.2);
  var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  strokes.forEach(function (st) { st.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); });
  var sz = Math.max(x1 - x0, y1 - y0, 1);
  return strokes.map(function (st) {
    return st.map(function (p) {
      var x = (p[0] - x0) / sz, y = (p[1] - y0) / sz;
      x = x * sx + y * sh;
      var X = x * c - y * s, Y = x * s + y * c;
      return [X + (rnd() - 0.5) * j, Y + (rnd() - 0.5) * j];
    });
  });
}

function Net(nin, nh, nout, rnd) {
  this.nin = nin; this.nh = nh; this.nout = nout;
  var a = Math.sqrt(2 / nin), b = Math.sqrt(2 / nh), i;
  this.W1 = new Float64Array(nin * nh); this.b1 = new Float64Array(nh);
  this.W2 = new Float64Array(nh * nout); this.b2 = new Float64Array(nout);
  for (i = 0; i < this.W1.length; i++) this.W1[i] = (rnd() * 2 - 1) * a;
  for (i = 0; i < this.W2.length; i++) this.W2[i] = (rnd() * 2 - 1) * b;
  this.v = [new Float64Array(this.W1.length), new Float64Array(nh), new Float64Array(this.W2.length), new Float64Array(nout)];
}
Net.prototype.forward = function (f) {
  var h = new Float64Array(this.nh), o = new Float64Array(this.nout), i, j, s, mx = -1e9, sum = 0;
  for (j = 0; j < this.nh; j++) { s = this.b1[j]; for (i = 0; i < this.nin; i++) s += this.W1[j * this.nin + i] * f[i]; h[j] = s > 0 ? s : 0; }
  for (j = 0; j < this.nout; j++) { s = this.b2[j]; for (i = 0; i < this.nh; i++) s += this.W2[j * this.nh + i] * h[i]; o[j] = s; if (s > mx) mx = s; }
  for (j = 0; j < this.nout; j++) { o[j] = Math.exp(o[j] - mx); sum += o[j]; }
  for (j = 0; j < this.nout; j++) o[j] /= sum;
  return { h: h, o: o };
};
Net.prototype.train = function (f, y, lr, mom, l2) {
  var r = this.forward(f), d2 = new Float64Array(this.nout), d1 = new Float64Array(this.nh), i, j, g, k;
  for (j = 0; j < this.nout; j++) d2[j] = r.o[j] - (j === y ? 1 : 0);
  for (i = 0; i < this.nh; i++) {
    if (r.h[i] <= 0) continue;
    g = 0;
    for (j = 0; j < this.nout; j++) g += d2[j] * this.W2[j * this.nh + i];
    d1[i] = g;
  }
  for (j = 0; j < this.nout; j++) {
    for (i = 0; i < this.nh; i++) {
      k = j * this.nh + i;
      this.v[2][k] = mom * this.v[2][k] - lr * (d2[j] * r.h[i] + l2 * this.W2[k]);
      this.W2[k] += this.v[2][k];
    }
    this.v[3][j] = mom * this.v[3][j] - lr * d2[j];
    this.b2[j] += this.v[3][j];
  }
  for (j = 0; j < this.nh; j++) {
    if (!d1[j]) continue;
    for (i = 0; i < this.nin; i++) {
      k = j * this.nin + i;
      this.v[0][k] = mom * this.v[0][k] - lr * (d1[j] * f[i] + l2 * this.W1[k]);
      this.W1[k] += this.v[0][k];
    }
    this.v[1][j] = mom * this.v[1][j] - lr * d1[j];
    this.b1[j] += this.v[1][j];
  }
  return -Math.log(Math.max(r.o[y], 1e-12));
};
/* signed bytes, one scale per layer, in base64 - about 13 KB in the page */
Net.prototype.pack = function () {
  var layers = [this.W1, this.b1, this.W2, this.b2], s = [], bytes = [], i, L, mx;
  for (L = 0; L < 4; L++) {
    mx = 1e-9;
    for (i = 0; i < layers[L].length; i++) mx = Math.max(mx, Math.abs(layers[L][i]));
    s.push(+(mx / 127).toPrecision(6));
    for (i = 0; i < layers[L].length; i++) bytes.push((Math.max(-127, Math.min(127, Math.round(layers[L][i] / s[L]))) + 256) % 256);
  }
  return { nin: this.nin, nh: this.nh, nout: this.nout, cls: CLS, s: s, w: Buffer.from(bytes).toString('base64') };
};

(async function () {
  var tra = unipen(await fetch('pendigits-orig.tra.Z')), tes = unipen(await fetch('pendigits-orig.tes.Z'));
  var app = H.load({ quiet: true });
  app.flushFrames();
  var M = app.win.__mnMath;
  function feat(strokes) { return M.feat(strokes); }
  var rnd = rng(12345);
  var testF = tes.map(function (d) { return { f: feat(d.s), y: CLS.indexOf(d.c) }; });
  /* the user's own digits: never trained on, only scored */
  var takes = require('./mathdata.js')(M), user = [];
  takes.forEach(function (t) { t.lab.forEach(function (l) {
    if (CLS.indexOf(l.c) >= 0) user.push({ f: feat(l.strokes.map(function (st) { return st.pts; })), y: CLS.indexOf(l.c), c: l.c });
  }); });
  function score(net, set) {
    var ok = 0;
    set.forEach(function (d) { var o = net.forward(d.f).o, b = 0; for (var j = 1; j < o.length; j++) if (o[j] > o[b]) b = j; if (b === d.y) ok++; });
    return ok;
  }
  var SIGNS = '+-x()', PER_SIGN = 750;
  var nin = feat(tra[0].s).length, net = new Net(nin, 64, CLS.length, rnd), EPOCHS = 30, e, i, loss;
  console.log('training on ' + tra.length + ' digits from 30 writers and ' + PER_SIGN * SIGNS.length +
              ' drawn signs a round, ' + nin + ' features each');
  for (e = 0; e < EPOCHS; e++) {
    /* fresh signs every round, so no one drawing is learned by heart */
    var set = tra.slice(), si, k2;
    for (si = 0; si < SIGNS.length; si++) for (k2 = 0; k2 < PER_SIGN; k2++) set.push({ c: SIGNS[si], s: makeSign(SIGNS[si], rnd) });
    var order = set.map(function (d, k) { return k; });
    for (i = order.length - 1; i > 0; i--) { var r = Math.floor(rnd() * (i + 1)), t = order[i]; order[i] = order[r]; order[r] = t; }
    var lr = 0.02 * (1 - e / EPOCHS) + 0.002;
    loss = 0;
    for (i = 0; i < order.length; i++) {
      var d = set[order[i]];
      loss += net.train(feat(warp(d.s, rnd)), CLS.indexOf(d.c), lr, 0.9, 1e-5);
    }
    if (e % 5 === 4 || e === EPOCHS - 1) {
      console.log('epoch ' + (e + 1) + '  loss ' + (loss / order.length).toFixed(3) +
                  '   14 unseen writers ' + score(net, testF) + '/' + testF.length +
                  '   the user ' + score(net, user) + '/' + user.length);
    }
  }
  var packed = net.pack();
  /* the packed (byte) weights, scored the way the app will run them */
  M.setNet(packed);
  var ok = 0, conf = {};
  user.forEach(function (d) {
    var o = M.net(d.f), b = 0;
    for (var j = 1; j < o.length; j++) if (o[j] > o[b]) b = j;
    if (b === d.y) ok++; else conf[d.c + '->' + CLS[b]] = (conf[d.c + '->' + CLS[b]] || 0) + 1;
  });
  console.log('as packed for the app: the user ' + ok + '/' + user.length + ', ' + packed.w.length + ' chars');
  console.log('the user\'s misreads: ' + JSON.stringify(conf));
  if (process.argv.indexOf('--dry') >= 0) return;
  var file = path.join(ROOT, 'index.html'), html = fs.readFileSync(file, 'utf8');
  var a = html.indexOf('/*MATH_NET_BEGIN*/'), b = html.indexOf('/*MATH_NET_END*/');
  html = html.slice(0, a) + '/*MATH_NET_BEGIN*/var MATH_NET = ' + JSON.stringify(packed) + ';' + html.slice(b);
  fs.writeFileSync(file, html);
  console.log('written into index.html');
})().catch(function (e) { console.error(e); process.exit(1); });
