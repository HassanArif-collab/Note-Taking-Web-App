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
fd.nb().move();
var nbs = fd.state().notebooks;
var nested = 0, q;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) nested++; }
check('a notebook can be nested inside another', nested === 1, nested + ' nested');

/* a folder must never become its own ancestor */
var childIdx = -1;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) childIdx = q; }
fd.answer(String(childIdx + 1));
fd.nb().move();
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
  /* tidy is an action now, not a switch */
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
  a.tidy();
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


/* ---------- the baseline is fitted robustly ----------
 * Least squares has a breakdown point of ZERO: one foot in the wrong
 * place moves the line, and a long lever moves it a long way. A word
 * ending in -ppy puts three descenders at the right-hand end, which is
 * the worst case there is - every one pulls the same way, on the longest
 * arm. Theil-Sen takes the median of the pairwise slopes, so a quarter of
 * the feet can be anywhere at all and the line does not move. This test
 * says which of the two is running. */

var rba = tdApp();
(function () {
  var i, foot, hh;
  for (i = 0; i < 8; i++) {
    foot = 300 + (i >= 5 ? 20 : 0);      /* last three hang below */
    hh = 22 + (i >= 5 ? 20 : 0);
    mdMark(rba, i + 1, 120 + i * 34, foot, 20, hh);
  }
})();
/* marks 0 and 4 both sit ON the baseline, so whatever the line did, they
   have to stay level with each other */
var rbWas = mdAt(rba, 4)[1] - mdAt(rba, 0)[1];
rba.tidy();
var rbNow = mdAt(rba, 4)[1] - mdAt(rba, 0)[1];
check('three descenders at one end do not tilt the line',
      Math.abs(rbNow - rbWas) < 2.0,
      "level marks drifted " + (Math.round(Math.abs(rbNow - rbWas) * 10) / 10) + "px apart");

check('...and the descenders still hang below it',
      mdAt(rba, 7)[1] - mdAt(rba, 0)[1] > 10,
      Math.round(mdAt(rba, 7)[1] - mdAt(rba, 0)[1]) + "px below the baseline");





/* ---------- the baseline structure tree ----------
 * "x to the tenth" is not a line with two marks set high. It is a
 * dominant baseline with ONE region hanging off the x, and that region
 * has an internal shape of its own - the 1 and the 0 sit at whatever
 * heights the hand gave them, relative to each other.
 *
 * Levelling each of them against the main baseline separately would put
 * both feet on the same canonical height and flatten that shape out. The
 * whole point of the tree is that the region moves as ONE thing: lifted
 * to where an exponent belongs, and otherwise left exactly as written. */

var bta = tdApp();
mdMark(bta, 1, 120, 300, 22, 22);   /* x */
mdMark(bta, 2, 146, 288, 10, 10);   /* 1, written low */
mdMark(bta, 3, 160, 282, 10, 10);   /* 0, written 6px higher than the 1 */
mdMark(bta, 4, 190, 300, 22, 22);   /* + */
mdMark(bta, 5, 222, 300, 22, 22);   /* y */
mdMark(bta, 6, 254, 300, 22, 22);
var btWas = mdAt(bta, 1)[1] - mdAt(bta, 2)[1];   /* 1 against 0 */
bta.tidy();
var btNow = mdAt(bta, 1)[1] - mdAt(bta, 2)[1];
check('a two-digit exponent keeps its own internal shape',
      Math.abs(btNow - btWas) < 1.5,
      "the gap inside the exponent went " + Math.round(btWas) + "px -> " + Math.round(btNow) + "px");

/* and it still ends up where an exponent belongs */
var btClear = mdAt(bta, 0)[1] - mdAt(bta, 1)[1];
check('...and the region as a whole is lifted clear of the baseline',
      btClear > 6, Math.round(btClear) + "px above the baseline");

/* a script belongs to the symbol it sits beside, so the writing on the
   far side of the line is not dragged with it */
check('...while the rest of the line is untouched',
      Math.abs(mdAt(bta, 4)[1] - mdAt(bta, 5)[1]) < 1.5,
      "two baseline marks drifted " +
      (Math.round(Math.abs(mdAt(bta, 4)[1] - mdAt(bta, 5)[1]) * 10) / 10) + "px apart");


/* ---------- lifting the pen costs the same on line 10 as on line 1 ----
 * Finishing a stroke used to invalidate the tile it landed in, and the
 * next frame rebuilt that tile by allocating a fresh screen-wide canvas
 * and re-rendering every stroke in the band. Measured: 80 curves
 * rasterised per pen-up on the first line, 480 on the tenth, and a new
 * million-pixel canvas each time.
 *
 * The page was not getting slower because there was more ink on screen.
 * It was getting slower because every pen-up redrew all of it. */

function tcApp() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  /* hooked BEFORE the first frame: tiles built during start-up would
     otherwise never be counted */
  a._made = 0;
  var od = a.doc.createElement;
  a.doc.createElement = function (tag) {
    if (String(tag).toLowerCase() === 'canvas') a._made++;
    return od.call(a.doc, tag);
  };
  a.flushFrames();
  return a;
}

