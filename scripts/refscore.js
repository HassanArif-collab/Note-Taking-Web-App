/* ============================================================
 * refscore.js - does the app actually improve handwriting?
 *
 *   node scripts/refscore.js
 *   node scripts/refscore.js --html old.html      against another build
 *
 * Every other scoreboard in here works because the drill knew its answer
 * before it started - draw ten lines, want ten. Handwriting quality has
 * no such answer, so until now every judgement about it came from the
 * user describing what they saw.
 *
 * The reference corpus supplies the missing answer. The same words are
 * written twice: once slowly and as neatly as possible (the TARGET) and
 * once at normal speed (the INPUT). "Did this change improve the writing"
 * becomes "did the input move closer to the target", which is a number.
 *
 * Three numbers per measurement, and the first is what keeps the other
 * two honest:
 *
 *   FLOOR   neat take 1 against neat take 2. How much a hand varies when
 *           it is trying its hardest. Any improvement smaller than this
 *           is indistinguishable from the same person writing again.
 *   GAP     neat against normal. The distance to be closed.
 *   CLOSED  how much of GAP the app actually removed.
 *
 * A metric only counts when GAP is comfortably above FLOOR. Otherwise
 * there was nothing to fix and the column is noise dressed as evidence.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var H = require(path.join(__dirname, 'harness.js'));

var TRACES = path.join(__dirname, '..', 'traces');
var htmlPath = null;
for (var a = 2; a < process.argv.length; a++) {
  if (process.argv[a] === '--html') htmlPath = process.argv[++a];
  else if (process.argv[a] === '--traces') TRACES = process.argv[++a];
}

/* ---------- geometry ---------- */

function median(v) {
  var w = v.slice(0).sort(function (p, q) { return p - q; }), n = w.length;
  if (!n) return 0;
  return n % 2 ? w[n >> 1] : (w[n / 2 - 1] + w[n / 2]) / 2;
}

function theilSen(pts) {
  var n = pts.length, i, q, dx, sl = [], its = [];
  if (n < 3) return null;
  for (i = 0; i < n; i++) {
    for (q = i + 1; q < n; q++) {
      dx = pts[q][0] - pts[i][0];
      if (dx > -1 && dx < 1) continue;
      sl.push((pts[q][1] - pts[i][1]) / dx);
    }
  }
  if (!sl.length) return null;
  var m = median(sl);
  for (i = 0; i < n; i++) its.push(pts[i][1] - m * pts[i][0]);
  return { m: m, b: median(its) };
}

/* strokes that overlap in x are one symbol - the same rule the app uses,
   so the two are talking about the same objects */
function symbols(ink) {
  var syms = [], i, q, p, b;
  for (i = 0; i < ink.length; i++) {
    p = ink[i].pts;
    b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (q = 0; q < p.length; q++) {
      if (p[q][0] < b.x0) b.x0 = p[q][0];
      if (p[q][1] < b.y0) b.y0 = p[q][1];
      if (p[q][0] > b.x1) b.x1 = p[q][0];
      if (p[q][1] > b.y1) b.y1 = p[q][1];
    }
    syms.push(b);
  }
  var merged = true, ov, narrow, u, v;
  while (merged) {
    merged = false;
    for (i = 0; i < syms.length && !merged; i++) {
      for (q = i + 1; q < syms.length; q++) {
        u = syms[i]; v = syms[q];
        ov = Math.min(u.x1, v.x1) - Math.max(u.x0, v.x0);
        narrow = Math.max(Math.min(u.x1 - u.x0, v.x1 - v.x0), 6);
        if (ov > narrow * 0.5) {
          u.x0 = Math.min(u.x0, v.x0); u.y0 = Math.min(u.y0, v.y0);
          u.x1 = Math.max(u.x1, v.x1); u.y1 = Math.max(u.y1, v.y1);
          syms.splice(q, 1); merged = true; break;
        }
      }
    }
  }
  syms.sort(function (p, r) { return p.x0 - r.x0; });
  return syms;
}

/* the angle of the near-vertical parts of the writing - its slant */
function slants(ink) {
  var out = [], i, q, p, dx, dy, len;
  for (i = 0; i < ink.length; i++) {
    p = ink[i].pts;
    for (q = 4; q < p.length; q++) {
      dx = p[q][0] - p[q - 4][0];
      dy = p[q][1] - p[q - 4][1];
      len = Math.sqrt(dx * dx + dy * dy);
      if (len < 6) continue;
      if (Math.abs(dy) < Math.abs(dx)) continue;   /* not a vertical part */
      out.push(Math.atan2(dx, -dy) * 180 / Math.PI);
    }
  }
  return out;
}

