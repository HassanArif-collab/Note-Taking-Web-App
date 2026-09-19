/* ============================================================
 * test_features.js - the things you touch rather than the engine.
 * Run: node scripts/test_features.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');

var pass = 0, fail = 0;
function check(n, c, d) {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  (' + d + ')' : '')); }
}
function fresh() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 872 });
  a.flushFrames(); return a;
}
function write(app, id) {
  app.stroke({ id: id || 1, x0: 250, y0: 400, x1: 400, y1: 440, speed: 0.3, wobble: 3 });
  app.tick(120);
}

console.log('\nfeatures\n');

/* ---------- two-finger tap = undo ---------- */
var a = fresh();
write(a, 1); write(a, 2);
var before = a.strokes().length;
check('two strokes written', before === 2, before + ' strokes');
a.twoFingerTap(300, 500, 480, 520);
check('a two-finger tap undoes the last stroke', a.strokes().length === before - 1,
      a.strokes().length + ' strokes');

var b = fresh();
write(b, 1); write(b, 2);
b.twoFingerTap(300, 500, 480, 520, 60);   /* fingers move: that is a pinch */
check('a two-finger PINCH does not undo', b.strokes().length === 2,
      b.strokes().length + ' strokes');

var c = fresh();
c.twoFingerTap(300, 500, 480, 520);
check('a two-finger tap with nothing to undo is harmless',
      c.strokes().length === 0, c.strokes().length + ' strokes');

/* ---------- photos ---------- */
var p = fresh();
p.pickPhoto('data:image/jpeg;base64,AAAA#3000x2000');
var st = p.strokes();
check('a photo becomes a stroke', st.length === 1, st.length + ' strokes');

if (st.length === 1) {
  var img = st[0];
  check('it is stored as an image stroke', img.pen === 6, 'pen ' + img.pen);
  check('it carries its own pixels', typeof img.src === 'string' && img.src.length > 0);
  check('it has a placed size', img.iw > 0 && img.ih > 0, img.iw + 'x' + img.ih);
  check('it keeps the photo aspect ratio',
        Math.abs((img.iw / img.ih) - (3000 / 2000)) < 0.05,
        (img.iw / img.ih).toFixed(2) + ' vs 1.50');

  /* the point of downscaling: a 3000px photo must not be stored raw */
  check('a huge photo is downscaled before storage',
        img.src.indexOf('#3000x2000') === -1,
        'raw source was stored');
}

/* a photo must undo like anything else */
var p2 = fresh();
p2.pickPhoto('data:image/jpeg;base64,AAAA#1600x1200');
check('photo inserted', p2.strokes().length === 1);
p2.twoFingerTap(300, 700, 480, 720);
check('a photo can be undone with a two-finger tap',
      p2.strokes().length === 0, p2.strokes().length + ' strokes');

/* a photo must survive a backup round trip, pixels and all */
var p3 = fresh();
p3.pickPhoto('data:image/jpeg;base64,AAAA#1600x1200');
var srcImg = p3.strokes()[0];
var backup = p3.exportBackup();
var dest = fresh();
dest.importBackup(backup);
var got = null, all = dest.allStrokes(), i;
for (i = 0; i < all.length; i++) { if (all[i].pen === 6) got = all[i]; }
check('a photo survives backup and restore', !!got);
check('...with its pixels intact', !!got && got.src === srcImg.src);
check('...and its size intact',
      !!got && got.iw === srcImg.iw && got.ih === srcImg.ih);

/* ---------- pages ----------
 * A page is a band of one tall roll, so inserting one slides everything
 * below the seam down and deleting one drops what is inside and slides
 * the rest up. Both must collapse to a single undo step. */
function strokeTop(st) {
  var lo = 1e9, k;
  for (k = 0; k < st.pts.length; k++) { if (st.pts[k][1] < lo) lo = st.pts[k][1]; }
  return lo;
}