var tca = tcApp();
(function () {
  var id = 1, line, k, first = -1, last = -1;
  for (line = 0; line < 10; line++) {
    for (k = 0; k < 8; k++) {
      tca.stroke({ id: id++, x0: 80 + k * 70, y0: 96 + line * 40 + 56,
                   x1: 120 + k * 70, y1: 120 + line * 40 + 56,
                   speed: 0.22, wobble: 1 });
      tca.tick(40);
      var made = tca._made;
      tca.flushFrames();
      made = tca._made - made;
      if (line === 0 && k === 7) first = made;
      if (line === 9 && k === 7) last = made;
    }
  }
  check('a pen-up on line 10 allocates no more than one on line 1',
        last <= first, "line 1 made " + first + " canvases, line 10 made " + last);
  check('...and a pen-up allocates no canvas at all',
        last === 0, last + " canvases allocated on the last pen-up");
})();

check('all eighty strokes are still on the page', tca.strokes().length === 80,
      tca.strokes().length + " strokes");

/* the fast path only applies to ink that belongs on top. Undo puts a
   stroke back in the middle of the order, so it has to go the slow way
   or it would be painted over its own neighbours. */
var tcb = tcApp();
tcb.stroke({ id: 1, x0: 100, y0: 150 + 56, x1: 200, y1: 170 + 56, speed: 0.25, wobble: 1 });
tcb.tick(40);
tcb.stroke({ id: 2, x0: 120, y0: 155 + 56, x1: 220, y1: 175 + 56, speed: 0.25, wobble: 1 });
tcb.tick(40);
tcb.flushFrames();
tcb.undo();
tcb.flushFrames();
check('undo still removes the stroke it was asked to',
      tcb.strokes().length === 1, tcb.strokes().length + " strokes left");


/* ---------- the note is never written out under the pen ----------
 * Saving means JSON.stringify of every stroke plus a SYNCHRONOUS
 * localStorage write - the main thread does nothing else until both
 * finish, and on the tablet a few pages of notes is roughly a tenth of a
 * second of it. The timer fired 700ms after the last stroke, which is a
 * thinking pause and not the end of writing, so the freeze landed
 * exactly as the hand came back down. */

function svApp() {
  return H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
}

/* how many strokes the SAVED copy knows about */
function svStored(a) {
  var raw = a.storage.getItem('mathnotes_v5_n_n1');
  if (!raw) return -1;
  try { return (JSON.parse(raw).strokes || []).length; } catch (e) { return -2; }
}

var sva = svApp();
sva.flushFrames();
sva.stroke({ id: 1, x0: 100, y0: 200 + 56, x1: 180, y1: 224 + 56, speed: 0.25, wobble: 1 });
sva.tick(40); sva.flushFrames();
sva.save();
check('a finished stroke is saved once the pen is up', svStored(sva) === 1,
      svStored(sva) + " strokes in storage");

/* second stroke, then the pen comes back down before the timer fires */
sva.stroke({ id: 2, x0: 200, y0: 200 + 56, x1: 280, y1: 224 + 56, speed: 0.25, wobble: 1 });
sva.tick(40); sva.flushFrames();
sva.down(9, 320, 200 + 56);      /* writing again */
sva.save();
check('the save is held off while the pen is on the glass',
      svStored(sva) === 1, svStored(sva) + " strokes in storage (should still be 1)");

sva.up(9);
/* past the gap between full saves - writing the whole note out is
   expensive and it is throttled, so a test that does not wait is
   testing the throttle rather than the pen-down rule */
sva.tick(6000); sva.flushFrames();
sva.save();
check('...and goes through the moment the glass is clear',
      svStored(sva) >= 2, svStored(sva) + " strokes in storage");

/* leaving the page must save whatever is happening - a deferral that
   could swallow the tail of a session would be worse than the freeze */
var svb = svApp();
svb.flushFrames();
svb.stroke({ id: 1, x0: 100, y0: 300 + 56, x1: 180, y1: 324 + 56, speed: 0.25, wobble: 1 });
svb.tick(40); svb.flushFrames();
svb.down(9, 400, 300 + 56);      /* pen still down as the tab goes away */
svb.fire('pagehide');
check('leaving the page saves even with the pen down',
      svStored(svb) >= 1, svStored(svb) + " strokes in storage");


/* ---------- deleting a notebook keeps everything inside it ----------
 * There was no way to delete a notebook at all, and rename and move sat
 * in the drawer header acting on whichever notebook you happened to be
 * in - so to rename one you first had to open it, and nothing on screen
 * said which one the buttons meant.
 *
 * Delete is the dangerous one. A notebook holds notes and can hold other
 * notebooks, and none of that is what the user asked to delete. The
 * notes move up to the folder above and the sub-folders take its place
 * there; the only thing that disappears is the notebook. */

var nd = fresh();
nd.confirmAll(true);
(function () {
  var mk = nd.els.newNbBtn;
  nd.answer('Physics'); mk._fire('click', {});
  /* two notes in it */
  nd.els.fabNew._fire('click', {});
  nd.flushFrames();
  nd.els.backBtn._fire('click', {});
  nd.flushFrames();
  nd.els.fabNew._fire('click', {});
  nd.flushFrames();
  nd.els.backBtn._fire('click', {});
  nd.flushFrames();
})();

var ndBefore = nd.state().notebooks;
var ndIdx = -1, ndq;
for (ndq = 0; ndq < ndBefore.length; ndq++) {
  if (ndBefore[ndq].title === 'Physics') ndIdx = ndq;
}
var ndNotesInside = ndIdx >= 0 ? ndBefore[ndIdx].notes.length : -1;
check('a notebook can hold notes', ndNotesInside >= 2,
      ndNotesInside + " notes in it");

var ndTotalBefore = 0;
for (ndq = 0; ndq < ndBefore.length; ndq++) ndTotalBefore += ndBefore[ndq].notes.length;
nd.nb().del(ndIdx);
nd.flushFrames();
var ndAfter = nd.state().notebooks, ndTotalAfter = 0;
for (ndq = 0; ndq < ndAfter.length; ndq++) ndTotalAfter += ndAfter[ndq].notes.length;