/* how far the points wander off the straight line between their ends -
   a measure of how shaky a stroke is, independent of what it draws */
function excessPath(ink) {
  var i, q, p, run = 0, net = 0, d;
  for (i = 0; i < ink.length; i++) {
    p = ink[i].pts;
    if (p.length < 3) continue;
    for (q = 1; q < p.length; q++) {
      run += Math.sqrt(Math.pow(p[q][0] - p[q - 1][0], 2) +
                       Math.pow(p[q][1] - p[q - 1][1], 2));
    }
    d = Math.sqrt(Math.pow(p[p.length - 1][0] - p[0][0], 2) +
                  Math.pow(p[p.length - 1][1] - p[0][1], 2));
    net += d;
  }
  return net > 0 ? run / net : 0;
}

function spread(v) {
  if (v.length < 2) return 0;
  var m = median(v), i, dev = [];
  for (i = 0; i < v.length; i++) dev.push(Math.abs(v[i] - m));
  return median(dev);
}

/* Every number this whole exercise turns on. Each is a property of a
   line of writing that a reader would call tidy or untidy. */
function measure(ink) {
  var out = { tilt: 0, sit: 0, size: 0, slant: 0, gaps: 0, shake: 0, n: 0 };
  if (!ink || ink.length < 3) return out;
  var syms = symbols(ink), i, feet = [], hs = [], cx;
  for (i = 0; i < syms.length; i++) {
    cx = (syms[i].x0 + syms[i].x1) / 2;
    feet.push([cx, syms[i].y1]);
    hs.push(syms[i].y1 - syms[i].y0);
  }
  out.n = syms.length;
  var xh = median(hs) || 1;
  var fit = theilSen(feet);
  if (fit) {
    out.tilt = Math.abs(Math.atan(fit.m) * 180 / Math.PI);
    var res = [];
    for (i = 0; i < feet.length; i++) {
      res.push(Math.abs(feet[i][1] - (fit.m * feet[i][0] + fit.b)));
    }
    /* as a fraction of letter height, so it means the same at any size */
    out.sit = median(res) / xh;
  }
  out.size = spread(hs) / xh;
  var sl = slants(ink);
  out.slant = sl.length > 3 ? spread(sl) : 0;
  var gs = [], g;
  for (i = 1; i < syms.length; i++) {
    g = syms[i].x0 - syms[i - 1].x1;
    if (g > xh * 0.55) gs.push(g);
  }
  out.gaps = gs.length > 2 ? spread(gs) / xh : 0;
  out.shake = excessPath(ink);
  return out;
}

/* "min" is the smallest change a reader would notice. A gap has to clear
   BOTH the noise floor and this to be worth reporting - otherwise a gap of
   0.0001 closed to 0.00001 reads as a triumph, and a percentage of almost
   nothing is a number with no information in it. */
var METRICS = [
  { k: 'tilt',  label: 'line tilt',        unit: 'deg', min: 0.5 },
  { k: 'sit',   label: 'sits on the line', unit: 'xh',  min: 0.02 },
  { k: 'size',  label: 'letter size',      unit: 'xh',  min: 0.02 },
  { k: 'slant', label: 'slant spread',     unit: 'deg', min: 1.0 },
  { k: 'gaps',  label: 'word gaps',        unit: 'xh',  min: 0.05 },
  { k: 'shake', label: 'shake',            unit: 'x',   min: 0.01 }
];

/* ---------- the corpus ---------- */

function loadCorpus() {
  if (!fs.existsSync(TRACES)) return {};
  var files = fs.readdirSync(TRACES).filter(function (f) { return /\.json$/.test(f); });
  var items = {}, i, t, r;
  for (i = 0; i < files.length; i++) {
    try { t = JSON.parse(fs.readFileSync(path.join(TRACES, files[i]), 'utf8')); }
    catch (e) { continue; }
    if (!t.ref || !t.ink || t.ink.length < 3) continue;
    r = t.ref;
    if (!items[r.item]) items[r.item] = { text: r.text, takes: {} };
    /* a redo of the same take replaces the earlier one */
    items[r.item].takes[r.mode + r.take] = { ink: t.ink, file: files[i] };
  }
  return items;
}