var pgNav = fresh();
write(pgNav, 1);
pgNav.clickMenu('Pages');
check('the page navigator shows a thumbnail per page',
      (pgNav.els.pagesGrid.children || []).length === 1,
      (pgNav.els.pagesGrid.children || []).length + ' thumbnails for 1 page');
check('...and says where you are',
      pgNav.els.pagesTitle.innerHTML.indexOf('Page 1 of 1') >= 0,
      pgNav.els.pagesTitle.innerHTML);

var pg = fresh();
write(pg, 1);
var y0 = strokeTop(pg.strokes()[0]);
/* Pages used to be a window.prompt asking for a number typed by hand.
   It is a thumbnail grid now, so the test drives the button rather than
   the prompt - and the old test kept passing against the new UI for a
   while because answer() simply went unused. */
pg.clickMenu('Pages');
pg.els.pagesInsertBtn._fire('click', {});
var y1 = strokeTop(pg.strokes()[0]);
check('inserting a page pushes the marks down', y1 > y0 + 900, y0 + ' -> ' + y1);
check('...without losing any', pg.strokes().length === 1);
pg.els.undoBtn._fire('click', {});
check('one undo puts them back', Math.abs(strokeTop(pg.strokes()[0]) - y0) < 1,
      String(strokeTop(pg.strokes()[0])));

var pd = fresh();
write(pd, 1);
pd.confirmAll(true).clickMenu('Pages');
pd.els.pagesDeleteBtn._fire('click', {});
check('deleting a page removes the marks on it', pd.strokes().length === 0,
      pd.strokes().length + ' strokes');
pd.els.undoBtn._fire('click', {});
check('one undo brings the page back', pd.strokes().length === 1,
      pd.strokes().length + ' strokes');

/* ---------- folders ---------- */
var fd = fresh();
var nbBtn = fd.els.newNbBtn;
fd.answer('Physics'); nbBtn._fire('click', {});
fd.answer('Term 1');  nbBtn._fire('click', {});
var nbs0 = fd.state().notebooks;
check('new notebooks are created', nbs0.length >= 3, nbs0.length + ' notebooks');

fd.answer('1');
fd.els.nbMoveBtn._fire('click', {});
var nbs = fd.state().notebooks;
var nested = 0, q;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) nested++; }
check('a notebook can be nested inside another', nested === 1, nested + ' nested');

/* a folder must never become its own ancestor */
var childIdx = -1;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) childIdx = q; }
fd.answer(String(childIdx + 1));
fd.els.nbMoveBtn._fire('click', {});
var after = fd.state().notebooks, loops = 0;
for (q = 0; q < after.length; q++) {
  var seen = 0, cur2 = after[q], r;
  while (cur2 && cur2.parent && seen++ < 10) {
    var pi = -1;
    for (r = 0; r < after.length; r++) { if (after[r].id === cur2.parent) pi = r; }
    cur2 = pi >= 0 ? after[pi] : null;
  }
  if (seen >= 10) loops++;
}
check('a folder cannot be put inside its own child', loops === 0, loops + ' loops');


/* ---------- line quality ----------
 * A passive disc rests on a contact patch several millimetres across, and
 * the reported centre of that patch wanders while the nib itself is
 * still. Drawn raw, a slow line comes out visibly furred. Filtering fixes
 * that and costs lag, which is worse than fur - so the filter believes a
 * new point more the faster the pen is moving, and completely at speed. */

function gloveApp() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  return a;
}

function wobbleOf(app) {
  var st = app.strokes()[0];
  if (!st) return -1;
  var L = 0, k;
  for (k = 1; k < st.pts.length; k++) {
    L += Math.sqrt(Math.pow(st.pts[k][0] - st.pts[k - 1][0], 2) +
                   Math.pow(st.pts[k][1] - st.pts[k - 1][1], 2));
  }
  var straight = Math.sqrt(
    Math.pow(st.pts[st.pts.length - 1][0] - st.pts[0][0], 2) +
    Math.pow(st.pts[st.pts.length - 1][1] - st.pts[0][1], 2));
  return straight > 0 ? (L / straight - 1) * 100 : -1;
}