check('deleting a notebook removes the notebook',
      ndAfter.length === ndBefore.length - 1,
      ndBefore.length + " -> " + ndAfter.length + " notebooks");
check('...and not one note inside it', ndTotalAfter === ndTotalBefore,
      ndTotalBefore + " notes before, " + ndTotalAfter + " after");

/* the last notebook is the floor - deleting it would leave nowhere to put
   a note */
var nl = fresh();
nl.confirmAll(true);
(function () {
  var st = nl.state().notebooks, i;
  for (i = st.length - 1; i > 0; i--) nl.nb().del(i);
  nl.nb().del(0);
})();
check('the last notebook cannot be deleted',
      nl.state().notebooks.length >= 1,
      nl.state().notebooks.length + " notebooks left");

/* renaming acts on the notebook you picked, not the one you are in */
var nr = fresh();
(function () {
  nr.answer('Physics'); nr.els.newNbBtn._fire('click', {});
  nr.answer('Chemistry'); nr.els.newNbBtn._fire('click', {});
})();
(function () {
  var st = nr.state().notebooks, i, target = -1;
  for (i = 0; i < st.length; i++) if (st[i].title === 'Physics') target = i;
  var cur = nr.state().cur ? nr.state().cur.nb : -1;
  nr.answer('Maths');
  nr.nb().rename(target);
  var st2 = nr.state().notebooks;
  check('rename acts on the row you tapped, not the notebook you are in',
        st2[target].title === "Maths" && target !== cur,
        "renamed index " + target + ", current is " + cur);
})();


/* ---------- turning the tablet does not strand your writing ----------
 * The page had no width of its own: it was exactly as wide as the screen.
 * So writing at x=900 in landscape and then turning the tablet to
 * portrait put that ink past the right edge of a 768px page, with no
 * horizontal scroll to go and find it. Still in the file, never on screen
 * again - which is what "some of my writing disappears" was. */

var rt = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
  seed: { mathnotes_v4: JSON.stringify({ v: 4,
    notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
rt.flushFrames();
/* write near the right-hand edge of the landscape page */
rt.stroke({ id: 1, x0: 880, y0: 200 + 56, x1: 960, y1: 224 + 56, speed: 0.25, wobble: 1 });
rt.tick(60); rt.flushFrames();
var rtFar = 0, rtP = rt.strokes()[0] ? rt.strokes()[0].pts : [], rq;
for (rq = 0; rq < rtP.length; rq++) if (rtP[rq][0] > rtFar) rtFar = rtP[rq][0];
check('ink lands near the right edge in landscape', rtFar > 900,
      "furthest ink at x=" + Math.round(rtFar));

/* now stand the tablet up */
rt.rotate(768, 1004);
var rg = rt.geom();
check('the page stays wide enough to hold it after turning',
      rg.docW >= rtFar, "page is " + Math.round(rg.docW) +
      "px wide, ink reaches " + Math.round(rtFar));

/* and it has to be reachable, not merely present */
rt.scrollTo ? rt.scrollTo(9999, 0) : null;
(function () {
  var win = rt.win;
  win.__mnGeom();
})();
check('...and the screen can scroll across to reach it',
      rg.docW > rg.viewW,
      "page " + Math.round(rg.docW) + "px vs screen " + Math.round(rg.viewW) + "px");

check('the stroke itself is untouched by the rotation',
      rt.strokes().length === 1 && rt.strokes()[0].pts.length === rtP.length,
      rt.strokes().length + " strokes");


/* ---------- favourite pens: one tap to change what you write with ----------
 * Thin black to thick red was: tap the pen, find red, drag a slider, tap
 * away. Samsung keeps three favourites, each holding pen, colour and
 * width TOGETHER, so that change is one tap. The apps that store colour
 * and width as separate slots charge two, and their users complain. */

var fp = fresh();
fp.flushFrames();
var fpSlots = fp.els.penSlots;
check('three favourite pens sit in the toolbar',
      fpSlots && fpSlots.children.length === 3,
      fpSlots ? fpSlots.children.length + " slots" : "no slot bar");

var fp0 = fp.pen();
fpSlots.children[2]._fire("click", {});
var fp1 = fp.pen();
check('one tap on a favourite switches to it',
      fp1.slot === 2 && fp1.color === fp0.slots[2].c,
      "slot " + fp1.slot + ", colour " + fp1.color);
check('...without opening any panel on the way',
      fp1.palette !== "block", "palette " + fp1.palette);

/* tapping the one you already hold is how you change it */
fpSlots.children[2]._fire("click", {});
check('tapping the favourite you are using opens it for editing',
      fp.pen().palette === "block", "palette " + fp.pen().palette);

/* and a change made there belongs to that favourite from then on */
(function () {
  var dots = fp.els.thickDots;
  dots.children[5]._fire("click", {});
  var after = fp.pen();
  check('a width chosen in the panel is kept by that favourite',
        after.slots[2].w === 5 && after.w === 5,
        "slot width " + after.slots[2].w + ", pen width " + after.w);
  /* switch away and back: it must come back as it was left */
  fpSlots.children[0]._fire("click", {});
  fpSlots.children[2]._fire("click", {});
  check('...and comes back that way after using another one',
        fp.pen().w === 5 && fp.pen().slot === 2, "width " + fp.pen().w);
})();

/* coming back from the eraser used to open the colour panel every time */
fp.els.eraserBtn._fire("click", {});
fp.els.penBtn._fire("click", {});
check('coming back to the pen from the eraser is one tap, no panel',
      fp.pen().tool === "pen" && fp.pen().palette !== "block",
      "tool " + fp.pen().tool + ", palette " + fp.pen().palette);

/* ---------- scratch out: scribble over writing to erase it ----------
 * Samsung Notes, GoodNotes and Apple all do this. The risk is the other
 * direction: cursive zigzags too, and math shades areas under curves, and
 * neither may ever lose ink to it. */

function scApp(set) {
  var s = { palmLevel: 0, hand: 0 }, k;
  for (k in set || {}) s[k] = set[k];
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: s }) } });
  a.flushFrames();
  return a;
}
function scPath(a, id, pts) {
  a.down(id, pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) { a.tick(16); a.moveTo(id, pts[i][0], pts[i][1]); }
  a.tick(16); a.up(id); a.tick(150); a.flushFrames();
}
/* a joined-up word: small arches, like "mnm" */
function scWord(x0, y) {
  var p = [], x;
  for (x = x0; x <= x0 + 150; x += 3) p.push([x, y + 11 * Math.sin((x - x0) / 7)]);
  return p;
}
/* a scratch-out: tall legs, close together, travelling across */
function scZig(x0, x1, yTop, yBot, gap) {
  var p = [], x, k, up = false;
  for (x = x0; x <= x1; x += gap) {
    for (k = 0; k <= 5; k++) p.push([x + gap * k / 5, up ? yBot + (yTop - yBot) * k / 5 : yTop + (yBot - yTop) * k / 5]);
    up = !up;
  }
  return p;
}

