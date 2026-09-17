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

var pg = fresh();
write(pg, 1);
var y0 = strokeTop(pg.strokes()[0]);
pg.answer('+').clickMenu('Pages');
var y1 = strokeTop(pg.strokes()[0]);
check('inserting a page pushes the marks down', y1 > y0 + 900, y0 + ' -> ' + y1);
check('...without losing any', pg.strokes().length === 1);
pg.els.undoBtn._fire('click', {});
check('one undo puts them back', Math.abs(strokeTop(pg.strokes()[0]) - y0) < 1,
      String(strokeTop(pg.strokes()[0])));

var pd = fresh();
write(pd, 1);
pd.confirmAll(true).answer('-').clickMenu('Pages');
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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