var lq = gloveApp();
var lqSeed = 12345;
function lqRnd() {
  lqSeed = (lqSeed * 1103515245 + 12345) & 0x7fffffff;
  return (lqSeed / 0x7fffffff) * 2 - 1;
}
lq.down(1, 200, 400);
for (var lqi = 1; lqi <= 60; lqi++) {
  lq.tick(33);
  lq.moveTo(1, 200 + lqi * 2.2 + lqRnd() * 1.8, 400 + lqRnd() * 1.8);
}
lq.up(1); lq.flushFrames();
var wob = wobbleOf(lq);
check('a slow line is not furred by the wandering contact patch',
      wob >= 0 && wob < 8, wob.toFixed(1) + '% longer than straight (raw input is ~20%)');

/* lag is the thing filtering is not allowed to buy */
function lagAt(speed) {
  var a = gloveApp(), step = speed * 16, i;
  a.down(1, 200, 400);
  for (i = 1; i <= 40; i++) { a.tick(16); a.moveTo(1, 200 + i * step, 400); }
  a.up(1); a.flushFrames();
  var st = a.strokes()[0];
  if (!st) return 1e9;
  return (200 + 40 * step) - st.pts[st.pts.length - 1][0];
}
var fastLag = lagAt(0.6), slowLag = lagAt(0.05);
check('a fast stroke does not trail the nib at all', fastLag < 0.5,
      fastLag.toFixed(1) + 'px behind');
check('...and even a slow one trails by less than a nib width', slowLag < 3,
      slowLag.toFixed(1) + 'px behind');

/* a constant width is the single thing that most makes ink read as wire */
var bw = gloveApp();
bw.down(1, 200, 400);
for (var bi = 1; bi <= 14; bi++) { bw.tick(16); bw.moveTo(1, 200 + bi * 1, 400); }
for (bi = 1; bi <= 14; bi++) { bw.tick(16); bw.moveTo(1, 214 + bi * 10, 400); }
bw.up(1); bw.flushFrames();
var bs = bw.strokes()[0];
/* No "if it is exposed" fallback here. The first version of this had one,
   and since strokeWidthAt lives inside the app's closure it was never
   exposed, so the check passed without ever running - a test that agrees
   with you is worse than no test, and this file has been bitten by that
   before. */
var wSlow = bw.win.__mnWidthAt(bs, 6);
var wFast = bw.win.__mnWidthAt(bs, 22);
check('a ballpoint lays down more ink when moving slowly', wSlow > wFast,
      wSlow.toFixed(2) + 'px slow vs ' + wFast.toFixed(2) + 'px fast');


/* ---------- zoom window ----------
 * A passive disc cannot write small: the contact patch is millimetres
 * across and its reported centre wanders inside it, so below about a
 * centimetre the letters are limited by the hardware rather than the
 * hand. So write large in a strip at the bottom and land small in a box
 * on the page. The box is in document coordinates and has nothing to do
 * with the page zoom or scroll. */

var WRAPTOP = 56;   /* the harness puts the canvas under a 56px header */

function zwApp() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  a.clickMenu('Zoom window');
  a.flushFrames();
  return a;
}

var za = zwApp();
var zg = za.zw();
check('the zoom window opens', zg.on === true, String(zg.on));

/* 300px drawn on the glass must land as 300/mag on the page, inside the box */
za.stroke({ id: 1, x0: 60, y0: zg.top + 120 + WRAPTOP,
            x1: 360, y1: zg.top + 140 + WRAPTOP, speed: 0.3, wobble: 2 });
za.tick(200); za.flushFrames();
var zst = za.strokes()[0];
var zmin = 1e9, zmax = -1e9, zq;
if (zst) {
  for (zq = 0; zq < zst.pts.length; zq++) {
    if (zst.pts[zq][0] < zmin) zmin = zst.pts[zq][0];
    if (zst.pts[zq][0] > zmax) zmax = zst.pts[zq][0];
  }
}
check('writing in the strip lands smaller on the page',
      !!zst && Math.abs((zmax - zmin) - 300 / 3.2) < 12,
      zst ? Math.round(zmax - zmin) + 'px on the page for 300px of hand' : 'no stroke');