var sx = scApp();
scPath(sx, 1, scWord(300, 400));
scPath(sx, 2, scZig(292, 458, 378, 422, 8));
check('scribbling over a word erases it', sx.strokes().length === 0,
      sx.strokes().length + ' strokes left');
check('...and the scribble is not left behind as ink', sx.strokes().length === 0);
sx.undo();
check('Undo gives the word back and keeps the scribble as writing',
      sx.strokes().length === 2, sx.strokes().length + ' strokes');
sx.undo();
check('a second Undo takes the scribble away too', sx.strokes().length === 1,
      sx.strokes().length + ' strokes');

var se = scApp();
scPath(se, 1, scZig(292, 458, 378, 422, 8));
check('a zigzag over empty paper is just ink', se.strokes().length === 1,
      se.strokes().length + ' strokes');

var sw = scApp();
scPath(sw, 1, scWord(300, 400));
scPath(sw, 2, scWord(300, 400));
check('writing a joined-up word over another leaves both', sw.strokes().length === 2,
      sw.strokes().length + ' strokes');

/* shading the area under a curve, legs running from the axis up to it */
function scShade(over) {
  var a = scApp(), curve = [], x, shade = [], up = true, k, yc;
  function cy(x) { return 520 - 70 * Math.sin(Math.PI * (x - 300) / 200); }
  for (x = 300; x <= 500; x += 4) curve.push([x, cy(x)]);
  scPath(a, 1, curve);
  scPath(a, 2, [[280, 520], [360, 520], [440, 520], [520, 520]]);
  for (x = 312; x <= 488; x += 7) {
    yc = cy(x) - over;
    for (k = 0; k <= 5; k++) shade.push([x, up ? 518 + (yc - 518) * k / 5 : yc + (518 - yc) * k / 5]);
    up = !up;
  }
  scPath(a, 3, shade);
  return a.strokes().length;
}
check('shading under a curve keeps the curve and the axis', scShade(-2) === 3,
      scShade(-2) + ' strokes');
check('...even when the shading runs a little past the curve', scShade(3) === 3,
      scShade(3) + ' strokes');

var sh = scApp({ pen: 4 });
scPath(sh, 1, scWord(300, 400));
scPath(sh, 2, scZig(292, 458, 378, 422, 8));
check('a highlighter zigzag highlights, it does not erase', sh.strokes().length === 2,
      sh.strokes().length + ' strokes');

var so = scApp({ scratch: false });
scPath(so, 1, scWord(300, 400));
scPath(so, 2, scZig(292, 458, 378, 422, 8));
check('with Scribble to erase off, a scribble is only ink', so.strokes().length === 2,
      so.strokes().length + ' strokes');

/* ---------- endless page ----------
 * On pages the note only grew once ink reached the bottom of the last
 * page, so there was never blank paper waiting below the line you were
 * on. An endless note always keeps a screen of it. */

function enLowest(a) {
  var lo = 0;
  a.strokes().forEach(function (s) { s.pts.forEach(function (p) { if (p[1] > lo) lo = p[1]; }); });
  return lo;
}
var ep = scApp();
scPath(ep, 1, [[200, 560], [300, 580], [400, 600], [500, 620]]);
var epG = ep.geom();
check('on pages, the paper ends with the page (the old way)',
      epG.docH < enLowest(ep) + epG.viewH, 'docH ' + epG.docH + ', ink to ' + Math.round(enLowest(ep)));

var en = scApp();
en.clickMenu('Page type');
scPath(en, 1, [[200, 560], [300, 580], [400, 600], [500, 620]]);
var enG = en.geom();
check('an endless page keeps a screen of blank paper below the ink',
      enG.docH >= enLowest(en) + enG.viewH, 'docH ' + enG.docH + ', ink to ' + Math.round(enLowest(en)));
check('...and has no page navigator to offer', !en.clickMenu('Pages'));
en.tick(6000); en.save();
check('the page type is saved with the note', (en.note('n1') || {}).endless === 1,
      JSON.stringify((en.note('n1') || {}).endless));
