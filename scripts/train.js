/* ============================================================
 * train.js - fit the pen/palm scorer to the recordings in traces/.
 *
 *   node scripts/train.js              fit, report, and write the
 *                                      weights into index.html
 *   node scripts/train.js --dry        fit and report, change nothing
 *
 * Every threshold in this engine was chosen by hand, and a palm and a
 * pen overlap on every measurement taken alone - duration, speed,
 * straightness, travel, all of them. They do not overlap on all
 * eighteen at once. This fits the combination.
 *
 * The labels come from the drills: a drill said, before the hand
 * touched the glass, whose contacts these would be. That is the only
 * reason this is possible at all.
 *
 * Features are computed by index.html itself, through a live replay, so
 * the numbers fitted here are produced by the exact code that runs on
 * the device and cannot drift from it.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var core = require('./replay-core.js');

var ROOT = path.join(__dirname, '..');
var TRACES = path.join(ROOT, 'traces');
var DRY = process.argv.indexOf('--dry') >= 0;

/* --mask a,b,c  forces those features' weights to zero.
   A feature can be genuinely predictive of the recordings and still be
   the wrong thing to learn: the pen drills were all written mid-page, so
   "low on the page" perfectly predicts palm HERE and means nothing on a
   real page where people write in the corners too. Masking is how that
   gets tested rather than argued about. */
/* 13 and 14 are "how far down the page" and "how far to the writing-hand
   side". They are masked by DEFAULT, and the reason is worth keeping.
   They score well, because every pen drill so far was written across the
   middle of the page - so "low and to the right" perfectly predicts palm
   in this corpus and predicts nothing at all on a real page, where people
   write in the corners too. Unmasked, the fit refused a normal stroke in
   the bottom-right outright; scripts/test_palm.js catches it.
   Position still reaches the model through the edge-band and
   below-the-pen rules, which are gated on more than position alone.
   --mask "" turns the masking off. */
var MASK = { 13: 1, 14: 1 };
var mi = process.argv.indexOf('--mask');
if (mi > 0 && process.argv[mi + 1] !== undefined) {
  MASK = {};
  process.argv[mi + 1].split(',').forEach(function (v) {
    if (v !== '') MASK[+v] = 1;
  });
}

/* Only drills where every contact has one known owner. pen-palm-10 and
   palm-then-pen have the hand AND the pen on the glass, so they cannot
   label anything - they are held back and used to check the result. */
var LABEL = {
  'palm-rest': 0, 'palm-slide': 0, 'palm-bounce': 0,
  'zoom': 0, 'scroll': 0,
  'pen-only': 1, 'pen-small': 1, 'pen-slow': 1, 'aim': 1
};
var HELDBACK = { 'pen-palm-10': 1, 'palm-then-pen': 1, 'live': 1 };

/* The drill that fixes the flaw which made the first fitted model
   worthless. Every other labelled drill has EITHER the hand on the glass
   OR the pen, never both, so "how many contacts are down" separated the
   classes perfectly and the fit learned that instead of learning anything
   about a contact. On a real page the hand is always down, so the pen was
   refused - reported from the iPad as "the pen is not working with the
   palm on it".
   aim-palm has both at once and still labels each contact, because the
   crosses are at known positions: a small contact that lands on one is
   the stylus, and everything else on the glass at that moment is the
   hand. Same crowding for both classes, so there is nothing to leak. */
var PER_CONTACT = { 'aim-palm': 1 };
var HIT_PX = 55;         /* how close to a cross counts as aimed at it */
var HIT_PATH = 16;       /* ...and a tap, not a stroke passing through */