check('...and it lands inside the box, not under the hand',
      !!zst && zmin >= zg.x - 2 && zmax <= zg.x + zg.bw + 2,
      zst ? 'x ' + Math.round(zmin) + '..' + Math.round(zmax) +
            ' vs box ' + Math.round(zg.x) + '..' + Math.round(zg.x + zg.bw) : '-');

/* the box walks along the line by itself, or a line could never be
   finished without reaching up to move it every few letters */
var zb = zwApp();
var zbg = zb.zw();
zb.stroke({ id: 1, x0: 60, y0: zbg.top + 120 + WRAPTOP,
            x1: 700, y1: zbg.top + 140 + WRAPTOP, speed: 0.35, wobble: 2 });
zb.tick(250); zb.flushFrames();
check('the box advances once writing reaches its right edge',
      zb.zw().x > zbg.x + 100,
      Math.round(zbg.x) + ' -> ' + Math.round(zb.zw().x));

/* with the strip open the page above aims rather than writes - it is the
   only way to start a new line without leaving the strip */
var zc = zwApp();
zc.down(9, 400, 200 + WRAPTOP);
zc.tick(120);
zc.up(9);
zc.flushFrames();
var zcz = zc.zw();
check('tapping the page moves the box there', 
      Math.abs((zcz.x + zcz.bw / 2) - 400) < 4 && Math.abs((zcz.y + zcz.bh / 2) - 200) < 4,
      'centre (' + Math.round(zcz.x + zcz.bw / 2) + ',' + Math.round(zcz.y + zcz.bh / 2) + ')');
check('...and leaves no ink where it was tapped', zc.strokes().length === 0,
      zc.strokes().length + ' strokes');


/* ---------- tidy writing ----------
 * Writing drifts off the line. The fix is geometry, not recognition:
 * fit the baseline the marks actually sit on, rotate it flat, drop it
 * on the nearest rule. These check the three things that can go wrong -
 * it does nothing when there is nothing to do, it is not fooled by a
 * descender, and undo puts the ink back exactly where the hand left it. */

var TD_TOP = 56;

function tdApp() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  a.clickMenu('Tidy writing');
  a.flushFrames();
  return a;
}

/* n little marks climbing uphill at `slope`, each one a short stroke */
function tdWrite(a, n, x0, y0, slope, dip) {
  var i, id = 1, x, y;
  for (i = 0; i < n; i++) {
    x = x0 + i * 40;
    y = y0 + i * 40 * slope + ((dip && i === dip) ? 26 : 0);
    a.stroke({ id: id++, x0: x, y0: y - 18 + TD_TOP, x1: x + 14, y1: y + TD_TOP,
               speed: 0.25, wobble: 0.5 });
    a.tick(80);
  }
  a.tidy();               /* the 900ms pause, without waiting for it */
  a.flushFrames();
}

/* the slope of the line through the bottom of each stroke */
function tdSlope(a) {
  var st = a.strokes(), i, q, p, feet = [], my, mx;
  for (i = 0; i < st.length; i++) {
    p = st[i].pts; my = -1e9; mx = 0;
    for (q = 0; q < p.length; q++) { if (p[q][1] > my) { my = p[q][1]; mx = p[q][0]; } }
    feet.push([mx, my]);
  }
  var n = feet.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (i = 0; i < n; i++) { sx += feet[i][0]; sy += feet[i][1]; }
  for (i = 0; i < n; i++) {
    sxx += (feet[i][0] - sx / n) * (feet[i][0] - sx / n);
    sxy += (feet[i][0] - sx / n) * (feet[i][1] - sy / n);
  }
  return sxx < 1 ? 0 : sxy / sxx;
}