en.els.backBtn._fire('click', {});
en.els.fabNew._fire('click', {});
en.flushFrames();
check('a new note after choosing Endless is endless too', !en.clickMenu('Pages'));
en.clickMenu('Page type');
check('...and Page type turns a note back into pages', en.clickMenu('Pages'));

/* ---------- two-finger scroll in Glove mode ----------
 * It never worked: every contact inks at once in Glove mode, and the pan
 * test only looked at contacts that were not drawing. A recording has four
 * attempts in twenty seconds, each followed by an Undo to remove the line
 * it drew instead. */

function gsApp() {
  var a = scApp(), z, q;
  for (z = 0; z < 7; z++) {
    a.down(8, 200, 300 + z * 50);
    for (q = 1; q <= 30; q++) { a.tick(16); a.moveTo(8, 200 + q * 8, 300 + z * 50 + Math.sin(q) * 6); }
    a.tick(16); a.up(8); a.tick(300);
  }
  a.tick(1500);
  return a;
}
/* two contacts, the second landing `lag` ms after the first, each following
   its own path function of the frame number */
function gsPair(a, lag, pa, pb, frames) {
  var i;
  a.down(1, pa(0)[0], pa(0)[1]);
  a.tick(lag);
  a.down(2, pb(0)[0], pb(0)[1]);
  for (i = 1; i <= frames; i++) {
    a.tick(16);
    a.moveTo(1, pa(i)[0], pa(i)[1]);
    a.moveTo(2, pb(i)[0], pb(i)[1]);
    a.flushFrames();
  }
  a.tick(16); a.up(1); a.up(2); a.tick(600); a.flushFrames();
}

var gs = gsApp(), gs0 = gs.strokes().length;
gsPair(gs, 30, function (i) { return [400, 600 - i * 16]; },
               function (i) { return [510, 600 - i * 16]; }, 25);
check('Glove mode: two fingers dragged up scroll the page', gs.geom().scrollY > 200,
      'scrollY ' + Math.round(gs.geom().scrollY));
check('...and leave no line behind', gs.strokes().length === gs0,
      gs0 + ' -> ' + gs.strokes().length + ' strokes');

/* recorded scrolls drift apart by up to 43px on a 292px pair */
var gd = gsApp();
gsPair(gd, 30, function (i) { return [400 - i * 0.8, 600 - i * 10]; },
               function (i) { return [700 + i * 0.8, 600 - i * 10]; }, 25);
check('...a scroll whose fingers drift apart as much as real ones still only scrolls',
      gd.geom().scrollY > 100 && Math.abs(gd.geom().zoom - 1) < 0.01,
      'scrollY ' + Math.round(gd.geom().scrollY) + ', zoom ' + gd.geom().zoom.toFixed(2));

/* ...but spreading the fingers mid-scroll zooms, like every tablet app */
var gsz = gsApp();
gsPair(gsz, 30, function (i) { return i <= 12 ? [400, 600 - i * 10] : [400 - (i - 12) * 7, 480]; },
                function (i) { return i <= 12 ? [700, 600 - i * 10] : [700 + (i - 12) * 7, 480]; }, 28);
check('spreading two fingers in the middle of a scroll zooms in',
      gsz.geom().scrollY > 50 && gsz.geom().zoom > 1.1,
      'scrollY ' + Math.round(gsz.geom().scrollY) + ', zoom ' + gsz.geom().zoom.toFixed(2));
var gsc = gsApp();
gsPair(gsc, 30, function (i) { return i <= 12 ? [300, 600 - i * 10] : [300 + (i - 12) * 8, 480]; },
                function (i) { return i <= 12 ? [800, 600 - i * 10] : [800 - (i - 12) * 8, 480]; }, 28);
check('...and closing them zooms out', gsc.geom().zoom < 0.9, 'zoom ' + gsc.geom().zoom.toFixed(2));

/* writing along the line with the hand gliding with the pen: the palm sits
   115-309px below the nib in the recordings, 180 here */
var gw = gsApp(), gw0 = gw.strokes().length;
gsPair(gw, 20, function (i) { return [300 + i * 5, 520 + 9 * Math.sin(i / 2)]; },
               function (i) { return [520 + i * 5, 700]; }, 40);
check('Glove mode: a pen writing with the palm gliding below it still writes',
      gw.strokes().length === gw0 + 1 && gw.geom().scrollY === 0 && gw.geom().scrollX === 0,
      gw0 + ' -> ' + gw.strokes().length + ' strokes, scroll ' +
      Math.round(gw.geom().scrollX) + ',' + Math.round(gw.geom().scrollY));
/* ...and with the side of the hand level beside a pen forming letters */
var gv = gsApp(), gv0 = gv.strokes().length;
gsPair(gv, 20, function (i) { return [300 + i * 5, 640 + 20 * Math.sin(i / 1.5)]; },
               function (i) { return [520 + i * 5, 700]; }, 40);
check('...and with the side of the hand level with a pen forming letters',
      gv.strokes().length === gv0 + 1 && gv.geom().scrollX === 0,
      gv0 + ' -> ' + gv.strokes().length + ' strokes, scrollX ' + Math.round(gv.geom().scrollX));

/* a letter that starts downward, beside a palm creeping down as it settles */
var gl = gsApp(), gl0 = gl.strokes().length;
gsPair(gl, 20, function (i) { return [300 + 8 * Math.sin(i / 2), 600 + 1.5 * i + 8 * Math.cos(i / 2) - 8]; },
               function (i) { return [520, 660 + Math.min(i, 30) * 0.6]; }, 45);