function perContactLabels(trace) {
  if (!trace.targets || !trace.targets.length) return null;
  var c = {}, i, r;
  for (i = 0; i < trace.samples.length; i++) {
    r = trace.samples[i];
    if (r[0] === 'v' || r[0] === 'g' || r[0] === 'z') continue;
    var id = r[1];
    if (r[0] === 0) c[id] = { x0: r[2], y0: r[3], path: 0, lx: r[2], ly: r[3] };
    else if (c[id]) {
      c[id].path += Math.sqrt(Math.pow(r[2] - c[id].lx, 2) + Math.pow(r[3] - c[id].ly, 2));
      c[id].lx = r[2]; c[id].ly = r[3];
    }
  }
  var out = {}, k, t, best;
  for (k in c) {
    if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
    best = 1e9;
    for (t = 0; t < trace.targets.length; t++) {
      var d = Math.sqrt(Math.pow(c[k].x0 - trace.targets[t][0], 2) +
                        Math.pow(c[k].y0 - trace.targets[t][1], 2));
      if (d < best) best = d;
    }
    out[k] = (best <= HIT_PX && c[k].path <= HIT_PATH) ? 1 : 0;
  }
  return out;
}

var MIN_AGE = 50;        /* below this a contact has no history worth reading */
var MAX_PER_CONTACT = 8; /* so a long contact cannot outvote a short one */
var SPACING = 45;        /* ms between snapshots of the same contact */

function files() {
  return fs.readdirSync(TRACES).filter(function (f) { return /\.json$/.test(f); }).sort();
}

/* ---------------- gather ---------------- */
var rows = [];           /* {x: [...], y: 0|1, file, id} */
var heldRows = [];
var NF = 0;
var NAMES = [];

function gather(file, next) {
  var trace;
  try { trace = JSON.parse(fs.readFileSync(path.join(TRACES, file), 'utf8')); }
  catch (e) { next(); return; }
  if (!trace.samples || !trace.samples.length) { next(); return; }
  var drill = trace.drill || trace.label || '';
  var label = LABEL[drill];
  var held = !!HELDBACK[drill];
  var perC = PER_CONTACT[drill] ? perContactLabels(trace) : null;
  if (perC) held = false;
  if (label === undefined && !perC && !held) { next(); return; }

  var last = {}, taken = {};

  core.replay(trace, {
    settleMs: 30,
    onSample: function (app, t) {
      var fe = app.win.__mnFeat();
      if (!NF) { NAMES = app.win.__mnFeatNames || []; }
      var k;
      for (k in fe) {
        if (!Object.prototype.hasOwnProperty.call(fe, k)) continue;
        var e = fe[k];
        if (e.age < MIN_AGE) continue;
        if (last[k] != null && t - last[k] < SPACING) continue;
        if ((taken[k] || 0) >= MAX_PER_CONTACT) continue;
        last[k] = t;
        taken[k] = (taken[k] || 0) + 1;
        if (!NF) NF = e.f.length;
        var y = perC ? perC[k] : label;
        /* a held-back recording has no label by design - it is kept to be
           looked at, not learned from - so it must not be dropped here */
        if (!held && y === undefined) continue;
        (held ? heldRows : rows).push({ x: e.f, y: y, file: file, id: k, drill: drill });
      }
    }
  }, function () { next(); });
}

/* ---------------- logistic regression ---------------- */
function fit(data, nf, opts) {
  opts = opts || {};
  var w = [], b = 0, i, j, it;
  for (i = 0; i < nf; i++) w[i] = 0;

  /* a resting hand produces far more contacts than a pen does, and left
     alone the fit would simply learn to say "palm" and be right most of
     the time. Weight each class by its own scarcity. */
  var np = 0, nn = 0;
  for (i = 0; i < data.length; i++) { if (data[i].y) np++; else nn++; }
  var wp = np ? (np + nn) / (2 * np) : 1;
  var wn = nn ? (np + nn) / (2 * nn) : 1;

  var lr = opts.lr || 0.6, l2 = opts.l2 || 0.004, iters = opts.iters || 4000;
  for (it = 0; it < iters; it++) {
    var gw = [], gb = 0;
    for (j = 0; j < nf; j++) gw[j] = 0;
    for (i = 0; i < data.length; i++) {
      var r = data[i], z = b;
      for (j = 0; j < nf; j++) z += w[j] * r.x[j];
      var p = 1 / (1 + Math.exp(-z));
      var cw = r.y ? wp : wn;
      var g = cw * (p - r.y);
      for (j = 0; j < nf; j++) gw[j] += g * r.x[j];
      gb += g;
    }
    var n = Math.max(data.length, 1);
    for (j = 0; j < nf; j++) {
      if (MASK[j]) { w[j] = 0; continue; }
      w[j] -= lr * (gw[j] / n + l2 * w[j]);
    }
    b -= lr * (gb / n);
  }
  return { w: w, b: b };
}