var ta = tdApp();
tdWrite(ta, 6, 120, 300, 0.12, 0);
var tsl = tdSlope(ta);
check('a line written uphill comes back flat',
      ta.strokes().length === 6 && Math.abs(tsl) < 0.02,
      ta.strokes().length + ' strokes, slope ' + tsl.toFixed(4) + ' (was 0.1200)');

/* it must land ON a rule, not merely level */
var tfeet = [], tq, tp, tmy;
for (tq = 0; tq < ta.strokes().length; tq++) {
  tp = ta.strokes()[tq].pts; tmy = -1e9;
  for (var tw = 0; tw < tp.length; tw++) if (tp[tw][1] > tmy) tmy = tp[tw][1];
  tfeet.push(tmy);
}
var tavg = 0;
for (tq = 0; tq < tfeet.length; tq++) tavg += tfeet[tq];
tavg /= tfeet.length;
var trule = Math.abs(((tavg - 56) % 38 + 38) % 38);
if (trule > 19) trule = 38 - trule;
check('...and sits on a ruled line, not between two',
      trule < 4.0, Math.round(trule * 10) / 10 + " px off the nearest rule");

/* a descender hangs below the baseline. Fitting through it would tip the
   whole word, which is the classic way this feature goes wrong. */
var tb = tdApp();
tdWrite(tb, 6, 120, 300, 0, 3);      /* flat, but mark 3 dips 26px */
var tbsl = tdSlope(tb);
check('a descender does not tilt the word it hangs from',
      Math.abs(tbsl) < 0.03, "slope " + tbsl.toFixed(4));

/* deliberate angles are not drift */
var tc = tdApp();
tdWrite(tc, 6, 120, 300, 0.60, 0);   /* ~31 degrees: an arrow, a bracket */
var tcsl = tdSlope(tc);
check('a deliberate diagonal is left alone',
      tcsl > 0.45, "slope " + tcsl.toFixed(4) + " (drawn at 0.6000)");

/* undo is a rigid transform run backwards, so it has to be exact */
var td = tdApp();
td.stroke({ id: 1, x0: 120, y0: 300 + TD_TOP, x1: 134, y1: 318 + TD_TOP, speed: 0.25, wobble: 0.5 });
td.tick(80);
td.stroke({ id: 2, x0: 180, y0: 306 + TD_TOP, x1: 194, y1: 324 + TD_TOP, speed: 0.25, wobble: 0.5 });
td.tick(80);
td.stroke({ id: 3, x0: 240, y0: 312 + TD_TOP, x1: 254, y1: 330 + TD_TOP, speed: 0.25, wobble: 0.5 });
td.flushFrames();
var tdBefore = JSON.stringify(td.strokes().map(function (x) {
  return x.pts.map(function (p) { return [Math.round(p[0] * 100), Math.round(p[1] * 100)]; });
}));
td.tidy();
var tdMoved = JSON.stringify(td.strokes().map(function (x) {
  return x.pts.map(function (p) { return [Math.round(p[0] * 100), Math.round(p[1] * 100)]; });
}));
check('tidying actually moved the ink', tdBefore !== tdMoved,
      tdBefore === tdMoved ? 'nothing moved - the test proves nothing' : 'moved');
td.undo();
td.flushFrames();
var tdAfter = td.strokes().map(function (x) {
  return x.pts.map(function (p) { return [Math.round(p[0] * 100), Math.round(p[1] * 100)]; });
});
var tdOrig = JSON.parse(tdBefore), tdWorst = 0, ti, tj;
for (ti = 0; ti < tdOrig.length; ti++) {
  for (tj = 0; tj < tdOrig[ti].length; tj++) {
    tdWorst = Math.max(tdWorst,
      Math.abs(tdOrig[ti][tj][0] - tdAfter[ti][tj][0]),
      Math.abs(tdOrig[ti][tj][1] - tdAfter[ti][tj][1]));
  }
}
check('undo puts every point back where the hand left it',
      tdWorst <= 2, 'worst point off by ' + (tdWorst / 100) + 'px');