check('...and so does a letter starting downward beside a settling palm',
      gl.strokes().length === gl0 + 1 && gl.geom().scrollY === 0,
      gl0 + ' -> ' + gl.strokes().length + ' strokes, scrollY ' + Math.round(gl.geom().scrollY));

var gp = gsApp();
gsPair(gp, 30, function (i) { return [450, 500 - i * 5]; },
               function (i) { return [450, 560 + i * 5]; }, 20);
check('Glove mode: spreading two fingers still zooms', gp.geom().zoom > 1.1,
      'zoom ' + gp.geom().zoom.toFixed(2));

/* 28 recorded attempts with the thumbs at opposite edges, 457-893px apart,
   and not one of them zoomed: the "too wide" rule, meant for a pen and a
   palm, was applied without checking that the palm was the one not moving */
var gw2 = gsApp();
gsPair(gw2, 20, function (i) { return [180 - i * 4, 420]; },
                function (i) { return [880 + i * 4, 440]; }, 20);
check('Glove mode: thumbs at opposite edges zoom too', gw2.geom().zoom > 1.1,
      'zoom ' + gw2.geom().zoom.toFixed(2));
var gw3 = gsApp();
gsPair(gw3, 20, function (i) { return [300 + i * 6, 420 + 4 * Math.sin(i)]; },
                function (i) { return [900, 640]; }, 20);
check('...but a pen writing beside a still contact far away does not',
      Math.abs(gw3.geom().zoom - 1) < 0.01, 'zoom ' + gw3.geom().zoom.toFixed(2));

/* ---------- zoom that does not shake ----------
 * Recorded: one 9.8 second zoom reversed direction 375 times in 720
 * updates - the page shaking in and out - and sat at the 60% floor
 * pumping 0.603, 0.620, 0.603, 0.614... */
function zoomTrail(a, pa, pb, frames) {
  var zs = [], i;
  a.down(1, pa(0)[0], pa(0)[1]); a.tick(20); a.down(2, pb(0)[0], pb(0)[1]);
  for (i = 1; i <= frames; i++) {
    a.tick(16); a.moveTo(1, pa(i)[0], pa(i)[1]); a.moveTo(2, pb(i)[0], pb(i)[1]);
    a.flushFrames(); zs.push(a.geom().zoom);
  }
  a.tick(16); a.up(1); a.up(2); a.tick(300); a.flushFrames();
  return zs;
}
function reversals(zs) {
  var rev = 0, dir = 0, prev = zs[0], k, dz, nd;
  for (k = 1; k < zs.length; k++) {
    dz = zs[k] - prev;
    if (Math.abs(dz) < 0.002) continue;
    nd = dz > 0 ? 1 : -1;
    if (dir && nd !== dir) rev++;
    dir = nd; prev = zs[k];
  }
  return rev;
}
/* a spread, then the fingers carry on moving together with their gap
   wobbling a few pixels, as real fingers do */
var zw1 = gsApp();
var zw1z = zoomTrail(zw1,
  function (i) { return i < 10 ? [400 - i * 6, 420] : [340 - (i - 10) * 3, 420 + (i - 10) * 6 + 4 * Math.sin(i * 1.7)]; },
  function (i) { return i < 10 ? [520 + i * 6, 420] : [580 - (i - 10) * 3, 420 + (i - 10) * 6 - 4 * Math.sin(i * 1.3)]; }, 40);
check('a zoom whose fingers wobble does not shake the page',
      reversals(zw1z) <= 1 && zw1.geom().zoom > 1.1,
      reversals(zw1z) + ' reversals, zoom ' + zw1.geom().zoom.toFixed(2));

/* pinched far past the 60% floor, then wobbling: it stays put... */
var zf = gsApp(), zfz = zoomTrail(zf,
  function (i) { return i < 15 ? [200 + i * 18, 420] : [470 + 3 * Math.sin(i), 420]; },
  function (i) { return i < 15 ? [800 - i * 18, 420] : [530 - 3 * Math.sin(i * 1.3), 420]; }, 40);
check('at the 60% limit, wobbling fingers do not pump the zoom',
      reversals(zfz.slice(15)) === 0 && Math.abs(zf.geom().zoom - 0.6) < 0.01,
      reversals(zfz.slice(15)) + ' reversals, zoom ' + zf.geom().zoom.toFixed(2));
/* ...but the first real spread back zooms in at once */
var zb = gsApp(), zbz = zoomTrail(zb,
  function (i) { return i < 15 ? [200 + i * 18, 420] : [470 - (i - 15) * 4, 420]; },
  function (i) { return i < 15 ? [800 - i * 18, 420] : [530 + (i - 15) * 4, 420]; }, 25);
check('...and spreading back from the limit zooms in straight away',
      zbz[14] < 0.61 && zb.geom().zoom > 0.66, 'at the limit ' + zbz[14].toFixed(2) +
      ', after 10 frames of spreading ' + zb.geom().zoom.toFixed(2));