function predict(m, x) {
  var z = m.b, j;
  for (j = 0; j < x.length; j++) z += m.w[j] * x[j];
  return 1 / (1 + Math.exp(-z));
}

function evaluate(m, data, thr) {
  var tp = 0, fp = 0, tn = 0, fn = 0, i;
  for (i = 0; i < data.length; i++) {
    var p = predict(m, data[i].x) >= thr ? 1 : 0;
    if (data[i].y === 1 && p === 1) tp++;
    else if (data[i].y === 1 && p === 0) fn++;
    else if (data[i].y === 0 && p === 1) fp++;
    else tn++;
  }
  return { tp: tp, fp: fp, tn: tn, fn: fn,
           penKept: tp + fn ? tp / (tp + fn) : 0,
           palmStopped: tn + fp ? tn / (tn + fp) : 0 };
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function lp(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

/* ---------------- run ---------------- */
var list = files();
(function loop(i) {
  if (i >= list.length) { done(); return; }
  gather(list[i], function () { loop(i + 1); });
})(0);

function done() {
  if (!rows.length) {
    console.log('no labelled recordings in traces/ - run the drills first');
    process.exit(2);
  }

  var pen = 0, palm = 0, i;
  for (i = 0; i < rows.length; i++) { if (rows[i].y) pen++; else palm++; }
  console.log('');
  console.log('  training on ' + rows.length + ' snapshots  (' + pen + ' pen, ' +
              palm + ' palm)  from ' + NF + ' features');
  console.log('  held back: ' + heldRows.length + ' snapshots from the mixed drills');
  var apDrills = {}, ap = 0;
  for (i = 0; i < rows.length; i++) if (rows[i].drill === 'aim-palm') { ap++; apDrills[rows[i].file] = 1; }
  if (!ap) {
    console.log('');
    console.log('  NO aim-palm recordings. Every drill here has either the hand');
    console.log('  on the glass or the pen, never both, so "how many contacts are');
    console.log('  down" separates the classes perfectly and the fit will learn');
    console.log('  that instead of learning anything about a contact. Whatever');
    console.log('  score it reports will not survive contact with a real page.');
  } else {
    console.log('  ' + ap + ' snapshots labelled per-contact from aim-palm ' +
                '(hand and pen on the glass together)');
  }

  /* leave-one-recording-out, so the reported score is never measured on
     a recording the weights have seen */
  var byFile = {};
  for (i = 0; i < rows.length; i++) (byFile[rows[i].file] = byFile[rows[i].file] || []).push(rows[i]);
  var names = Object.keys(byFile);
  var cvKept = 0, cvStopped = 0, penFolds = 0, palmFolds = 0;
  for (i = 0; i < names.length; i++) {
    var test = byFile[names[i]], train = [];
    var k;
    for (k = 0; k < names.length; k++) if (k !== i) train = train.concat(byFile[names[k]]);
    var hasPos = false, hasNeg = false, q;
    for (q = 0; q < train.length; q++) { if (train[q].y) hasPos = true; else hasNeg = true; }
    if (!hasPos || !hasNeg) continue;
    var mm = fit(train, NF, { iters: 1200 });
    var ev = evaluate(mm, test, 0.5);
    if (test[0].y === 1) { cvKept += ev.penKept; penFolds++; }
    else { cvStopped += ev.palmStopped; palmFolds++; }
  }

  var m = fit(rows, NF, { iters: 6000 });

  console.log('');
  console.log('  what it learned  (positive = looks like the pen)');
  console.log('');
  var order = [];
  for (i = 0; i < NF; i++) order.push({ i: i, w: m.w[i] });
  order.sort(function (a, b) { return Math.abs(b.w) - Math.abs(a.w); });
  for (i = 0; i < order.length; i++) {
    var o = order[i];
    var bar = '';
    var n2 = Math.min(Math.round(Math.abs(o.w) * 3), 28);
    for (var z = 0; z < n2; z++) bar += '#';
    console.log('    ' + pad(NAMES[o.i] || ('f' + o.i), 20) + lp(o.w.toFixed(2), 7) + '  ' +
                (o.w >= 0 ? '  ' + bar : bar.split('').reverse().join('') + '  '));
  }
  console.log('    ' + pad('(bias)', 20) + lp(m.b.toFixed(2), 7));

  console.log('');
  console.log('  threshold   pen kept    palm stopped');
  console.log('  ---------   --------    ------------');
  [0.3, 0.4, 0.5, 0.6, 0.7].forEach(function (thr) {
    var ev = evaluate(m, rows, thr);
    console.log('  ' + pad(thr, 12) + pad(Math.round(ev.penKept * 100) + '%', 12) +
                Math.round(ev.palmStopped * 100) + '%');
  });

  if (penFolds || palmFolds) {
    console.log('');
    console.log('  leave-one-recording-out (never scored on a recording it trained on):');
    console.log('    pen kept     ' + Math.round(100 * cvKept / Math.max(1, penFolds)) +
                '%   over ' + penFolds + ' pen recordings');
    console.log('    palm stopped ' + Math.round(100 * cvStopped / Math.max(1, palmFolds)) +
                '%   over ' + palmFolds + ' palm recordings');
  }

  /* The drills that label cleanly also separate cleanly on "how many
     contacts are on the glass" - one for the pen drills, five or six for
     the palm ones. A model can score well by learning WHICH DRILL it is
     in, which is worthless on a real page where the hand and the pen are
     both down. The mixed recordings are the only honest test of that, and
     they cannot label individual contacts - so the real check is
     score.js on pen-palm-10 after this is wired in, not the numbers
     above. */
  var crowdIdx = -1, z2;
  for (z2 = 0; z2 < NAMES.length; z2++) if (NAMES[z2] === 'crowding') crowdIdx = z2;
  if (crowdIdx >= 0) {
    var penCrowd = 0, penN = 0, palmCrowd = 0, palmN = 0;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].y) { penCrowd += rows[i].x[crowdIdx]; penN++; }
      else { palmCrowd += rows[i].x[crowdIdx]; palmN++; }
    }
    console.log('');
    console.log('  leakage check - mean "crowding" by class: pen ' +
                (penCrowd / Math.max(penN, 1)).toFixed(2) + '  palm ' +
                (palmCrowd / Math.max(palmN, 1)).toFixed(2));
  }

  if (DRY) { console.log('\n  --dry: index.html not touched\n'); return; }

  var src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var nl = src.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  var wline = 'var PEN_W = [' + m.w.map(function (v) { return v.toFixed(4); }).join(', ') + '];';
  src = src.replace(/var PEN_B = [^;]*;/, 'var PEN_B = ' + m.b.toFixed(4) + ';')
           .replace(/var PEN_W = \[[^\]]*\];/, wline)
           .replace(/var PEN_TRAINED = [^;]*;/, 'var PEN_TRAINED = true;');
  fs.writeFileSync(path.join(ROOT, 'index.html'), src);
  console.log('');
  console.log('  weights written into index.html');
  console.log('');
}
