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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