/* and the recording itself, replayed with the screen redrawing each frame */
(function () {
  var fs = require('fs'), p = require('path').join(__dirname, '..', 'traces', 'live-20260926-150201.json');
  if (!fs.existsSync(p)) { console.log('  --   live-20260926-150201 missing, skipped'); return; }
  var t = JSON.parse(fs.readFileSync(p, 'utf8'));
  var a = H.load({ quiet: true, dpr: 2, viewW: t.viewW, viewH: t.viewH,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'R', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'R', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: t.palmLevel, hand: 0 } }) } });
  a.flushFrames();
  var lastT = 0, next = 16.7, zs = [], i, r;
  for (i = 0; i < t.samples.length; i++) {
    r = t.samples[i];
    if (typeof r[0] !== 'number') continue;
    while (next <= r[4]) { a.tick(next - lastT); lastT = next; next += 16.7; a.flushFrames(); zs.push(a.geom().zoom); }
    if (r[4] > lastT) { a.tick(r[4] - lastT); lastT = r[4]; }
    if (r[0] === 0) a.down(r[1], r[2], r[3]); else if (r[0] === 1) a.moveTo(r[1], r[2], r[3]); else a.up(r[1], r[0] === 3);
  }
  check('the recorded shaking zoom replays without shaking (was 159 reversals)',
        reversals(zs) <= 8, reversals(zs) + ' reversals');
})();

/* ---------- infinite page: it keeps going sideways too ---------- */
function infApp() {
  var a = gsApp();
  a.clickMenu('Page type');
  a.flushFrames();
  return a;
}
var il = infApp();
gsPair(il, 20, function (i) { return [300 + i * 14, 420]; },
               function (i) { return [520 + i * 14, 430]; }, 20);
check('Infinite page: two fingers carry it left of where the page began',
      il.geom().scrollX < -150, 'scrollX ' + Math.round(il.geom().scrollX));
var ir = infApp();
gsPair(ir, 20, function (i) { return [700 - i * 14, 420]; },
               function (i) { return [900 - i * 14, 430]; }, 20);
check('...and right, past where the page used to end',
      ir.geom().scrollX > 150, 'scrollX ' + Math.round(ir.geom().scrollX));
var irW = ir.geom().docW;
scPath(ir, 9, [[850, 500], [900, 520], [950, 505], [1000, 525]]);
check('...and writing out at the right edge makes room for more',
      ir.geom().docW > irW, irW + ' -> ' + ir.geom().docW);
check('...and the page type says Infinite', ir.clickMenu('Infinite'));

var ip = gsApp();
gsPair(ip, 20, function (i) { return [700 - i * 14, 420]; },
               function (i) { return [900 - i * 14, 430]; }, 20);
check('on pages, sideways stops at the page edge', ip.geom().scrollX === 0,
      'scrollX ' + Math.round(ip.geom().scrollX));

/* a straight line drawn with the palm gliding along below the pen */
var iw = infApp(), iw0 = iw.strokes().length;
gsPair(iw, 20, function (i) { return [200 + i * 12, 420]; },
               function (i) { return [320 + i * 12, 640]; }, 25);
check('a pen with the palm below it, both moving sideways, still writes',
      iw.strokes().length === iw0 + 1 && iw.geom().scrollX === 0,
      iw0 + ' -> ' + iw.strokes().length + ' strokes, scrollX ' + Math.round(iw.geom().scrollX));

/* ---------- scrolling and zooming with the other tools ----------
 * The hand tool threw on every move (a path it does not have), so it could
 * not scroll; and with the lasso, eraser or text tool the gesture engine
 * never ran, so the page could not be moved without changing tools. */

function toolApp(btn) {
  var a = gsApp();
  a.els[btn]._fire('click', {});
  return a;
}
var th = toolApp('handBtn');
th.down(1, 450, 600);
for (var thi = 1; thi <= 20; thi++) { th.tick(16); th.moveTo(1, 450, 600 - thi * 12); th.flushFrames(); }
th.tick(16); th.up(1); th.tick(300); th.flushFrames();
check('the hand tool drags the page again', th.geom().scrollY > 150,
      'scrollY ' + Math.round(th.geom().scrollY));

var tz = toolApp('handBtn');
gsPair(tz, 20, function (i) { return [450 - i * 6, 420]; },
               function (i) { return [560 + i * 6, 420]; }, 20);
check('...and two fingers spread with it zoom', tz.geom().zoom > 1.1, 'zoom ' + tz.geom().zoom.toFixed(2));

var ls = toolApp('selectBtn'), ls0 = ls.strokes().length;
gsPair(ls, 25, function (i) { return [400, 600 - i * 14]; },
               function (i) { return [520, 600 - i * 14]; }, 20);
check('lasso tool: two fingers scroll the page', ls.geom().scrollY > 150 &&
      Math.abs(ls.geom().zoom - 1) < 0.01, 'scrollY ' + Math.round(ls.geom().scrollY) +
      ', zoom ' + ls.geom().zoom.toFixed(2));
var lz = toolApp('selectBtn');
gsPair(lz, 25, function (i) { return [450 - i * 6, 420]; },
               function (i) { return [560 + i * 6, 420]; }, 20);
check('lasso tool: two fingers spreading zoom', lz.geom().zoom > 1.1, 'zoom ' + lz.geom().zoom.toFixed(2));
lassoAround(lz, 10, 110, 1010, 760);
check('...and one finger still draws a lasso', lz.els.selBar.style.display === 'block',
      'selection bar ' + lz.els.selBar.style.display);

var le = toolApp('eraserBtn'), le0 = le.strokes().length;
gsPair(le, 25, function (i) { return [240, 600 - i * 14]; },
               function (i) { return [330, 600 - i * 14]; }, 20);
check('eraser tool: two fingers scroll, and rub nothing out',
      le.geom().scrollY > 150 && le.strokes().length === le0,
      'scrollY ' + Math.round(le.geom().scrollY) + ', ' + (le0 - le.strokes().length) + ' erased');