/* ---------- run the app over a page of ink ---------- */

function tidied(ink, done) {
  var app = H.load({
    quiet: true, dpr: 2, viewW: 768, viewH: 826,
    html: htmlPath || undefined,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) }
  });
  app.flushFrames();
  app.loadInk(ink);
  app.tidy();
  done(app.strokes());
}

/* ---------- report ---------- */

function pad(v, n) { v = String(v); while (v.length < n) v += ' '; return v; }
function num(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

var items = loadCorpus();
var names = Object.keys(items).sort();

if (!names.length) {
  console.log('\nNo reference corpus recorded yet.\n');
  console.log('On the tablet:  menu -> Testing drills -> HANDWRITING REFERENCE');
  console.log('Twenty takes - five phrases, each written neatly twice and');
  console.log('normally twice. About twelve minutes, once.\n');
  console.log('Until then there is no target to measure against, and any');
  console.log('claim that the handwriting got better is an opinion.\n');
  process.exit(2);
}

console.log('\nHandwriting reference' + (htmlPath ? '  [' + htmlPath + ']' : '') + '\n');

var totGap = 0, totClosed = 0, usable = 0, rows = [];

function doItem(idx) {
  if (idx >= names.length) { finish(); return; }
  var name = names[idx], it = items[name], t = it.takes;
  var neat1 = t.neat1, neat2 = t.neat2, norm = t.norm1 || t.norm2;

  if (!neat1 || !norm) {
    rows.push({ item: name, skip: (!neat1 ? 'no neat take' : 'no normal take') });
    doItem(idx + 1);
    return;
  }

  var mN1 = measure(neat1.ink);
  var mN2 = neat2 ? measure(neat2.ink) : null;
  var mIn = measure(norm.ink);

  tidied(norm.ink, function (out) {
    var mOut = measure(out);
    var lines = [], i, k, floor, gap, after, closed;
    for (i = 0; i < METRICS.length; i++) {
      k = METRICS[i].k;
      floor = mN2 ? Math.abs(mN1[k] - mN2[k]) : null;
      gap = Math.abs(mIn[k] - mN1[k]);
      after = Math.abs(mOut[k] - mN1[k]);
      closed = gap > 1e-9 ? (gap - after) / gap : 0;
      var real = gap > METRICS[i].min && (floor === null || gap > floor * 2);
      lines.push({ m: METRICS[i], floor: floor, gap: gap, after: after,
                   closed: closed, real: real });
      if (real) { totGap += gap; totClosed += (gap - after); usable++; }
    }
    rows.push({ item: name, text: it.text, lines: lines,
                nSym: mIn.n, hasFloor: !!mN2 });
    doItem(idx + 1);
  });
}

function finish() {
  var i, q, r, L;
  for (i = 0; i < rows.length; i++) {
    r = rows[i];
    if (r.skip) {
      console.log('  ' + pad(r.item, 5) + '--  ' + r.skip);
      continue;
    }
    console.log('  ' + r.item + '  "' + r.text + '"   ' + r.nSym + ' symbols' +
                (r.hasFloor ? '' : '   (only one neat take: no noise floor)'));
    console.log('        ' + pad('', 18) + pad('floor', 9) + pad('gap', 9) +
                pad('after', 9) + 'closed');
    for (q = 0; q < r.lines.length; q++) {
      L = r.lines[q];
      console.log('        ' + pad(L.m.label, 18) +
        pad(L.floor === null ? '-' : num(L.floor, 2), 9) +
        pad(num(L.gap, 2), 9) +
        pad(num(L.after, 2), 9) +
        (L.real ? num(100 * L.closed, 0) + '%' : '-') +
        (L.real ? '' : '   ' + (L.gap <= L.m.min
           ? '(nothing wrong here to fix)'
           : '(within the variation of this hand itself)')));
    }
    console.log('');
  }
  if (!usable) {
    console.log('  Nothing measurable: every gap was within the noise floor.');
    console.log('  Either the neat takes were not neat enough, or the app is');
    console.log('  changing nothing that separates careful writing from quick.\n');
    return;
  }
  console.log('  ' + usable + ' of ' + (rows.length * METRICS.length) +
              ' measurements had a gap worth closing.');
  console.log('  OVERALL: ' + num(100 * totClosed / totGap, 0) +
              '% of the distance to the neat writing was closed.\n');
}

doItem(0);