/* off by default, and off means off */
var te = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
  seed: { mathnotes_v4: JSON.stringify({ v: 4,
    notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
te.flushFrames();
tdWrite(te, 6, 120, 300, 0.12, 0);
check('switched off, it does not touch the ink',
      Math.abs(tdSlope(te) - 0.12) < 0.03, "slope " + tdSlope(te).toFixed(4));


/* ---------- tidy writing: superscripts and subscripts ----------
 * Samsung sort every symbol into six levels by where it sits against
 * the baseline and how big it is - Tall, Basic, Lengthy, Top, Bottom,
 * Middle - and report that geometry alone gets it right about 99.9% of
 * the time, with no idea which symbol it is looking at. That is the
 * only reason any of this can run on a 2012 tablet.
 *
 * The two that get moved are Top and Bottom. The three that must NOT be
 * are Middle (an equals sign floats above the baseline but is not an
 * exponent), Lengthy (a descender drops below it but is not a
 * subscript), and the dot of an i (which is above its stem, not beside
 * it). Each of those is a test below, because each is a way this
 * feature goes wrong in a way the user notices immediately. */

/* a mark of the given size with its FOOT at y */
function mdMark(a, id, x, foot, w, h) {
  a.stroke({ id: id, x0: x, y0: foot - h + TD_TOP, x1: x + w, y1: foot + TD_TOP,
             speed: 0.25, wobble: 0.4 });
  a.tick(70);
}

/* where a stroke sits now, as [left, foot] */
function mdAt(a, i) {
  var p = a.strokes()[i].pts, q, my = -1e9, mnx = 1e9;
  for (q = 0; q < p.length; q++) {
    if (p[q][1] > my) my = p[q][1];
    if (p[q][0] < mnx) mnx = p[q][0];
  }
  return [mnx, my];
}

/* "x^2 + y^2", with the two exponents written at two different heights -
   which is what a hand actually does, and what makes an equation look
   untidy even when every symbol is well formed */
var ma = tdApp();
mdMark(ma, 1, 120, 300, 22, 22);   /* x     base, full height */
mdMark(ma, 2, 146, 282, 11, 11);   /* 2     exponent, 18 above the foot */
mdMark(ma, 3, 175, 300, 22, 22);   /* +     (a block, stands in for one) */
mdMark(ma, 4, 210, 300, 22, 22);   /* y */
mdMark(ma, 5, 236, 290, 11, 11);   /* 2     exponent, only 10 above */
ma.tidy();
var msup1 = mdAt(ma, 1)[1], msup2 = mdAt(ma, 4)[1];
var mbase1 = mdAt(ma, 0)[1], mbase2 = mdAt(ma, 3)[1];
check('two exponents written at different heights end up level',
      Math.abs((mbase1 - msup1) - (mbase2 - msup2)) < 1.5,
      'clearances ' + Math.round(mbase1 - msup1) + 'px and ' +
      Math.round(mbase2 - msup2) + 'px (written 18 and 10)');
check('...and both actually cleared the baseline',
      (mbase1 - msup1) > 8 && (mbase2 - msup2) > 8,
      Math.round(mbase1 - msup1) + 'px');

/* an equals sign floats above the baseline too. Samsung call it Middle;
   if it were read as a Top it would be launched into the air. */
var mb = tdApp();
mdMark(mb, 1, 120, 300, 22, 22);
mdMark(mb, 2, 150, 292, 20, 2);    /* = upper bar */
mdMark(mb, 3, 150, 300, 20, 2);    /* = lower bar, so the pair spans 10 */
mdMark(mb, 4, 190, 300, 22, 22);
mdMark(mb, 5, 220, 300, 22, 22);
var mbWas = mdAt(mb, 1)[1] - mdAt(mb, 0)[1];   /* against the x beside it */
mb.tidy();
var mbNow = mdAt(mb, 1)[1] - mdAt(mb, 0)[1];
check('an equals sign is not read as an exponent',
      Math.abs(mbNow - mbWas) < 2.0,
      'clearance moved ' + Math.round(Math.abs(mbNow - mbWas) * 10) / 10 + 'px');

/* the dot of an i sits ON its stem. The 2 of x squared sits BESIDE the x.
   That one difference is the whole of telling them apart, and it falls
   out of grouping strokes that overlap in x. */
var mc = tdApp();
mdMark(mc, 1, 120, 300, 22, 22);
mdMark(mc, 2, 152, 300, 6, 22);    /* the stem of an i */
mdMark(mc, 3, 152, 282, 6, 5);     /* its dot, directly above */
mdMark(mc, 4, 175, 300, 22, 22);
mdMark(mc, 5, 205, 300, 22, 22);
var mcWas = mdAt(mc, 2)[1] - mdAt(mc, 0)[1];   /* dot against the mark left of it */
mc.tidy();
var mcNow = mdAt(mc, 2)[1] - mdAt(mc, 0)[1];
check('the dot of an i is not lifted like an exponent',
      Math.abs(mcNow - mcWas) < 2.0,
      'clearance moved ' + Math.round(Math.abs(mcNow - mcWas) * 10) / 10 + 'px');

/* a subscript drops below the line. So does a descender - but a g is
   taller than the median symbol and a subscript is smaller, which is the
   size half of the same two-number test. */
var mdd = tdApp();
mdMark(mdd, 1, 120, 300, 22, 22);  /* a */
mdMark(mdd, 2, 146, 312, 11, 11);  /* subscript 1, 12 below the line */
mdMark(mdd, 3, 175, 300, 22, 22);
mdMark(mdd, 4, 205, 300, 22, 22);
mdMark(mdd, 5, 235, 316, 20, 34);  /* g: drops 16 below, but is TALL */
var mdgWas = mdAt(mdd, 4)[1] - mdAt(mdd, 0)[1];   /* the g against the a */
mdd.tidy();
var mdsub = mdAt(mdd, 1)[1], mdbase = mdAt(mdd, 0)[1];
check('a subscript is levelled below the baseline',
      (mdsub - mdbase) > 2 && (mdsub - mdbase) < 14,
      Math.round(mdsub - mdbase) + 'px below the line');
var mdgNow = mdAt(mdd, 4)[1] - mdAt(mdd, 0)[1];
check('...but a descender is left where it was written',
      Math.abs(mdgNow - mdgWas) < 3.0,
      'drop moved ' + Math.round(Math.abs(mdgNow - mdgWas) * 10) / 10 + 'px');

/* nothing here may move sideways: horizontal position is spacing, and
   spacing is the hand that wrote it, not ours */
var meX = [], mq;
for (mq = 0; mq < 5; mq++) meX.push(mdAt(ma, mq)[0]);
check('levelling a script never moves it sideways',
      Math.abs(meX[1] - meX[0]) > 20,
      'x still ordered: ' + meX.map(function (v) { return Math.round(v); }).join(', '));


/* ---------- tidy writing: the gaps between words ----------
 * The gaps a hand leaves are not random, but they are not even either,
 * and across a page the unevenness is most of what makes writing look
 * hurried. Evening them is the only part of tidying that moves ink
 * SIDEWAYS, which is why it is also the part with the most ways to be
 * wrong - so the rule only touches gaps that are already about the usual
 * size, and abandons the whole line rather than slide any word far. */

/* a line of `n` two-mark words at the given gaps */
function swLine(a, x, gapList) {
  var i, id = 1, k;
  for (i = 0; i < gapList.length + 1; i++) {
    mdMark(a, id++, x, 300, 16, 22);
    mdMark(a, id++, x + 20, 300, 16, 22);
    if (i < gapList.length) x += 36 + gapList[i];
  }
  return a;
}

/* the gaps as they stand now, measured from the ink */
function swGaps(a) {
  var st = a.strokes(), boxes = [], i, q, p, b;
  for (i = 0; i < st.length; i++) {
    p = st[i].pts; b = { x0: 1e9, x1: -1e9 };
    for (q = 0; q < p.length; q++) {
      if (p[q][0] < b.x0) b.x0 = p[q][0];
      if (p[q][0] > b.x1) b.x1 = p[q][0];
    }
    boxes.push(b);
  }
  boxes.sort(function (u, v) { return u.x0 - v.x0; });
  var out = [];
  for (i = 1; i < boxes.length; i++) {
    if (boxes[i].x0 - boxes[i - 1].x1 > 12) out.push(boxes[i].x0 - boxes[i - 1].x1);
  }
  return out;
}

/* five words at 16, 34, 20, 30 - ordinary hurried spacing */
var sa = tdApp();
swLine(sa, 100, [16, 34, 20, 30]);
var saWas = swGaps(sa);
sa.tidy();
var saNow = swGaps(sa);
function swSpread(g) {
  var i, lo = 1e9, hi = -1e9;
  for (i = 0; i < g.length; i++) { if (g[i] < lo) lo = g[i]; if (g[i] > hi) hi = g[i]; }
  return hi - lo;
}
check('uneven word gaps are evened out',
      saWas.length === 4 && saNow.length === 4 &&
      swSpread(saNow) < swSpread(saWas) / 2,
      'spread ' + Math.round(swSpread(saWas)) + 'px -> ' + Math.round(swSpread(saNow)) + 'px');

/* a gap three times the others is a column, a margin, the space before a
   working. It was meant, and squashing it would destroy the layout. */
var sb = tdApp();
swLine(sb, 100, [20, 22, 90, 18]);
var sbWas = swGaps(sb);
sb.tidy();
var sbNow = swGaps(sb);
check('a deliberate wide gap is left exactly as it was',
      sbNow.length === 4 && Math.abs(sbNow[2] - sbWas[2]) < 2.0,
      'the 90px gap is now ' + Math.round(sbNow[2]) + 'px');
check('...while the ordinary gaps around it still even out',
      Math.abs(sbNow[0] - sbNow[1]) < Math.abs(sbWas[0] - sbWas[1]) + 0.1,
      'first two gaps ' + Math.round(sbNow[0]) + ', ' + Math.round(sbNow[1]));

/* two gaps have no median worth the name */
var sc = tdApp();
swLine(sc, 100, [16, 40]);
var scWas = swGaps(sc);
sc.tidy();
var scNow = swGaps(sc);
check('three words are too few to say what the usual gap is',
      scNow.length === 2 &&
      Math.abs(scNow[0] - scWas[0]) < 1.0 && Math.abs(scNow[1] - scWas[1]) < 1.0,
      scWas.map(Math.round).join(', ') + ' -> ' + scNow.map(Math.round).join(', '));

/* and undo still has to be exact now that the transform moves sideways */
var sd = tdApp();
swLine(sd, 100, [16, 34, 20, 30]);
var sdBefore = JSON.stringify(sd.strokes().map(function (x) {
  return x.pts.map(function (p) { return [Math.round(p[0] * 100), Math.round(p[1] * 100)]; });
}));
sd.tidy();
sd.undo();
var sdAfter = sd.strokes().map(function (x) {
  return x.pts.map(function (p) { return [Math.round(p[0] * 100), Math.round(p[1] * 100)]; });
});
var sdOrig = JSON.parse(sdBefore), sdWorst = 0, sq, sr;
for (sq = 0; sq < sdOrig.length; sq++) {
  for (sr = 0; sr < sdOrig[sq].length; sr++) {
    sdWorst = Math.max(sdWorst,
      Math.abs(sdOrig[sq][sr][0] - sdAfter[sq][sr][0]),
      Math.abs(sdOrig[sq][sr][1] - sdAfter[sq][sr][1]));
  }
}
check('undo is still exact once words move sideways too',
      sdWorst <= 2, 'worst point off by ' + (sdWorst / 100) + 'px');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