/* ---------- pen wheel (Samsung's "pens in pop-up view") ----------
 * Pens on the inner ring, six widths in the middle, colours on the rim:
 * children 0-4, 5-10, 11-21, then the all-colours button. */

var pw = scApp();
pw.els.pwBubble._fire('click', {});
check('the pen wheel opens from its bubble at the page edge',
      /open/.test(pw.els.penWheel.className), pw.els.penWheel.className);
check('...with every pen, six widths and the colours on it',
      pw.els.pwDisc.children.length === 5 + 6 + 11 + 1,
      pw.els.pwDisc.children.length + ' items');
pw.els.pwDisc.children[13]._fire('click', {});           /* red */
pw.els.pwDisc.children[10]._fire('click', {});           /* thickest */
check('a colour and a width are one tap each, and the wheel stays open for both',
      pw.pen().color === '#E2231A' && pw.pen().w === 5 && /open/.test(pw.els.penWheel.className),
      pw.pen().color + ' width ' + pw.pen().w + ' ' + pw.els.penWheel.className);
var pw0 = pw.strokes().length;
scPath(pw, 5, [[300, 500], [340, 520], [380, 505], [420, 530]]);
check('writing closes the wheel and the stroke still lands, in the new colour',
      !/open/.test(pw.els.penWheel.className) && pw.strokes().length === pw0 + 1 &&
      pw.strokes()[pw0].color === '#E2231A',
      pw.els.penWheel.className + ', ' + pw.strokes().length + ' strokes');

pw.els.pwBubble._fire('click', {});
var pwT = pw.strokes().length;
pw.down(6, 600, 400); pw.tick(80); pw.up(6); pw.tick(500); pw.flushFrames();
check('a tap on the page just closes the wheel - no dot to undo',
      !/open/.test(pw.els.penWheel.className) && pw.strokes().length === pwT,
      pw.strokes().length - pwT + ' dots left');

pw.els.pwBubble._fire('click', {});
pw.els.pwDisc.children[3]._fire('click', {});
check('a pen type from the wheel', pw.pen().pen === 3, 'pen ' + pw.pen().pen);

check('the wheel sits on the side away from a left hand', /right/.test(scApp({ hand: 1 }).els.penWheel.className));

/* ---------- copy, cut and paste ---------- */
function lassoAround(a, x0, y0, x1, y1) {
  a.els.selectBtn._fire('click', {});
  scPath(a, 40, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 + 4]]);
}
function lassoTap(a, x, y) {
  a.els.selectBtn._fire('click', {});
  a.down(41, x, y); a.tick(60); a.up(41); a.tick(100); a.flushFrames();
}
function lowestY(list) {
  var lo = 1e9;
  list.forEach(function (s) { s.pts.forEach(function (p) { if (p[1] < lo) lo = p[1]; }); });
  return lo;
}

var cp = scApp();
scPath(cp, 1, scWord(300, 400));
scPath(cp, 2, scWord(300, 460));
lassoAround(cp, 280, 370, 470, 490);
check('a lasso round the writing selects it', cp.els.selBar.style.display === 'block',
      'selection bar ' + cp.els.selBar.style.display);
cp.els.selClipBtn._fire('click', {});
check('Copy leaves the page as it was', cp.strokes().length === 2);
cp.els.backBtn._fire('click', {});
cp.els.fabNew._fire('click', {});
cp.flushFrames();
lassoTap(cp, 500, 600);
check('in another note, a lasso tap offers Paste there', cp.els.pasteBar.style.display === 'block',
      'paste button ' + cp.els.pasteBar.style.display);
cp.els.pasteBtn._fire('click', {});
check('Paste puts the copy in the other note', cp.strokes().length === 2,
      cp.strokes().length + ' strokes');
check('...centred where the lasso tapped', Math.abs(lowestY(cp.strokes()) - (600 - 56 - 60)) < 40,
      'top of the pasted ink at ' + Math.round(lowestY(cp.strokes())));
check('...and selected, ready to drag into place', cp.els.selBar.style.display === 'block');
cp.undo();
check('one Undo takes the paste back', cp.strokes().length === 0, cp.strokes().length + ' strokes');

var ct = scApp();
scPath(ct, 1, scWord(300, 400));
lassoAround(ct, 280, 370, 470, 430);
ct.els.selCutBtn._fire('click', {});
check('Cut takes it off the page', ct.strokes().length === 0, ct.strokes().length + ' strokes');
lassoTap(ct, 400, 650);
ct.els.pasteBtn._fire('click', {});
check('...and Paste puts it down somewhere else', ct.strokes().length === 1 &&
      lowestY(ct.strokes()) > 400, ct.strokes().length + ' strokes, top ' + Math.round(lowestY(ct.strokes())));

/* a duplicated photo used to come out as an empty box: the copy left the picture behind */
var ph = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
  seed: { mathnotes_v4: JSON.stringify({ v: 4,
    notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [
      { id: 'img1', pen: 6, w: 1, color: '#000000', a: 1, ord: 1, pts: [[300, 300, 0]],
        src: 'data:image/png;base64,iVBORw0KGgo=', iw: 120, ih: 90 }] } },
    cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
ph.flushFrames();
lassoAround(ph, 330, 330, 500, 480);
ph.els.selCopyBtn._fire('click', {});
var phs = ph.strokes();
check('a duplicated photo keeps its picture', phs.length === 2 && phs[1].src === phs[0].src,
      phs.length + ' items, copy src ' + (phs[1] && String(phs[1].src).slice(0, 20)));

console.log(String.fromCharCode(10) + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
