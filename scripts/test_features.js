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

/* ---------- three-finger tap = redo ---------- */
var r1 = fresh();
write(r1, 1); write(r1, 2);
var r1n = r1.strokes().length;
r1.twoFingerTap(300, 500, 480, 520);
check('the undo before it: two strokes written, one undone',
      r1.strokes().length === r1n - 1, r1.strokes().length + ' strokes');
r1.threeFingerTap(300, 500, 480, 520, 660, 540);
check('a three-finger tap redoes what the two-finger tap undid',
      r1.strokes().length === r1n, r1.strokes().length + ' strokes');

var r2 = fresh();
write(r2, 1); write(r2, 2);
r2.twoFingerTap(300, 500, 480, 520);
var r2n = r2.strokes().length;
r2.threeFingerTap(300, 500, 480, 520, 660, 540, 40);   /* fingers drift */
check('three fingers that moved are a drag, not a tap - no redo',
      r2.strokes().length === r2n, r2.strokes().length + ' strokes');

var r3 = fresh();
write(r3, 1);
r3.threeFingerTap(300, 500, 480, 520, 660, 540);
check('a three-finger tap with nothing to redo is harmless',
      r3.strokes().length === 1, r3.strokes().length + ' strokes');
check('...and it does not undo either', r3.strokes().length === 1,
      r3.strokes().length + ' strokes');

var r4 = fresh();
write(r4, 1); write(r4, 2); write(r4, 3);
r4.threeFingerTap(300, 500, 480, 520, 660, 540);
check('a three-finger tap with an empty redo stack leaves the ink alone',
      r4.strokes().length === 3, r4.strokes().length + ' strokes');

/* ---------- reading mode: look, but do not write ---------- */
var d1 = fresh();
write(d1, 11);
var d1n = d1.strokes().length;
check('the Reading mode row is in the menu', d1.clickMenu('Reading mode'));
check('reading mode is on', d1.pen().reading === true, 'reading ' + d1.pen().reading);
check('the hand takes the tool, because scrolling is all that is left',
      d1.pen().tool === 'hand', 'tool ' + d1.pen().tool);

d1.stroke({ id: 19, x0: 250, y0: 520, x1: 430, y1: 560, speed: 0.3, wobble: 3 });
d1.tick(120);
check('dragging the pen now marks nothing', d1.strokes().length === d1n,
      d1.strokes().length + ' strokes');

d1.els.selectBtn._fire('click', {});
check('the tool buttons will not take you off the hand', d1.pen().tool === 'hand',
      'tool ' + d1.pen().tool);
d1.els.penBtn._fire('click', {});
check('and the pen panel stays shut', d1.pen().palette !== 'block',
      'palette ' + d1.pen().palette);
check('the rows that would change the note are not offered',
      d1.clickMenu('Clear note') === false);
check('nor is the page type', d1.clickMenu('Page type') === false);

var d2 = fresh();
write(d2, 21); write(d2, 22);
d2.twoFingerTap(300, 500, 480, 520);   /* undo, leaving one to redo */
var d2n = d2.strokes().length;
d2.clickMenu('Reading mode');
d2.twoFingerTap(300, 500, 480, 520);
check('a two-finger tap does not undo while reading', d2.strokes().length === d2n,
      d2.strokes().length + ' strokes');
d2.threeFingerTap(300, 500, 480, 520, 660, 540);
check('...and a three-finger tap does not redo either', d2.strokes().length === d2n,
      d2.strokes().length + ' strokes');

var d3 = fresh();
var d3h = d3.geom().docH;
d3.clickMenu('Reading mode');
d3.els.pagesInsertBtn._fire('click', {});
check('a reader cannot add a page', d3.geom().docH === d3h, 'docH ' + d3.geom().docH);
write(d3, 31);
var d3n = d3.strokes().length;
d3.els.pagesDeleteBtn._fire('click', {});
check('...nor take one away', d3.strokes().length === d3n,
      d3.strokes().length + ' strokes');

check('the Reading mode row is the way out', d2.clickMenu('Reading mode'));
check('reading mode is off', d2.pen().reading === false, 'reading ' + d2.pen().reading);
check('the pen comes back to the hand', d2.pen().tool === 'pen', 'tool ' + d2.pen().tool);
write(d2, 23);
check('and writing lands again', d2.strokes().length === d2n + 1,
      d2.strokes().length + ' strokes');

/* ---------- page strip: the note as a column of pages down the side ---------- */
var s1 = fresh();
write(s1, 40);
s1.clickMenu('Pages');
s1.els.pagesInsertBtn._fire('click', {});      /* two pages, the marks pushed down */
s1.flushFrames();
var sp0 = s1.pages();
check('the note has pages to show', sp0.total >= 2, sp0.total + ' pages');
s1.els.stripTab._fire('click', {});
var sp1 = s1.pages();
check('the tab opens the page strip', sp1.strip === true, 'strip ' + sp1.strip);
check('the canvas slides aside to make room for it', sp1.left === '112px',
      'left ' + sp1.left);
check('a thumbnail per page is listed', sp1.cells === sp1.total,
      sp1.cells + ' cells / ' + sp1.total + ' pages');
check('the tab is out of the way while the strip is up', sp1.tab === 'none',
      'tab ' + sp1.tab);
check('the page you are on is the one marked',
      s1.els.stripList.children[sp1.cur - 1].className.indexOf('cur') >= 0,
      'cell ' + (sp1.cur - 1) + ' of ' + sp1.cells);

s1.els.stripList.children[1]._fire('click', {});
s1.flushFrames();
check('tapping a thumbnail takes you to that page', s1.pages().cur === 2,
      'page ' + s1.pages().cur);
check('...and the mark follows you there',
      s1.els.stripList.children[1].className.indexOf('cur') >= 0,
      s1.els.stripList.children[1].className);
check('...while the page you left gives the mark up',
      s1.els.stripList.children[0].className.indexOf('cur') < 0,
      s1.els.stripList.children[0].className);

var thumbBefore = s1.els.stripList.children[0].children[0];
write(s1, 41);
s1.flushFrames();
check('the thumbnails are drawn again once the ink changes',
      s1.els.stripList.children[0].children[0] !== thumbBefore, 'same thumbnail');

s1.els.stripClose._fire('click', {});
var sp2 = s1.pages();
check('the close button gives the paper its width back',
      sp2.strip === false && sp2.left === '', 'strip ' + sp2.strip + ' left "' + sp2.left + '"');
check('...and the tab comes back', sp2.tab === '', 'tab "' + sp2.tab + '"');

var s2 = fresh();
s2.clickMenu('Page type');                     /* infinite now */
s2.flushFrames();
check('the tab is hidden where there are no pages', s2.pages().tab === 'none',
      'tab "' + s2.pages().tab + '"');
s2.els.stripTab._fire('click', {});
check('an infinite note has no page strip to offer', s2.pages().strip === false,
      'strip ' + s2.pages().strip);

/* ---------- pulling past the end brings a new page ---------- */
var q1 = fresh();
write(q1, 50);
var q1tot = q1.pages().total;
q1.els.handBtn._fire('click', {});
q1.down(1, 384, 760); q1.tick(20);
q1.moveTo(1, 384, 755); q1.tick(20); q1.flushFrames();   /* first move only takes the grip */
q1.moveTo(1, 384, 615); q1.tick(20); q1.flushFrames();   /* up to the end of the sheet */
q1.moveTo(1, 384, 455); q1.tick(20); q1.flushFrames();   /* and past it */
var q1pull = q1.pages().pull;
check('the end of the sheet stretches as the hand drags past it',
      q1pull >= 78, 'pull ' + Math.round(q1pull));
q1.up(1); q1.flushFrames();
check('letting go past the mark adds a page', q1.pages().total === q1tot + 1,
      q1.pages().total + ' pages, was ' + q1tot);
check('the page it was given is remembered', q1.pages().minPages === q1tot + 1,
      'minPages ' + q1.pages().minPages);
check('...and no ink was moved to make room for it', q1.strokes().length === 1,
      q1.strokes().length + ' strokes');
q1.undo(); q1.flushFrames();
check('one undo takes the pulled page away', q1.pages().total === q1tot,
      q1.pages().total + ' pages');

var q2 = fresh();
var q2tot = q2.pages().total;
q2.els.handBtn._fire('click', {});
q2.down(1, 384, 700); q2.tick(20);
q2.moveTo(1, 384, 690); q2.tick(20); q2.flushFrames();
q2.moveTo(1, 384, 590); q2.tick(20); q2.flushFrames();
q2.moveTo(1, 384, 540); q2.tick(20); q2.flushFrames();
var q2pull = q2.pages().pull;
check('a shorter pull still stretches the end', q2pull > 0 && q2pull < 78,
      'pull ' + Math.round(q2pull));
q2.up(1); q2.tick(200); q2.flushFrames();
check('letting go early puts the sheet back', q2.pages().pull === 0,
      'pull ' + q2.pages().pull);
check('...and no page is made', q2.pages().total === q2tot,
      q2.pages().total + ' pages');

/* the lift is the whole sheet rising: the scroll sits past the edge by the
   pull, so the gap the circle shows is real desk, not a disc past the page */
var q4 = fresh();
write(q4, 51);
q4.els.handBtn._fire('click', {});
q4.down(1, 384, 700); q4.tick(20);
q4.moveTo(1, 384, 690); q4.tick(20); q4.flushFrames();   /* first move only takes the grip */
q4.moveTo(1, 384, 540); q4.tick(20); q4.flushFrames();   /* up to the end and a little past */
var q4pull = q4.pages().pull;
check('a small pull lifts the sheet without arming it',
      q4pull > 0 && q4pull < 78, 'pull ' + Math.round(q4pull));
q4.up(1); q4.tick(200); q4.flushFrames();
check('released, the lift settles back onto the desk',
      q4.pages().pull === 0 && q4.pages().total === 1,
      'pull ' + q4.pages().pull + ', ' + q4.pages().total + ' pages');

/* the page is made where the pull left the view, and the view stays there:
   gliding on down to the new page took the user somewhere they had not
   asked to go */
var q5 = fresh();
write(q5, 52);
q5.els.handBtn._fire('click', {});
q5.down(1, 384, 760); q5.tick(20);
q5.moveTo(1, 384, 755); q5.tick(20); q5.flushFrames();
q5.moveTo(1, 384, 455); q5.tick(20); q5.flushFrames();
var q5tot = q5.pages().total;
q5.up(1); q5.flushFrames();
check('letting go past the mark makes the page at once',
      q5.pages().total === q5tot + 1, q5.pages().total + ' pages');
var q5y = q5.pages().y;
q5.tick(300); q5.flushFrames();
check('...and the view stays where the pull left it',
      Math.abs(q5.pages().y - q5y) < 1, 'y ' + q5y + ' -> ' + q5.pages().y);

/* the pull-back fix: pull past the mark, then pull back down and let go.
   The lift falls back and NO page is made - releasing on the way down is
   not the same as releasing at the top. */
var q6 = fresh();
write(q6, 53);
q6.els.handBtn._fire('click', {});
q6.down(1, 384, 700); q6.tick(20);
q6.moveTo(1, 384, 690); q6.tick(20); q6.flushFrames();   /* first move only takes the grip */
q6.moveTo(1, 384, 455); q6.tick(20); q6.flushFrames();   /* up past the mark */
var q6pull = q6.pages().pull;
check('a long pull lifts the sheet past the mark', q6pull >= 85, 'pull ' + Math.round(q6pull));
q6.moveTo(1, 384, 640); q6.tick(20); q6.flushFrames();   /* back down */
check('pulling back down lets the lift fall',
      q6.pages().pull < q6pull, q6pull + ' -> ' + Math.round(q6.pages().pull));
q6.up(1); q6.tick(200); q6.flushFrames();
check('...and releasing on the way down makes no page',
      q6.pages().pull === 0 && q6.pages().total === 1,
      'pull ' + q6.pages().pull + ', ' + q6.pages().total + ' pages');

var q3 = fresh();
q3.clickMenu('Page type');                    /* infinite: no end to pull past */
q3.flushFrames();
q3.els.handBtn._fire('click', {});
q3.down(1, 384, 760); q3.tick(20);
q3.moveTo(1, 384, 755); q3.tick(20); q3.flushFrames();
q3.moveTo(1, 384, 455); q3.tick(20); q3.flushFrames();
q3.up(1); q3.flushFrames();
check('an infinite note never stretches', q3.pages().pull === 0 && q3.pages().total === 1,
      'pull ' + q3.pages().pull + ', ' + q3.pages().total + ' pages');

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
nbBtn._fire('click', {}); fd.dlg('Physics');
nbBtn._fire('click', {}); fd.dlg('Term 1');
var nbs0 = fd.state().notebooks;
check('new notebooks are created', nbs0.length >= 3, nbs0.length + ' notebooks');

fd.nb().move();                           /* the open one, Term 1 ... */
fd.dlgPick(nbs0[0].title);                /* ...into the first */
var nbs = fd.state().notebooks;
var nested = 0, q;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) nested++; }
check('a notebook can be nested inside another', nested === 1, nested + ' nested');

/* a folder must never become its own ancestor: moving the parent, its
   own child is not even offered */
var childIdx = -1, parentIdx = -1;
for (q = 0; q < nbs.length; q++) { if (nbs[q].parent) childIdx = q; }
for (q = 0; q < nbs.length; q++) { if (childIdx >= 0 && nbs[q].id === nbs[childIdx].parent) parentIdx = q; }
fd.nb().move(parentIdx);
var offered = fd.dlgPick(nbs[childIdx].title);
if (!offered) fd.els.dlgCancel._fire('click', {});
var after = fd.state().notebooks, loops = offered ? 1 : 0;
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
/* A full page made writing in the strip crawl: every frame drew every
   stroke near the box again, magnified (reported "the slowest"). The ink
   already there is a picture now; a frame draws only what is being written. */
function zwFull() {
  var list = [], r, q, k, pts;
  for (r = 0; r < 12; r++) for (q = 0; q < 14; q++) {
    pts = [];
    for (k = 0; k < 12; k++) pts.push([30 + q * 50 + k * 2, 90 + r * 32 + 8 * Math.sin(k), k * 8]);
    list.push({ id: 'f' + r + '_' + q, pen: 0, w: 2, color: '#000000', a: 1, ord: r * 14 + q + 1, pts: pts });
  }
  var a = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 826,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: list } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  a.clickMenu('Zoom window');
  a.flushFrames();
  return a;
}
var zf = zwFull(), zfg = zf.zw(), zfc = zf.els.noteCanvas._ctx.__n, zfL, zfC;
zfL = zfc.save || 0;               /* every stroke drawn is one save() */
zf.down(40, 100, zfg.top + 120 + WRAPTOP);
zf.tick(16); zf.moveTo(40, 130, zfg.top + 124 + WRAPTOP); zf.flushFrames();
zfL = (zfc.save || 0) - zfL;
check('the pen landing in the strip draws a few strokes, not every stroke near the box',
      zfL > 0 && zfL < 12, zfL + ' strokes drawn, the page holds 168');
zfC = zfc.clip || 0;
zf.tick(16); zf.moveTo(40, 160, zfg.top + 128 + WRAPTOP); zf.flushFrames();
check('...and the writing shows in the strip as the pen moves, not only once it lifts',
      (zfc.clip || 0) - zfC >= 1, ((zfc.clip || 0) - zfC) + ' drawn into the strip');
zf.up(40); zf.tick(200); zf.flushFrames();
var zfN = zf.strokes().length;
check('...and the stroke written lands on the page as before', zfN === 169, zfN + ' strokes');

/* the zoom in the corner sits above the strip, not under it */
check('the zoom readout moves up above the strip while it is open',
      za.els.zoomCtl.style.bottom === (12 + (826 - zg.top)) + 'px', za.els.zoomCtl.style.bottom + ', strip ' + (826 - zg.top));
var zz = zwApp(), zcz0 = zz.geom().zoom;      /* a fresh one: the test clock is shared between apps */
zz.els.zoomIn._fire('click', {}); zz.tick(200); zz.flushFrames();
check('...and + still zooms the page with the zoom window open', zz.geom().zoom > zcz0 + 0.2,
      zcz0.toFixed(2) + ' -> ' + zz.geom().zoom.toFixed(2));

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

/* ---------- the zoom in the corner ----------
 * Asked for: always see how far the page is zoomed, and change it there
 * with - and + rather than only by pinching. */
function zcPress(a, id) { a.els[id]._fire('click', {}); a.tick(220); a.flushFrames(); }
var zk = scApp();
check('the corner shows the zoom, 100% to begin with', zk.els.zoomPct.textContent === '100%', zk.els.zoomPct.textContent);
var zkMid = { x: zk.geom().scrollX + 1024 / 2, y: zk.geom().scrollY + 712 / 2 };
zcPress(zk, 'zoomIn');
var zkG = zk.geom();
check('+ zooms in a step, and the corner says so', Math.abs(zkG.zoom - 1.25) < 0.001 && zk.els.zoomPct.textContent === '125%',
      zkG.zoom.toFixed(3) + ', ' + zk.els.zoomPct.textContent);
check('...round the middle of the screen, not its corner',
      Math.abs(zkG.scrollX + 1024 / 2 / zkG.zoom - zkMid.x) < 2 && Math.abs(zkG.scrollY + 712 / 2 / zkG.zoom - zkMid.y) < 2,
      'middle at ' + Math.round(zkG.scrollX + 1024 / 2 / zkG.zoom) + ',' + Math.round(zkG.scrollY + 712 / 2 / zkG.zoom));
zcPress(zk, 'zoomOut'); zcPress(zk, 'zoomOut');
check('- steps back out, past 100%', Math.abs(zk.geom().zoom - 0.75) < 0.001 && zk.els.zoomPct.textContent === '75%',
      zk.geom().zoom.toFixed(3) + ', ' + zk.els.zoomPct.textContent);
zcPress(zk, 'zoomOut'); zcPress(zk, 'zoomOut');
check('...and stops at the furthest out the page goes', Math.abs(zk.geom().zoom - 0.6) < 0.001, zk.geom().zoom.toFixed(3));
zcPress(zk, 'zoomPct');
check('tapping the number puts it back to 100%', Math.abs(zk.geom().zoom - 1) < 0.001 && zk.els.zoomPct.textContent === '100%',
      zk.geom().zoom.toFixed(3) + ', ' + zk.els.zoomPct.textContent);
var zp = scApp();
gsPair(zp, 20, function (i) { return [450 - i * 6, 420]; }, function (i) { return [560 + i * 6, 420]; }, 20);
check('a pinch shows in the corner too', zp.els.zoomPct.textContent === Math.round(zp.geom().zoom * 100) + '%' && zp.geom().zoom > 1.1,
      zp.els.zoomPct.textContent + ' at zoom ' + zp.geom().zoom.toFixed(2));

/* two fingers on the page above the strip zoom and scroll it, as anywhere
   else - they only aimed the box, so the page could not be zoomed with the
   zoom window up (reported) */
var zg1 = zwApp(), zg1b = zg1.zw();
gsPair(zg1, 40, function (i) { return [330 - i * 6, 260 + WRAPTOP]; }, function (i) { return [440 + i * 6, 260 + WRAPTOP]; }, 20);
check('with the zoom window open, spreading two fingers on the page zooms it', zg1.geom().zoom > 1.15,
      'zoom ' + zg1.geom().zoom.toFixed(2));
check('...and does not throw the box at where the fingers were', Math.abs(zg1.zw().x - zg1b.x) < 1 && Math.abs(zg1.zw().y - zg1b.y) < 1,
      Math.round(zg1b.x) + ',' + Math.round(zg1b.y) + ' -> ' + Math.round(zg1.zw().x) + ',' + Math.round(zg1.zw().y));
var zg2 = zwApp();
zg2.els.zoomIn._fire('click', {}); zg2.tick(250); zg2.flushFrames();    /* room to scroll across */
var zg2x = zg2.geom().scrollX;
gsPair(zg2, 40, function (i) { return [380 - i * 10, 250 + WRAPTOP]; }, function (i) { return [480 - i * 10, 250 + WRAPTOP]; }, 18);
check('...and two fingers moving together scroll it', zg2.geom().scrollX > zg2x + 60,
      'scrollX ' + Math.round(zg2x) + ' -> ' + Math.round(zg2.geom().scrollX));

/* Samsung's pad: arrows on the strip, a new line, and the end of the line */
function zwPress(a, id) { a.els[id]._fire('click', {}); a.tick(300); a.flushFrames(); }
var zd = zwApp(), zd0 = zd.zw();
zwPress(zd, 'zwNext');
var zd1 = zd.zw();
check('the forward arrow glides the box on along the line',
      zd1.x > zd0.x + 50 && Math.abs(zd1.y - zd0.y) < 1, Math.round(zd0.x) + ' -> ' + Math.round(zd1.x));
zwPress(zd, 'zwBack');
check('...and the back arrow brings it back', Math.abs(zd.zw().x - zd0.x) < 1, Math.round(zd.zw().x));
zwPress(zd, 'zwLine');
var zd2 = zd.zw();
check('the new-line arrow goes one ruled line down, at the margin',
      zd2.y - zd0.y > 25 && zd2.y - zd0.y < 50 && Math.abs(zd2.x - zd0.x) < 1,
      'y ' + Math.round(zd0.y) + ' -> ' + Math.round(zd2.y) + ', x ' + Math.round(zd2.x));
var zdLast = zd2, zdK;
for (zdK = 0; zdK < 8 && zd.zw().y === zd2.y; zdK++) { zdLast = zd.zw(); zwPress(zd, 'zwNext'); }
check('...and at the end of a line going on starts the next one, back at the margin',
      zdLast.x + zdLast.bw > 700 && Math.abs(zd.zw().y - zd2.y - (zd2.y - zd0.y)) < 1 && Math.abs(zd.zw().x - zd0.x) < 1,
      'line end at ' + Math.round(zdLast.x + zdLast.bw) + ', then y ' + Math.round(zd.zw().y) + ' x ' + Math.round(zd.zw().x));

/* the box's corner handle sets the zoom: in is smaller and a bigger zoom,
   the shape is always the strip's, and the choice is remembered */
function zwDrag(a, x, y, dx, dy) {
  a.down(11, x, y); a.tick(30);
  a.moveTo(11, x + dx / 2, y + dy / 2); a.tick(30);
  a.moveTo(11, x + dx, y + dy); a.tick(30);
  a.up(11); a.tick(300); a.flushFrames();
}
var ze = zwApp(), ze0 = ze.zw();
zwDrag(ze, ze0.x + ze0.bw - 5, ze0.y + ze0.bh + 4 + WRAPTOP, -40, -12);   /* near the corner, not on it */
var ze1 = ze.zw();
check('dragging the box corner in makes the box smaller - a bigger zoom',
      ze1.bw < ze0.bw - 25 && ze1.mag > ze0.mag + 0.3,
      'width ' + Math.round(ze0.bw) + ' -> ' + Math.round(ze1.bw) + ', zoom ' + ze0.mag.toFixed(2) + ' -> ' + ze1.mag.toFixed(2));
check('...keeping the strip\'s shape, drawing nothing and remembered',
      Math.abs(ze1.bw / ze1.bh - ze0.bw / ze0.bh) < 0.01 && ze.strokes().length === 0 &&
      Math.abs(ze.state().set.zwMag - ze1.mag) < 0.001,
      'shape ' + (ze0.bw / ze0.bh).toFixed(3) + ' -> ' + (ze1.bw / ze1.bh).toFixed(3) + ', ' + ze.strokes().length + ' strokes');
ze.stroke({ id: 1, x0: 60, y0: ze1.top + 120 + WRAPTOP, x1: 360, y1: ze1.top + 140 + WRAPTOP, speed: 0.3, wobble: 2 });
ze.tick(200); ze.flushFrames();
var zes = ze.strokes()[0], zeMin = 1e9, zeMax = -1e9;
if (zes) for (zq = 0; zq < zes.pts.length; zq++) { zeMin = Math.min(zeMin, zes.pts[zq][0]); zeMax = Math.max(zeMax, zes.pts[zq][0]); }
check('...and writing then lands at the new zoom',
      !!zes && Math.abs((zeMax - zeMin) - 300 / ze1.mag) < 12,
      zes ? Math.round(zeMax - zeMin) + 'px for 300px of hand at ' + ze1.mag.toFixed(2) : 'no stroke');
var zf = zwApp(), zf0 = zf.zw();
zwDrag(zf, zf0.x + zf0.bw, zf0.y + zf0.bh + WRAPTOP, 400, 200);
check('dragging it far out stops at 2x', Math.abs(zf.zw().mag - 2) < 0.001, zf.zw().mag.toFixed(2));


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
  mk._fire('click', {}); nd.dlg('Physics');
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
nd.dlg();                                 /* "Delete Physics?" - yes */
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
  for (i = st.length - 1; i > 0; i--) { nl.nb().del(i); nl.dlg(); }
  nl.nb().del(0); nl.dlg();
})();
check('the last notebook cannot be deleted',
      nl.state().notebooks.length >= 1,
      nl.state().notebooks.length + " notebooks left");

/* renaming acts on the notebook you picked, not the one you are in */
var nr = fresh();
(function () {
  nr.els.newNbBtn._fire('click', {}); nr.dlg('Physics');
  nr.els.newNbBtn._fire('click', {}); nr.dlg('Chemistry');
})();
(function () {
  var st = nr.state().notebooks, i, target = -1;
  for (i = 0; i < st.length; i++) if (st[i].title === 'Physics') target = i;
  var cur = nr.state().cur ? nr.state().cur.nb : -1;
  nr.nb().rename(target);
  nr.dlg('Maths');
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
  for (var fq = 0; fq < 5; fq++) fp.els.sizeMore._fire("click", {});
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

/* ---------- only the page with ink past its sides is wider ----------
 * Written out past the edge on the infinite canvas, then back to pages:
 * every page came out as wide as the one line that ran off the side. */
function pgApp(strokes, endless) {
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, endless: endless ? 1 : 0, strokes: strokes } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  return a;
}
function line(id, x0, x1, y) {
  return { id: id, pen: 0, w: 2, color: '#000000', a: 1, ord: 1, pts: [[x0, y, 0], [(x0 + x1) / 2, y + 4, 16], [x1, y, 16]] };
}
var pw1 = pgApp([line('a', 100, 1900, 300), line('b', 100, 600, 1300), line('c', 100, 500, 2400)]);
var pw1W = pw1.geom().pageW;
check('back on pages, only the page with ink past its side is wider',
      pw1W[0] > 1900 && pw1W[1] === 1024 && pw1W[2] === 1024, JSON.stringify(pw1W));
check('...and sideways scrolling still reaches it', pw1.geom().docW > 1900, 'docW ' + pw1.geom().docW);
var pw2 = pgApp([line('a', 100, 600, 300), line('b', -400, 500, 1300)]);
check('...on whichever side the ink went',
      pw2.geom().pageW[0] === 1024 && pw2.geom().pageW[1] > 1400, JSON.stringify(pw2.geom().pageW));
var pw3 = pgApp([line('a', 100, 1900, 300), line('b', 100, 600, 1300)], true);
pw3.clickMenu('Page type');
check('switching an infinite note back to pages stretches just that page',
      pw3.geom().pageW[0] > 1900 && pw3.geom().pageW[1] === 1024, JSON.stringify(pw3.geom().pageW));

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

/* ---------- pen pop-up: hold the pen still (Samsung's S Pen button) ---------- */
function holdOpen(a, id, x, y) { a.down(id, x, y); a.tick(650); a.win.__mnHold(); a.flushFrames(); }
function discDrag(a, x0, y0, x1, y1) {
  var d = a.els.ppDisc, ev = function (x, y) {
    return { changedTouches: [{ clientX: x, clientY: y }], target: d, preventDefault: function () {} };
  };
  d._fire('touchstart', ev(x0, y0));
  d._fire('touchmove', ev((x0 + x1) / 2, (y0 + y1) / 2));
  d._fire('touchmove', ev(x1, y1));
  d._fire('touchend', ev(x1, y1));
}

var pp = scApp(), pp0 = pp.strokes().length;
holdOpen(pp, 1, 500, 400);
check('holding the pen still opens the pen pop-up at the nib',
      pp.pen().pop === 'float' && pp.els.penPop.style.left === '500px' && pp.els.penPop.style.top === '400px',
      pp.pen().pop + ' at ' + pp.els.penPop.style.left + ',' + pp.els.penPop.style.top);
pp.up(1); pp.tick(60); pp.flushFrames();
check('...and lifting the pen leaves no dot behind', pp.strokes().length === pp0 && pp.pen().pop === 'float',
      (pp.strokes().length - pp0) + ' marks, pop ' + pp.pen().pop);
pp.els.ppCol._fire('click', {});
check('the colour dot opens the ring of colours', pp.pen().pop === 'float col', pp.pen().pop);
pp.els.ppCols.children[4]._fire('click', {});
check('...one tap picks a colour and folds the ring away, the pop-up stays',
      pp.pen().color === '#E2231A' && pp.pen().pop === 'float', pp.pen().color + ' ' + pp.pen().pop);
pp.els.ppSize._fire('click', {});
pp.els.ppWs.children[5]._fire('click', {});
check('the width dot opens the widths, one tap each', pp.pen().w === 5 && pp.pen().pop === 'float', 'w ' + pp.pen().w);
pp.els.ppCore._fire('click', {});
check('the pen in the middle fans out the pens', pp.pen().pop === 'float pens', pp.pen().pop);
pp.els.ppPens.children[3]._fire('click', {});
check('...and a pen from the fan is the one in hand', pp.pen().pen === 3, 'pen ' + pp.pen().pen);
var pp1 = pp.strokes().length;
scPath(pp, 5, [[300, 500], [340, 520], [380, 505], [420, 530]]);
check('writing closes the floating pop-up and the stroke still lands',
      pp.pen().pop === '' && pp.strokes().length === pp1 + 1, pp.pen().pop + ', ' + (pp.strokes().length - pp1) + ' strokes');

var pd = scApp(), pd0 = pd.strokes().length;
pd.down(1, 400, 400); pd.tick(450); pd.win.__mnHold(); pd.up(1); pd.tick(400); pd.flushFrames();
check('a dot held for 450ms is still a dot, not the pop-up', pd.pen().pop === '' && pd.strokes().length === pd0 + 1,
      pd.pen().pop + ', ' + (pd.strokes().length - pd0) + ' marks');
/* the pen that opened it keeps pointing: slide, then lift to pick */
function slide(a, id, pts) { for (var q = 0; q < pts.length; q++) { a.tick(16); a.moveTo(id, pts[q][0], pts[q][1]); } }
var ps = scApp(), ps0 = ps.strokes().length;
holdOpen(ps, 2, 400, 450);
slide(ps, 2, [[420, 450], [445, 450], [466, 450]]);             /* onto the colour dot, 66px right */
check('holding on, sliding onto the colour opens the colours - no writing',
      ps.pen().pop === 'float col' && ps.strokes().length === ps0, ps.pen().pop + ', ' + (ps.strokes().length - ps0) + ' marks');
var psC = ps.els.ppCols.children, psK = -1, psA;
for (var pq = 0; pq < psC.length; pq++) { if (psC[pq].style.opacity === '1') { psK = pq; break; } }
psA = 150;                                                     /* the second slot of the ring: grey */
slide(ps, 2, [[400 + 66 * Math.cos(psA * Math.PI / 180), 450 + 66 * Math.sin(psA * Math.PI / 180)]]);
ps.up(2); ps.tick(50); ps.flushFrames();
check('...and lifting on a colour picks it, the pop-up stays',
      psK === 0 && ps.pen().color === '#7F7F7F' && ps.pen().pop === 'float' &&
      ps.strokes().length === ps0, ps.pen().color + ' (slot ' + psK + '), ' + ps.pen().pop + ', ' + (ps.strokes().length - ps0) + ' marks');
var pw0 = ps.pen().w;
holdOpen(ps, 3, 400, 450);
slide(ps, 3, [[380, 450], [355, 450], [334, 450]]);             /* onto the width, 66px left */
check('sliding onto the width opens the width dial', ps.pen().pop === 'float size', ps.pen().pop);
slide(ps, 3, [[340, 480], [360, 505], [380, 514]]);             /* round the ring, down and clockwise? no - anticlockwise */
var pwMid = ps.pen().w;
slide(ps, 3, [[360, 505], [340, 480], [334, 450], [340, 420], [360, 395], [380, 386]]);
ps.up(3); ps.tick(50); ps.flushFrames();
check('...turning round the dial changes the width both ways, and lifting keeps it',
      pwMid !== pw0 && ps.pen().w !== pwMid && ps.strokes().length === ps0,
      'from ' + pw0 + ' to ' + pwMid + ' to ' + ps.pen().w);
holdOpen(ps, 4, 400, 450);
slide(ps, 4, [[400, 420], [400, 400], [400, 430], [400, 450]]);  /* off the middle and back onto it */
check('sliding back onto the pen in the middle brings out the row of pens', ps.pen().pop === 'float pens', ps.pen().pop);
slide(ps, 4, [[430, 450], [452, 452]]);                          /* one pen along the row, 52px right */
ps.up(4); ps.tick(50); ps.flushFrames();
check('...and lifting on another pen picks it', ps.pen().pen === 1 && ps.pen().pop === 'float', 'pen ' + ps.pen().pen + ', ' + ps.pen().pop);

var pm = scApp({ palmLevel: 2 });
holdOpen(pm, 1, 500, 400);
check('with palm rejection on, a still contact does not open it (a resting palm would)', pm.pen().pop === '', pm.pen().pop);

/* the lasso and the eraser write no line, so in Auto the pop-up's "on the
   line" test always said no and it never opened with them (reported) */
['selectBtn', 'eraserBtn'].forEach(function (btn) {
  var t = scApp({ palmLevel: 4 }), nm = btn === 'selectBtn' ? 'lasso' : 'eraser';
  t.els[btn]._fire('click', {});
  holdOpen(t, 1, 500, 400);
  check('in Auto, holding still with the ' + nm + ' opens the pen pop-up', t.pen().pop === 'float', t.pen().pop);
  t.up(1); t.tick(50); t.flushFrames();
});
var pa = scApp({ palmLevel: 4 });
pa.els.eraserBtn._fire('click', {});
scPath(pa, 1, [[400, 300], [440, 300], [480, 300]]);           /* a wipe up the page */
holdOpen(pa, 2, 520, 600);
check('...but not well below where the eraser just was: that is the hand resting', pa.pen().pop === '', pa.pen().pop);
pa.up(2); pa.tick(50);
var pw = scApp();
scPath(pw, 1, [[300, 520], [340, 524], [380, 520], [420, 526]]);
var pwN = pw.strokes().length;
pw.els.eraserBtn._fire('click', {});
holdOpen(pw, 2, 360, 470);
slide(pw, 2, [[360, 490], [360, 515], [360, 536]]);            /* down through the writing, towards the pop-up's lasso */
pw.up(2); pw.tick(50); pw.flushFrames();
check('the eraser that opened the pop-up only points: what it passes over stays', pw.strokes().length === pwN,
      (pwN - pw.strokes().length) + ' erased');

var pe = scApp();
holdOpen(pe, 1, 500, 400); pe.up(1); pe.tick(50);
pe.els.ppErase._fire('click', {});
check('eraser from the pop-up, which then gets out of the way', pe.pen().tool === 'eraser' && pe.pen().pop === '',
      pe.pen().tool + ' ' + pe.pen().pop);

var pk2 = scApp();
holdOpen(pk2, 1, 500, 400); pk2.up(1); pk2.tick(50);
discDrag(pk2, 500, 400, 30, 420);
check('dragged to the left edge it docks there', pk2.pen().pop === 'dock1' && pk2.els.penPop.style.left === '34px',
      pk2.pen().pop + ' at ' + pk2.els.penPop.style.left);
var pk3 = pk2.strokes().length;
scPath(pk2, 7, [[400, 500], [440, 520], [480, 505], [520, 530]]);
check('...and stays up while you write', pk2.pen().pop === 'dock1' && pk2.strokes().length === pk3 + 1,
      pk2.pen().pop + ', ' + (pk2.strokes().length - pk3) + ' strokes');
discDrag(pk2, 34, 420, 520, 420);
check('dragged back out it floats again', pk2.pen().pop === 'float', pk2.pen().pop);

/* the toolbar's pen panel, laid out as Samsung's */
var pl = scApp();
pl.els.penBtn._fire('click', {});
check('the pen button opens the pen panel', pl.pen().palette === 'block', pl.pen().palette);
check('...the pen in hand stands raised in the rack', /on/.test(pl.els.penRack.children[0].className) &&
      !/on/.test(pl.els.penRack.children[1].className), pl.els.penRack.children[0].className);
pl.els.sizeMore._fire('click', {}); pl.els.sizeMore._fire('click', {});
check('+ steps the width up, and the knob shows it', pl.pen().w === 4 && String(pl.els.sizeKnob.textContent) === '5',
      'w ' + pl.pen().w + ', knob ' + pl.els.sizeKnob.textContent);
pl.els.sizeLess._fire('click', {});
check('- steps it back down', pl.pen().w === 3, 'w ' + pl.pen().w);
pl.els.penRack.children[3]._fire('click', {});
check('a pen from the rack', pl.pen().pen === 3 && /on/.test(pl.els.penRack.children[3].className), 'pen ' + pl.pen().pen);
pl.els.colorPages.children[2]._fire('click', {});
check('the colour dots turn to another page of colours',
      pl.els.colorRow.children[16].style.display === '' && pl.els.colorRow.children[0].style.display === 'none',
      pl.els.colorRow.children[16].style.display + '/' + pl.els.colorRow.children[0].style.display);

/* ---------- shapes: draw, then hold still at the end (Samsung) ---------- */
var sh = scApp({ shapeAssist: 2 }), shI;
sh.down(1, 200, 400);
for (shI = 1; shI <= 20; shI++) { sh.tick(16); sh.moveTo(1, 200 + shI * 12, 400 + (shI % 3)); }
sh.tick(600); sh.win.__mnShape(); sh.flushFrames();
sh.up(1); sh.tick(50); sh.flushFrames();
check('a line drawn and then held becomes a straight line',
      sh.strokes().length === 1 && sh.strokes()[0].pts.length === 2,
      sh.strokes().length + ' strokes, ' + (sh.strokes()[0] ? sh.strokes()[0].pts.length : 0) + ' points');
sh.down(2, 200, 520);
for (shI = 1; shI <= 20; shI++) { sh.tick(16); sh.moveTo(2, 200 + shI * 12, 520 + (shI % 3)); }
sh.tick(16); sh.up(2); sh.tick(50); sh.flushFrames();
check('...the same line lifted straight away stays as drawn',
      sh.strokes().length === 2 && sh.strokes()[1].pts.length > 5, (sh.strokes()[1] ? sh.strokes()[1].pts.length : 0) + ' points');
sh.down(3, 560, 400);
for (shI = 1; shI <= 40; shI++) {
  sh.tick(16);
  sh.moveTo(3, 500 + 60 * Math.cos(shI / 40 * Math.PI * 2), 400 + 60 * Math.sin(shI / 40 * Math.PI * 2));
}
sh.tick(600); sh.win.__mnShape(); sh.up(3); sh.tick(50); sh.flushFrames();
(function () {
  var c = sh.strokes()[2], cx = 0, cy = 0, i, r, rmin = 1e9, rmax = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  if (c) {
    /* the middle of its box: the closing point repeats the first, so an
       average of the points leans toward it */
    for (i = 0; i < c.pts.length; i++) {
      x0 = Math.min(x0, c.pts[i][0]); x1 = Math.max(x1, c.pts[i][0]);
      y0 = Math.min(y0, c.pts[i][1]); y1 = Math.max(y1, c.pts[i][1]);
    }
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
    for (i = 0; i < c.pts.length; i++) {
      r = Math.sqrt((c.pts[i][0] - cx) * (c.pts[i][0] - cx) + (c.pts[i][1] - cy) * (c.pts[i][1] - cy));
      if (r < rmin) rmin = r; if (r > rmax) rmax = r;
    }
  }
  check('a circle drawn and then held becomes a true circle',
        sh.strokes().length === 3 && c.pts.length > 20 && rmax - rmin < 1.5,
        c ? c.pts.length + ' points, radius ' + rmin.toFixed(1) + '..' + rmax.toFixed(1) : 'none');
})();

/* the recognizer itself, on shapes as a hand draws them: edges that wobble,
   corners taken a little round, starting partway along an edge */
function handShape(v, closed) {
  var pts = [], m = v.length, k, i, seq = v.slice(), t = 0;
  if (closed) seq.push(v[0]);
  for (k = 0; k + 1 < seq.length; k++) {
    var a = seq[k], b = seq[k + 1], L = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
    var n = Math.max(6, Math.round(L / 5));
    for (i = 0; i < n; i++) {
      var w = Math.sin((pts.length + 1) * 1.7) * 1.8;
      pts.push([a[0] + (b[0] - a[0]) * i / n + w, a[1] + (b[1] - a[1]) * i / n - w * 0.6]);
    }
  }
  pts.push(seq[seq.length - 1].slice());
  if (closed) { var s = Math.round(pts.length / m / 2); pts = pts.slice(s).concat(pts.slice(1, s + 2)); }
  var out = [];
  for (i = 0; i < pts.length; i++) {
    var p0 = pts[Math.max(0, i - 1)], p2 = pts[Math.min(pts.length - 1, i + 1)];
    out.push([(p0[0] + 2 * pts[i][0] + p2[0]) / 4, (p0[1] + 2 * pts[i][1] + p2[1]) / 4, (t += 16)]);
  }
  return out;
}
function turned(v, deg) {
  var a = deg * Math.PI / 180, c = 0, d = 0, i;
  for (i = 0; i < v.length; i++) { c += v[i][0] / v.length; d += v[i][1] / v.length; }
  return v.map(function (p) {
    var x = p[0] - c, y = p[1] - d;
    return [c + x * Math.cos(a) - y * Math.sin(a), d + x * Math.sin(a) + y * Math.cos(a)];
  });
}
function regular(m, r) {
  var v = [], i;
  for (i = 0; i < m; i++) v.push([400 + r * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / m), 400 + r * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / m)]);
  return v;
}
var SQ = [[320, 320], [480, 320], [480, 480], [320, 480]];
var shFit = sh.win.__mnShapeFit, shR;
shR = shFit(handShape(regular(3, 110), true));
check('a triangle is recognised', shR && shR.kind === 'triangle', shR ? shR.kind : 'nothing');
shR = shFit(handShape(turned(SQ, 22), true));
check('...a square drawn at a tilt stays a square, at that tilt', shR && shR.kind === 'square', shR ? shR.kind : 'nothing');
shR = shFit(handShape(turned(SQ, 45), true));
check('...a diamond', shR && shR.kind === 'square', shR ? shR.kind : 'nothing');
shR = shFit(handShape(regular(6, 120), true));
check('...a hexagon', shR && shR.kind === 'hexagon', shR ? shR.kind : 'nothing');
shR = shFit(handShape([[200, 300], [300, 470], [430, 240]], false));
check('...an angle, as two straight lines', shR && shR.kind === 'polyline', shR ? shR.kind : 'nothing');
(function () {
  var arc = [], i;
  for (i = 0; i <= 40; i++) arc.push([400 + 120 * Math.cos(Math.PI * i / 40), 400 - 120 * Math.sin(Math.PI * i / 40) + Math.sin(i) * 1.2, i * 16]);
  shR = shFit(arc);
  check('...a half circle, as an arc', shR && shR.kind === 'arc', shR ? shR.kind : 'nothing');
})();
shR = shFit(handShape(turned(SQ, 3), true));
(function () {
  var sharp = 0, i, k, want = [[320, 320], [480, 320], [480, 480], [320, 480]];
  if (shR) for (k = 0; k < 4; k++) for (i = 0; i < shR.pts.length; i++) {
    if (Math.abs(shR.pts[i][0] - want[k][0]) < 8 && Math.abs(shR.pts[i][1] - want[k][1]) < 8) { sharp++; break; }
  }
  check('...and a nearly level square comes out level, with sharp corners',
        shR && shR.kind === 'square' && sharp === 4, shR ? shR.kind + ', ' + sharp + ' corners where they belong' : 'nothing');
})();
(function () {
  var p = [], i;
  for (i = 0; i <= 30; i++) p.push([200 + i * 10, 300 + i * 0.6, i * 16]);    /* 3.4 degrees off level */
  shR = shFit(p);
  check('...a line nearly level is made level',
        shR && shR.kind === 'line' && Math.abs(shR.pts[1][1] - shR.pts[0][1]) < 0.01, shR ? JSON.stringify(shR.pts) : 'nothing');
})();
(function () {
  var p = [], i;
  for (i = 0; i < 60; i++) p.push([200 + i * 6, 400 + 30 * Math.sin(i / 3) + 12 * Math.sin(i / 1.3), i * 16]);
  check('...and a scrawl is left alone', shFit(p) === null, JSON.stringify(shFit(p) && shFit(p).kind));
})();

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

/* ---------- the lasso's Colour and Straighten ---------- */
var rc = scApp();
scPath(rc, 1, scWord(300, 400));
scPath(rc, 2, scWord(300, 460));
var rc0 = rc.strokes()[0].color;
lassoAround(rc, 280, 370, 470, 490);
rc.els.selColBtn._fire('click', {});
check('Colour opens a row of colours', rc.els.hmPop.className === 'on', rc.els.hmPop.className);
rc.popPick('#E2231A');
check('...and picking one re-inks everything selected',
      rc.strokes().every(function (s) { return s.color === '#E2231A'; }),
      rc.strokes().map(function (s) { return s.color; }).join(' '));
rc.undo();
check('one Undo gives the ink its old colour back',
      rc.strokes().every(function (s) { return s.color === rc0; }), rc.strokes()[0].color);

var sl = scApp(), slp = [], sli;
for (sli = 0; sli <= 60; sli++) slp.push([200 + sli * 7, 300 + sli * 0.4 + 3 * Math.sin(sli / 2)]);
scPath(sl, 1, slp);
var sl0 = sl.strokes()[0].pts.length;
lassoAround(sl, 180, 250, 660, 370);
sl.els.selStrBtn._fire('click', {});
var slA = sl.strokes()[0].pts;
check('Straighten turns a wobbly ruled line into a straight, level one',
      Math.abs(slA[slA.length - 1][1] - slA[0][1]) < 0.5 && slA.length < sl0,
      slA.length + ' points, ends ' + Math.round(slA[0][1]) + ' / ' + Math.round(slA[slA.length - 1][1]));
sl.undo();
check('...and Undo brings the hand-drawn line back', sl.strokes()[0].pts.length === sl0,
      sl.strokes()[0].pts.length + ' points');

var sw = scApp(), swi;
for (swi = 0; swi < 4; swi++) scPath(sw, 1 + swi, scWord(120 + swi * 190, 400 + swi * 13));
function swFeet(a) {
  return a.strokes().map(function (s) { var m = -1e9; s.pts.forEach(function (p) { if (p[1] > m) m = p[1]; }); return m; });
}
var swB = swFeet(sw);
lassoAround(sw, 100, 340, 900, 480);
sw.els.selStrBtn._fire('click', {});
var swA = swFeet(sw);
check('Straighten levels a sloping line of handwriting instead of squaring its letters',
      Math.max.apply(null, swA) - Math.min.apply(null, swA) < (Math.max.apply(null, swB) - Math.min.apply(null, swB)) / 3 &&
      sw.strokes()[0].pts.length > 20,
      'feet spread ' + Math.round(Math.max.apply(null, swB) - Math.min.apply(null, swB)) + ' -> ' +
      Math.round(Math.max.apply(null, swA) - Math.min.apply(null, swA)));

/* With the lasso, two fingers that do not land together still scroll and
   zoom - the second used to start a lasso of its own (reported: "in the
   lasso the zoom does not work") */
function lassoTwo(a, dx, dy, steps) {
  var i;
  a.els.selectBtn._fire('click', {});
  a.down(51, 420, 380); a.tick(320); a.down(52, 560, 400);
  for (i = 1; i <= steps; i++) {
    a.tick(16);
    a.moveTo(51, 420 - dx * i, 380 - dy * i);
    a.moveTo(52, 560 + dx * i, 400 - dy * i);
    a.flushFrames();
  }
  a.tick(16); a.up(51); a.up(52); a.tick(100); a.flushFrames();
}
var lt = scApp();
scPath(lt, 1, scWord(300, 300));
lassoTwo(lt, 0, 12, 20);
check('Lasso: two fingers scroll the page even when the second lands late',
      lt.geom().scrollY > 100 && lt.win.__mnSelBox() === null, 'scrollY ' + Math.round(lt.geom().scrollY) + ', selection ' + JSON.stringify(lt.win.__mnSelBox()));
var lz = scApp();
lassoTwo(lz, 2, 0, 40);
check('...and spreading them zooms', lz.geom().zoom > 1.3, 'zoom ' + lz.geom().zoom.toFixed(2));

/* the copy outlives the app: iOS restarts a home-screen app after a trip elsewhere */
var kc = scApp();
scPath(kc, 1, scWord(300, 400));
lassoAround(kc, 280, 370, 470, 430);
kc.els.selClipBtn._fire('click', {});
var kcRaw = kc.storage.getItem('mathnotes_clip');
var kc2 = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
  seed: { mathnotes_clip: kcRaw, mathnotes_v4: JSON.stringify({ v: 4,
    notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
kc2.flushFrames();
kc2.els.insertBtn._fire('click', {});
var kcPasted = kc2.popPick('Paste');
check('what was copied is still there to paste after the app restarts',
      !!kcRaw && kcPasted && kc2.strokes().length === 1 && kc2.strokes()[0].pts.length === kc.strokes()[0].pts.length,
      (kcRaw ? kcRaw.length + ' chars kept' : 'nothing kept') + ', ' + kc2.strokes().length + ' pasted');

/* ---------- sticky notes ---------- */
function penTap(a, id, x, y) { a.down(id, x, y); a.tick(90); a.up(id); a.tick(200); a.flushFrames(); }
var sn = scApp();
sn.els.insertBtn._fire('click', {});
sn.popPick('Sticky note');
sn.popPick('#FFD9C2');
var snS = sn.strokes();
check('+ > Sticky note puts a card of the chosen colour on the page',
      snS.length === 1 && snS[0].pen === 7 && snS[0].color === '#FFD9C2' && !snS[0].fold,
      JSON.stringify(snS.map(function (s) { return [s.pen, s.color]; })));
var snX = snS[0].pts[0][0], snY = snS[0].pts[0][1];
scPath(sn, 1, scWord(snX + 20, snY + 100 + 56));
snS = sn.strokes();
check('writing on it goes onto the sticky, not the page',
      snS.length === 1 && snS[0].kids.length === 1 && snS[0].kids[0].pts[0][0] < 60,
      snS.length + ' on the page, ' + (snS[0].kids || []).length + ' on the sticky');
scPath(sn, 2, scWord(snX + 20, snY + 400 + 56));
check('...while writing off the card stays on the page', sn.strokes().length === 2, sn.strokes().length + ' on the page');
sn.undo();
sn.undo();
check('Undo takes the writing off the sticky again', sn.strokes()[0].kids.length === 0);
sn.els.redoBtn._fire('click', {});
sn.flushFrames();
check('...and Redo puts it back', sn.strokes()[0].kids.length === 1);
var TB = 56;   /* the toolbar: a touch at screen y is page y + 56 */
penTap(sn, 3, snX + 240 - 15, snY + 13 + TB);
check('a pen tap on its corner button folds it, hiding the writing', sn.strokes()[0].fold === 1 && sn.strokes().length === 1,
      'fold ' + sn.strokes()[0].fold + ', ' + sn.strokes().length + ' marks');
penTap(sn, 4, snX + 20, snY + 20 + TB);
check('...and a tap on the folded square opens it, the writing still there',
      !sn.strokes()[0].fold && sn.strokes()[0].kids.length === 1 && sn.strokes().length === 1,
      'fold ' + sn.strokes()[0].fold + ', ' + sn.strokes().length + ' marks');
sn.els.eraserBtn._fire('click', {});
scPath(sn, 5, [[snX + 10, snY + 100 + TB], [snX + 60, snY + 100 + TB], [snX + 120, snY + 100 + TB], [snX + 180, snY + 100 + TB]]);
check('the eraser takes the writing off a sticky but leaves the card',
      sn.strokes().length === 1 && sn.strokes()[0].kids.length === 0, sn.strokes().length + ' marks, ' + sn.strokes()[0].kids.length + ' on it');
sn.undo();
sn.els.penBtn._fire('click', {});
lassoAround(sn, snX - 20, snY - 20 + TB, snX + 260, snY + 250 + TB);
sn.els.selColBtn._fire('click', {});
sn.popPick('#CFEFD8');
check('with only a sticky chosen, Colour changes its paper', sn.strokes()[0].color === '#CFEFD8', sn.strokes()[0].color);
sn.els.selCopyBtn._fire('click', {});
var snD = sn.strokes();
check('Duplicate copies the sticky with its writing', snD.length === 2 && snD[1].kids.length === 1 && snD[1].id !== snD[0].id,
      snD.length + ' cards');

/* an open sticky could not be moved: only the lasso moved one, and round an
   open card that is a big loop (reported). Its top strip carries it now. */
var sm = scApp();
sm.els.insertBtn._fire('click', {}); sm.popPick('Sticky note'); sm.popPick('#FFF1A1');
var smS = sm.strokes()[0], smX = smS.pts[0][0], smY = smS.pts[0][1];
scPath(sm, 1, scWord(smX + 20, smY + 100 + TB));                 /* writing on it */
scPath(sm, 2, [[smX + 100, smY + 14 + TB], [smX + 160, smY + 54 + TB], [smX + 220, smY + 94 + TB], [smX + 280, smY + 134 + TB]]);
smS = sm.strokes();
check('dragging an open sticky by its top strip moves it, writing and all',
      smS.length === 1 && Math.abs(smS[0].pts[0][0] - (smX + 180)) < 2 && Math.abs(smS[0].pts[0][1] - (smY + 120)) < 2 &&
      smS[0].kids.length === 1 && !smS[0].fold,
      smS.length + ' marks, corner ' + Math.round(smS[0].pts[0][0] - smX) + ',' + Math.round(smS[0].pts[0][1] - smY) + ' along');
check('...and leaves no selection behind with the pen in hand', sm.els.selBar.style.display !== 'block' && !sm.win.__mnSelBox(),
      'bar ' + sm.els.selBar.style.display);
sm.undo();
check('one Undo puts it back', Math.abs(sm.strokes()[0].pts[0][0] - smX) < 1 && Math.abs(sm.strokes()[0].pts[0][1] - smY) < 1,
      Math.round(sm.strokes()[0].pts[0][0]) + ',' + Math.round(sm.strokes()[0].pts[0][1]));
scPath(sm, 3, [[smX + 120, smY + 200 + TB], [smX + 150, smY + 230 + TB], [smX + 180, smY + 260 + TB]]);
check('writing lower down the card is still writing, not a drag', sm.strokes()[0].kids.length === 2 &&
      Math.abs(sm.strokes()[0].pts[0][0] - smX) < 1, sm.strokes()[0].kids.length + ' on it');
penTap(sm, 4, smX + 240 - 15, smY + 13 + TB);                    /* fold it */
scPath(sm, 5, [[smX + 20, smY + 20 + TB], [smX + 60, smY + 60 + TB], [smX + 100, smY + 100 + TB]]);
check('a folded sticky is carried by any of it', sm.strokes()[0].fold === 1 &&
      Math.abs(sm.strokes()[0].pts[0][0] - (smX + 80)) < 2 && Math.abs(sm.strokes()[0].pts[0][1] - (smY + 80)) < 2,
      'fold ' + sm.strokes()[0].fold + ', corner ' + Math.round(sm.strokes()[0].pts[0][0] - smX) + ',' + Math.round(sm.strokes()[0].pts[0][1] - smY) + ' along');
var sl2 = scApp();
sl2.els.insertBtn._fire('click', {}); sl2.popPick('Sticky note'); sl2.popPick('#CFE6FF');
var sl2S = sl2.strokes()[0], sl2X = sl2S.pts[0][0], sl2Y = sl2S.pts[0][1];
sl2.els.selectBtn._fire('click', {});
scPath(sl2, 1, [[sl2X + 100, sl2Y + 14 + TB], [sl2X + 60, sl2Y + 74 + TB], [sl2X + 20, sl2Y + 134 + TB]]);
check('the lasso in hand carries it by its strip too', Math.abs(sl2.strokes()[0].pts[0][0] - (sl2X - 80)) < 2 &&
      Math.abs(sl2.strokes()[0].pts[0][1] - (sl2Y + 120)) < 2,
      'corner ' + Math.round(sl2.strokes()[0].pts[0][0] - sl2X) + ',' + Math.round(sl2.strokes()[0].pts[0][1] - sl2Y) + ' along');

/* ---------- sort pages ---------- */
/* three pages, each with one mark at a known height and its own template */
function srtApp() {
  function mark(id, y) { return { id: id, pen: 0, w: 3, color: '#000000', a: 1, ord: +id.slice(1),
    pts: [[200, y, 0], [260, y + 5, 16], [320, y, 32]] }; }
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
    seed: { mathnotes_v4: JSON.stringify({ v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, minPages: 3, tpl: [2, null, 3],
        strokes: [mark('s1', 100), mark('s2', 1020 + 100), mark('s3', 2040 + 100)] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 } }) } });
  a.flushFrames();
  return a;
}
/* which page each mark is on now, by its id */
function srtPages(a) {
  var out = {};
  a.strokes().forEach(function (s) { out[s.id] = Math.floor(s.pts[0][1] / 1020) + 1; });
  return out;
}
function srtCells(a) { return a.els.sortGrid.children.filter(function (c) { return c._num; }); }
/* where slot i sits: six across at 152px, 167px down, from (56, 14) */
function srtAt(i) { return { x: 56 + (i % 6) * 152 + 60, y: 14 + Math.floor(i / 6) * 167 + 60 }; }

var so = srtApp();
so.els.stripSort._fire('click', {});
check('Sort opens a grid with a thumbnail for every page', so.els.sortOverlay.className === 'on' && srtCells(so).length === 3,
      so.els.sortOverlay.className + ', ' + srtCells(so).length + ' cells');
var so3 = srtCells(so)[2], sp0 = srtAt(2), sp1 = srtAt(0);
so3._fire('touchstart', { touches: [{ clientX: sp0.x, clientY: sp0.y }] });
so.win.__mnSortLift();
so.els.sortGrid._fire('touchmove', { touches: [{ clientX: sp1.x, clientY: sp1.y }], preventDefault: function () {} });
so.els.sortGrid._fire('touchend', { touches: [], cancelable: true, preventDefault: function () {} });
check('holding page 3 and dragging it to the front puts it first',
      so3._num.textContent === '1' && so.win.__mnSorted().join(',') === '2,0,1',
      so.win.__mnSorted().join(','));
so.els.sortDone._fire('click', {});
so.flushFrames();
var soP = srtPages(so);
check('Done moves the writing with its page: 3 is now 1, 1 is 2, 2 is 3',
      soP.s3 === 1 && soP.s1 === 2 && soP.s2 === 3, JSON.stringify(soP));
check('...and each page takes its template with it', JSON.stringify(so.note('n1').tpl) === '[3,2,null]',
      JSON.stringify(so.note('n1').tpl));
so.undo();
soP = srtPages(so);
check('one Undo puts the pages back in their old order', soP.s1 === 1 && soP.s2 === 2 && soP.s3 === 3, JSON.stringify(soP));

var sd = srtApp();
sd.els.stripSort._fire('click', {});
srtCells(sd)[0]._fire('click', {});
sd.els.sortDup._fire('click', {});
sd.els.sortDone._fire('click', {});
sd.flushFrames();
var sdS = sd.strokes();
check('Duplicate adds a copy of the page right after it', sd.pages().total === 4 && sdS.length === 4 &&
      sdS.filter(function (s) { return Math.floor(s.pts[0][1] / 1020) === 1; }).length === 1 && srtPages(sd).s2 === 3,
      sd.pages().total + ' pages, ' + sdS.length + ' marks, ' + JSON.stringify(srtPages(sd)));

var sx2 = srtApp();
sx2.els.stripSort._fire('click', {});
srtCells(sx2)[1]._fire('click', {});
sx2.els.sortDel._fire('click', {});
sx2.els.sortDone._fire('click', {});
sx2.flushFrames();
var sxP = srtPages(sx2);
check('Delete drops the page and its writing, and the pages after it move up',
      sx2.pages().total === 2 && !sxP.s2 && sxP.s1 === 1 && sxP.s3 === 2, sx2.pages().total + ' pages, ' + JSON.stringify(sxP));

var sc2 = srtApp();
sc2.els.stripSort._fire('click', {});
srtCells(sc2)[0]._fire('click', {});
sc2.els.sortDel._fire('click', {});
sc2.els.sortCancel._fire('click', {});
check('Cancel leaves the note exactly as it was', sc2.pages().total === 3 && sc2.strokes().length === 3,
      sc2.pages().total + ' pages');

/* ---------- pages side by side, and two to a screen ---------- */
/* a page is 1024 across with a 44px gutter between neighbours (the view
   is 768 wide, so the page takes the 1024 floor rather than the screen) */
var SPAN_H = 1024 + 44;
function glide(app, steps) {
  for (var i = 0; i < (steps || 26); i++) { app.tick(20); app.flushFrames(1); }
  app.flushFrames();
  return app;
}
function firstPt(app) { return app.strokes()[0].pts[0]; }

var l1 = fresh();
write(l1, 70);
var l1pre = firstPt(l1);
l1.clickMenu('Pages');
l1.els.pagesInsertBtn._fire('click', {});       /* the mark pushed to page two */
l1.flushFrames();
var l1a = firstPt(l1);
check('the mark starts at the top of page two, down the roll',
      Math.abs(l1a[0] - l1pre[0]) < 6 && Math.abs(l1a[1] - (l1pre[1] + 1020)) < 6,
      'at ' + Math.round(l1a[0]) + ',' + Math.round(l1a[1]));
check('the row that turns the note sideways is offered',
      l1.clickMenu('Page layout') === true, 'no Page layout row');
l1.flushFrames();
var l1b = firstPt(l1);
check('the note is now laid across', l1.pages().across === true,
      'across ' + l1.pages().across);
check('...with the same two pages in it', l1.pages().total === 2,
      l1.pages().total + ' pages');
check('page two stands beside page one, at its own height again',
      Math.abs(l1b[0] - (l1a[0] + SPAN_H)) < 6 && Math.abs(l1b[1] - (l1a[1] - 1020)) < 6,
      'at ' + Math.round(l1b[0]) + ',' + Math.round(l1b[1]));

l1.undo(); l1.flushFrames();
var l1c = firstPt(l1);
check('undo turns the note back down the page', l1.pages().across === false,
      'across ' + l1.pages().across);
check('...with the mark where it was',
      Math.abs(l1c[0] - l1a[0]) < 2 && Math.abs(l1c[1] - l1a[1]) < 2,
      'at ' + Math.round(l1c[0]) + ',' + Math.round(l1c[1]));

l1.clickMenu('Page layout'); l1.flushFrames();
l1.clickMenu('Page layout'); l1.flushFrames();
var l1d = firstPt(l1);
check('aside and back again leaves the note exactly as it was',
      Math.abs(l1d[0] - l1a[0]) < 2 && Math.abs(l1d[1] - l1a[1]) < 2 &&
      l1.pages().across === false,
      'at ' + Math.round(l1d[0]) + ',' + Math.round(l1d[1]));

var l2 = fresh();
write(l2, 71);
l2.clickMenu('Pages');
l2.els.pagesInsertBtn._fire('click', {}); l2.flushFrames();
l2.els.pagesInsertBtn._fire('click', {}); l2.flushFrames();   /* three pages */
var l2pre = firstPt(l2);
l2.clickMenu('Page layout'); l2.flushFrames();
var l2p = l2.pages();
check('three pages stand side by side', l2p.across && l2p.total === 3,
      'across ' + l2p.across + ', ' + l2p.total + ' pages');
var l2m = firstPt(l2);
check('the ink came with the page it was on',
      Math.abs(l2m[0] - (l2pre[0] + 2 * SPAN_H)) < 6 && Math.abs(l2m[1] - (l2pre[1] - 2 * 1020)) < 6,
      'at ' + Math.round(l2m[0]) + ',' + Math.round(l2m[1]));

l2.els.stripTab._fire('click', {});
var l2strip = l2.pages();
check('the strip still lists every page', l2strip.strip && l2strip.cells === 3,
      l2strip.cells + ' cells');
l2.els.stripList.children[1]._fire('click', {});
check('turning to a page glides across rather than jumping',
      l2.pages().tween === true, 'tween ' + l2.pages().tween);
glide(l2);
var l2g = l2.pages();
check('the view arrives at that page', l2g.cur === 2 && l2g.tween === false,
      'page ' + l2g.cur + ', tween ' + l2g.tween);
check('...at the head of it', Math.abs(l2g.x - SPAN_H) < 4, 'x ' + l2g.x);
check('the page pill counts across, and the corner shows the zoom it is at',
      l2.els.scrollPill.textContent === '2 / 3' && l2.els.zoomPct.textContent === '75%',
      '"' + l2.els.scrollPill.textContent + '", corner ' + l2.els.zoomPct.textContent);

l2.clickMenu('Pages');
var l2x = firstPt(l2)[0], l2y = firstPt(l2)[1];
l2.els.pagesInsertBtn._fire('click', {}); l2.flushFrames(); glide(l2);
check('inserting a page pushes the marks across, not down',
      Math.abs(firstPt(l2)[0] - (l2x + SPAN_H)) < 6 && Math.abs(firstPt(l2)[1] - l2y) < 6,
      'at ' + Math.round(firstPt(l2)[0]) + ',' + Math.round(firstPt(l2)[1]));
check('...and the note has one page more', l2.pages().total === 4,
      l2.pages().total + ' pages');
l2.undo(); l2.flushFrames(); glide(l2);
check('one undo puts them back',
      Math.abs(firstPt(l2)[0] - l2x) < 6 && l2.pages().total === 3,
      'x ' + Math.round(firstPt(l2)[0]) + ', ' + l2.pages().total + ' pages');

/* the page the ink is on, taken away */
l2.els.stripList.children[2]._fire('click', {}); glide(l2);
check('the page holding the ink is under the view',
      l2.pages().cur === 3, 'page ' + l2.pages().cur);
l2.clickMenu('Pages');
l2.confirmAll(true);
l2.els.pagesDeleteBtn._fire('click', {}); l2.flushFrames();
check('deleting across takes that page and its marks with it',
      l2.pages().total < 3 && l2.strokes().length === 0,
      l2.pages().total + ' pages, ' + l2.strokes().length + ' strokes');
l2.undo(); l2.flushFrames(); glide(l2);
check('one undo brings the page back',
      l2.pages().total === 3 && l2.strokes().length === 1,
      l2.pages().total + ' pages, ' + l2.strokes().length + ' strokes');

/* pulling past the side of the last page */
var l3 = fresh();
write(l3, 73);
var l3pre = firstPt(l3);
l3.clickMenu('Page layout'); l3.flushFrames();
l3.els.handBtn._fire('click', {});
l3.down(1, 700, 400); l3.tick(20);
l3.moveTo(1, 695, 400); l3.tick(20); l3.flushFrames();     /* first move is the grip */
l3.moveTo(1, 540, 400); l3.tick(20); l3.flushFrames();     /* right to the end */
l3.moveTo(1, 380, 400); l3.tick(20); l3.flushFrames();     /* and past it */
l3.moveTo(1, 240, 400); l3.tick(20); l3.flushFrames();     /* ...well past it */
var l3pull = l3.pages().pull;
check('the side of the sheet stretches as the hand drags past it',
      l3pull >= 78, 'pull ' + Math.round(l3pull));
l3.up(1); l3.flushFrames(); glide(l3);
check('letting go adds a page to the side', l3.pages().total === 2,
      l3.pages().total + ' pages');
check('...without moving the ink', l3.strokes().length === 1 &&
      Math.abs(firstPt(l3)[0] - l3pre[0]) < 6 && Math.abs(firstPt(l3)[1] - l3pre[1]) < 6,
      l3.strokes().length + ' strokes, at ' + Math.round(firstPt(l3)[0]) + ',' +
      Math.round(firstPt(l3)[1]));

/* an infinite note offers no layout to change */
var l4 = fresh();
l4.clickMenu('Page type'); l4.flushFrames();                /* infinite now */
check('there is no layout row on an infinite note',
      l4.clickMenu('Page layout') === false, 'row offered');

/* the layout is the note's own, so it goes into the note's record */
var l6 = fresh();
write(l6, 75);
l6.clickMenu('Page layout'); l6.flushFrames();
var l6rec = l6.win.__mnRec();
check('the note records that it is laid across',
      l6.pages().across === true && l6rec.horiz === 1,
      'across ' + l6.pages().across + ', record ' + l6rec.horiz);
check('...and how wide a page is', l6rec.pw === 1024, 'pw ' + l6rec.pw);
l6.clickMenu('Page layout'); l6.flushFrames();
check('a note back down the page says so',
      l6.win.__mnRec().horiz === 0, 'record ' + l6.win.__mnRec().horiz);

/* exporting a note laid across must still work */
var l7 = fresh();
write(l7, 76);
l7.clickMenu('Page layout'); l7.flushFrames();
var l7err = '';
try { l7.clickMenu('Export PNG'); } catch (e) { l7err = String(e); }
check('exporting pages laid across works',
      l7.pages().exp === 'overlay on' && !l7err,
      'overlay "' + l7.pages().exp + '" ' + l7err);

/* a reader is offered no layout to change either */
var l8 = fresh();
l8.clickMenu('Reading mode'); l8.flushFrames();
check('in reading mode the layout row is not offered',
      l8.clickMenu('Page layout') === false, 'row offered');

/* ---------- the page view popover ---------- */
var pv1 = fresh();
pv1.els.pageViewBtn._fire('click', {});
check('the page view button opens the popover', pv1.pageView().open === true,
      'open ' + pv1.pageView().open);
check('...and the scrim is up with it', pv1.els.panelScrim.className === 'on',
      'scrim "' + pv1.els.panelScrim.className + '"');
check('three directions, the first chosen for a note down the page',
      pv1.pageView().dir === 'down' && pv1.pageView().onDown &&
      !pv1.pageView().onAcross && !pv1.pageView().onSpread,
      pv1.pageView().dir + ' / ' + pv1.pageView().label);
check('the paper swatches are there, white ticked',
      pv1.pageView().swatches === 5 && pv1.pageView().paper === 0 &&
      /on/.test(pv1.els.pvColors.children[0].className),
      pv1.pageView().swatches + ' swatches, paper ' + pv1.pageView().paper);

pv1.els.pvAcross._fire('click', {});
check('across turns the note side by side',
      pv1.pageView().dir === 'across' && pv1.pageView().onAcross &&
      pv1.pages().across === true,
      pv1.pageView().dir + ', across ' + pv1.pages().across);
pv1.undo();
check('...and it is one undo back', pv1.pages().across === false,
      'across ' + pv1.pages().across);

pv1.els.pvDown._fire('click', {});
check('and back down the page again',
      pv1.pageView().dir === 'down' && pv1.pages().across === false,
      pv1.pageView().dir + ', across ' + pv1.pages().across);

/* the paper colour is chosen, not cycled */
var pv2 = fresh();
pv2.els.pageViewBtn._fire('click', {});
pv2.els.pvColors.children[2]._fire('click', {});
check('a swatch picks that paper', pv2.pageView().paper === 2 &&
      /on/.test(pv2.els.pvColors.children[2].className) &&
      !/on/.test(pv2.els.pvColors.children[0].className),
      'paper ' + pv2.pageView().paper);
pv2.els.pvColors.children[4]._fire('click', {});
check('and another swatch moves the tick', pv2.pageView().paper === 4 &&
      /on/.test(pv2.els.pvColors.children[4].className),
      'paper ' + pv2.pageView().paper);

/* an infinite note has no direction to choose */
var pv3 = fresh();
pv3.clickMenu('Page type');
pv3.els.moreBtn._fire('click', {});
pv3.els.pageViewBtn._fire('click', {});
check('an infinite note hides the direction', pv3.pageView().dirHidden === true,
      'dirHidden ' + pv3.pageView().dirHidden);
check('...but still offers the paper colour', pv3.pageView().swatches === 5,
      pv3.pageView().swatches + ' swatches');

/* the scrim tap closes it, and reading mode refuses it */
pv3.els.panelScrim._fire('click', {});
check('the scrim tap closes the popover', pv3.pageView().open === false,
      'open ' + pv3.pageView().open);
var pv4 = fresh();
pv4.clickMenu('Reading mode');
pv4.els.moreBtn._fire('click', {});
pv4.els.pageViewBtn._fire('click', {});
check('reading mode refuses the popover', pv4.pageView().open === false,
      'open ' + pv4.pageView().open);

/* ---------- the template gallery ---------- */
var tg = fresh();
write(tg, 80);
tg.clickMenu('Template');
check('the Template row opens the gallery', tg.tpl().open === true, 'open ' + tg.tpl().open);
check('...with a picture of each template', tg.tpl().cells === 6, tg.tpl().cells + ' cells');
check('the template in use is the one selected', tg.tpl().sel === 0 && tg.tpl().cur === 0,
      'sel ' + tg.tpl().sel + ', cur ' + tg.tpl().cur);

tg.els.tplGrid.children[1]._fire('click', {});   /* grid */
check('tapping a picture selects it', tg.tpl().sel === 1, 'sel ' + tg.tpl().sel);
tg.els.tplThisBtn._fire('click', {});
check('this page puts it on that page only',
      tg.tpl().perPage && tg.tpl().perPage[0] === 1 && tg.tpl().global === 0,
      'perPage ' + JSON.stringify(tg.tpl().perPage) + ', global ' + tg.tpl().global);
tg.undo();
check('one undo takes it off the page', tg.tpl().cur === 0, 'cur ' + tg.tpl().cur);

tg.clickMenu('Template');
tg.els.tplGrid.children[4]._fire('click', {});   /* to-do */
tg.els.tplAllBtn._fire('click', {});
check('all pages puts it on every page',
      tg.tpl().global === 4 && !tg.tpl().perPage,
      'global ' + tg.tpl().global + ', perPage ' + JSON.stringify(tg.tpl().perPage));
tg.undo();
check('and undo takes it back off', tg.tpl().global === 0 && !tg.tpl().perPage,
      'global ' + tg.tpl().global + ', perPage ' + JSON.stringify(tg.tpl().perPage));

/* an infinite note has no pages to template */
var tg2 = fresh();
tg2.clickMenu('Page type');
tg2.clickMenu('Template');
check('an infinite note refuses the gallery', tg2.tpl().open === false, 'open ' + tg2.tpl().open);

/* ---------- the page colour tints the whole interface ---------- */
var tn = fresh();
check('a white page sits on a light grey desk under a pale bar',
      tn.tint().paper === 0 && tn.tint().desk === '#E8EAED' && tn.tint().hdr === '#F0F1F3',
      'desk ' + tn.tint().desk + ', hdr ' + tn.tint().hdr);

tn.els.pageViewBtn._fire('click', {});
tn.els.pvColors.children[2]._fire('click', {});   /* yellow */
check('a yellow page tints the desk',
      tn.tint().paper === 2 && tn.tint().desk === '#E3DA9E',
      'paper ' + tn.tint().paper + ', desk ' + tn.tint().desk);
check('...and warms the chrome above it',
      tn.tint().hdr === '#F0E7B8' && tn.tint().toolbar === '#F0E7B8',
      'hdr ' + tn.tint().hdr + ', toolbar ' + tn.tint().toolbar);

tn.els.pageViewBtn._fire('click', {});
tn.els.pvColors.children[4]._fire('click', {});   /* dark */
check('a dark page takes the dark chrome',
      tn.tint().dark === true && tn.tint().hdr === '#1B1C1F' && tn.tint().desk === '#141414',
      'dark ' + tn.tint().dark + ', hdr ' + tn.tint().hdr + ', desk ' + tn.tint().desk);

/* the menu row opens the picker rather than cycling at random */
var tn3 = fresh();
tn3.clickMenu('Paper color');
check('the Paper colour row opens the picker',
      tn3.pageView().open === true && tn3.tint().paper === 0,
      'open ' + tn3.pageView().open + ', paper ' + tn3.tint().paper);

/* ---------- PDF pages, and a document beside the note ----------
 * pdf.js is not in the sandbox, so a stand-in document is handed over: a
 * 600x800 page, which fits a 1024x1000 note page at 750x1000. */
function fakeThen(v) { return { then: function (ok) { if (ok) ok(v); return this; } }; }
function fakePdf(N) {
  return { numPages: N, destroy: function () {},
    getPage: function () {
      return fakeThen({
        getViewport: function (s) { return { width: 600 * s, height: 800 * s }; },
        render: function () { return { promise: fakeThen() }; },
        cleanup: function () {} });
    } };
}
function bgImgs(app) {
  var out = [], st = app.strokes(), i;
  for (i = 0; i < st.length; i++) if (st[i].pen === 6 && st[i].bg) out.push(st[i]);
  return out;
}
function openTitle(app) { var s = app.state(); return s && s.cur && app.note(s.cur.note) ? app.note(s.cur.note).title : ''; }

var pf = fresh();
pf.els.backBtn._fire('click', {}); pf.flushFrames();
pf.win.__mnPdf.sheet(fakePdf(4), 'Lecture 5.pdf', 'new');
check('the page chooser shows every page, all picked',
      pf.els.pdfGrid.children.length === 4 && pf.els.pdfGrid.children[0].className.indexOf('on') >= 0,
      pf.els.pdfGrid.children.length + ' pages');
pf.els.pdfGrid.children[1]._fire('click', {});          /* leave page 2 out */
pf.els.pdfGo._fire('click', {}); pf.flushFrames();
var pfImgs = bgImgs(pf);
check('the chosen pages become a new note named after the file',
      openTitle(pf) === 'Lecture 5' && pfImgs.length === 3, '"' + openTitle(pf) + '", ' + pfImgs.length + ' pages');
check('...each fitted to a page of its own, under the ink',
      pfImgs.length === 3 && pfImgs[0].pts[0][0] === 137 && pfImgs[1].pts[0][1] === 1020 &&
      pfImgs[2].pts[0][1] === 2040 && pfImgs[0].ord < 0,
      pfImgs.map(function (s) { return s.pts[0].slice(0, 2).join(','); }).join(' / '));

var pn = fresh();
write(pn, 1);                                         /* ink on page 1 */
pn.win.__mnPdf.sheet(fakePdf(2), 'Sheet.pdf', 'note');
pn.els.pdfGo._fire('click', {}); pn.flushFrames();
var pnImgs = bgImgs(pn);
check('in a note, the pages go in after the page you are on',
      pnImgs.length === 2 && pnImgs[0].pts[0][1] === 1020 && pnImgs[1].pts[0][1] === 2040,
      pnImgs.map(function (s) { return s.pts[0][1]; }).join(', '));
pn.undo();
check('...and one undo takes them all out again', bgImgs(pn).length === 0 && pn.strokes().length === 1,
      bgImgs(pn).length + ' PDF pages, ' + pn.strokes().length + ' strokes');

var ph = fresh();
write(ph, 1);
ph.win.__mnPdf.sheet(fakePdf(1), 'One.pdf', 'note');
ph.els.pdfHere._fire('click', {});
ph.els.pdfGo._fire('click', {}); ph.flushFrames();
var phImg = bgImgs(ph), phInk = ph.strokes().filter(function (s) { return !s.bg; });
check('"On this page" lays the PDF page under what is already written',
      phImg.length === 1 && phImg[0].pts[0][1] === 0 && phInk.length === 1 && phImg[0].ord < phInk[0].ord,
      phImg.length + ' page at y ' + (phImg[0] && phImg[0].pts[0][1]));
ph.els.eraserBtn._fire('click', {});
ph.stroke({ id: 7, x0: 150, y0: 400, x1: 650, y1: 420, speed: 0.4 });   /* across the ink and the page */
ph.tick(100);
check('...and the eraser rubs out the ink, never the page itself',
      bgImgs(ph).length === 1 && ph.strokes().length === 1,
      bgImgs(ph).length + ' PDF page, ' + ph.strokes().length + ' strokes');

var im = fresh();
im.els.insertBtn._fire('click', {});
var imRows = im.els.hmPop.children, imL = [], q2;
for (q2 = 0; q2 < imRows.length; q2++) if (imRows[q2]._lbl) imL.push(imRows[q2]._lbl);
check('the toolbar has Insert: a photo, PDF pages, a sticky note, or a PDF or picture beside',
      imL.join('|') === 'Photo|PDF pages|Sticky note|Open a PDF beside|Open a picture beside', imL.join('|'));

var sv = fresh();
sv.win.__mnPdf.side(fakePdf(3), 'Ref.pdf');
var sv1 = sv.win.__mnPdf.split();
check('a PDF opens beside the note, and the page moves over for it',
      sv1.on && sv1.pane.indexOf('on at-right') === 0 && parseInt(sv1.right, 10) > 200 && sv1.pages === 3,
      JSON.stringify(sv1));
sv.win.__mnPdf.place('bottom');
var sv2 = sv.win.__mnPdf.split();
check('...it can sit below the page instead', sv2.at === 'bottom' && parseInt(sv2.bottom, 10) > 150 && !sv2.right,
      JSON.stringify(sv2));
sv.els.spClose._fire('click', {});
var sv3 = sv.win.__mnPdf.split();
check('...and closing it gives the page all its room back',
      !sv3.on && !sv3.right && !sv3.bottom && !sv3.left && !sv3.top, JSON.stringify(sv3));

/* ---------- the home screen ----------
 * Samsung's tablet home: a rail with All notes, Favorites, Trash and the
 * folders; each note a miniature with a menu of its own; long-press to
 * select several; deleting goes to the trash and can come back. */
function saved(app, id) { app.state(); return app.note(id); }
var hm = fresh();
(function () {
  hm.els.newNbBtn._fire('click', {}); hm.dlg('Physics');
  for (var i = 0; i < 3; i++) {
    hm.els.fabNew._fire('click', {}); hm.flushFrames();
    hm.els.backBtn._fire('click', {}); hm.flushFrames();
  }
})();
check('a new folder opens, and new notes go into it',
      hm.home().kind === 'nb' && hm.home().title === 'Physics' && hm.home().cards === 3,
      hm.home().kind + ' "' + hm.home().title + '", ' + hm.home().cards + ' cards');
check('...each a miniature of its page', hm.home().previews === 3, hm.home().previews + ' previews');
check('...with a menu of its own', hm.home().mores === 3, hm.home().mores + ' menus');

/* rename from the card's menu, without opening the note */
var hmRen = hm.home().ids[0];
hm.home().els[0]._more._fire('click', {});
hm.popPick('Rename');
hm.dlg('Mechanics');
check('a note can be renamed from the home screen',
      hm.home().titles.indexOf('Mechanics') >= 0, hm.home().titles.join(', '));
check('...and the name is saved, though the note is not the open one',
      saved(hm, hmRen).title === 'Mechanics', saved(hm, hmRen).title);

/* sort: a menu of keys, the same key again turns the order round */
hm.els.homeSortBtn._fire('click', {});
hm.popPick('Title');
check('the sort menu orders by title, A to Z',
      hm.home().sort === 'title' && hm.home().desc === false && hm.home().titles[0] === 'Mechanics',
      hm.home().sort + (hm.home().desc ? ' desc' : ' asc') + ': ' + hm.home().titles.join(', '));
hm.els.homeSortBtn._fire('click', {});
hm.popPick('Title');
check('...and choosing it again turns it round',
      hm.home().desc === true && hm.home().titles[2] === 'Mechanics', hm.home().titles.join(', '));

/* list mode */
hm.els.homeViewBtn._fire('click', {});
check('the view control switches to one note to a row', hm.home().list === true, 'list ' + hm.home().list);
hm.els.homeViewBtn._fire('click', {});
check('...and back to a grid', hm.home().list === false, 'list ' + hm.home().list);

/* All notes is every folder at once */
hm.els.hmNav.children[0]._fire('click', {});
check('All notes shows the notes of every folder',
      hm.home().kind === 'all' && hm.home().cards === 4, hm.home().kind + ', ' + hm.home().cards + ' cards');

/* favourites */
var hmFav = hm.home().ids[1];
hm.home().els[1]._more._fire('click', {});
hm.popPick('Add to favorites');
hm.els.hmNav.children[1]._fire('click', {});
check('a favorite shows under Favorites',
      hm.home().kind === 'fav' && hm.home().cards === 1 && hm.home().ids[0] === hmFav,
      hm.home().kind + ', ' + hm.home().cards + ' cards');
check('...and is saved as one', saved(hm, hmFav).fav === 1, 'fav ' + saved(hm, hmFav).fav);

/* the trash */
hm.els.hmNav.children[0]._fire('click', {});
var hmDel = hm.home().ids[0];
hm.home().els[0]._more._fire('click', {});
hm.popPick('Delete');
check('deleting moves a note to the trash rather than away',
      hm.home().cards === 3 && saved(hm, hmDel) && saved(hm, hmDel).trash > 0,
      hm.home().cards + ' cards, trash ' + (saved(hm, hmDel) && saved(hm, hmDel).trash));
hm.els.hmNav.children[2]._fire('click', {});
check('...where it waits', hm.home().kind === 'trash' && hm.home().ids[0] === hmDel,
      hm.home().kind + ', ' + hm.home().ids.join(','));
hm.home().els[0]._more._fire('click', {});
hm.popPick('Restore');
check('...and from where it comes back', !saved(hm, hmDel).trash && hm.home().cards === 0 && hm.home().empty,
      'trash ' + saved(hm, hmDel).trash + ', ' + hm.home().cards + ' left in the trash');

/* select several and move them */
hm.els.hmNav.children[0]._fire('click', {});
var hmMv = hm.home().ids.slice(0, 2);
hm.home().els[0]._fire('contextmenu', { preventDefault: function () {} });   /* the long press */
hm.home().els[1]._fire('click', {});
check('a long press starts selecting, a tap adds to it', hm.home().sel === 2, 'selected ' + hm.home().sel);
hm.els.hsMove._fire('click', {});
hm.dlgPick('My Notes');
(function () {
  var nbs = hm.state().notebooks, mine = null, i;
  for (i = 0; i < nbs.length; i++) if (nbs[i].title === 'My Notes') mine = nbs[i];
  check('...and the selected notes move to the folder picked',
        mine && mine.notes.indexOf(hmMv[0]) >= 0 && mine.notes.indexOf(hmMv[1]) >= 0 && hm.home().sel === -1,
        mine ? mine.notes.join(',') + ' / sel ' + hm.home().sel : 'no My Notes');
})();

/* from the trash, deleting is for good */
var hmGone = hm.home().ids[0];
hm.home().els[0]._more._fire('click', {});
hm.popPick('Delete');
hm.els.hmNav.children[2]._fire('click', {});
hm.home().els[0]._more._fire('click', {});
hm.popPick('Delete for good');
hm.dlg();
check('deleting from the trash is for good', !saved(hm, hmGone) && hm.home().cards === 0,
      saved(hm, hmGone) ? 'still stored' : hm.home().cards + ' cards');

/* A note opened from the home slides in, and mid-slide the browser reports
   the page 30px along. Measured then, every stroke of the note landed 30px
   left of the pen. The page's resting place is what must be used. */
var pw = fresh();
pw.wrap.offsetLeft = 0; pw.wrap.offsetTop = 56; pw.wrap.offsetParent = pw.els.drawView;
pw.els.drawView.offsetLeft = 0; pw.els.drawView.offsetTop = 0;
(function () {
  var realRect = pw.wrap.getBoundingClientRect;
  pw.wrap.getBoundingClientRect = function () {
    var r = realRect.call(this);
    if (String(pw.els.drawView.className).indexOf('enter') >= 0) r.left += 30;   /* painted mid-slide */
    return r;
  };
})();
pw.els.backBtn._fire('click', {}); pw.flushFrames();
pw.home().els[0]._fire('click', {}); pw.flushFrames();
pw.stroke({ id: 1, x0: 300, y0: 356, x1: 420, y1: 380, speed: 0.3 });
pw.tick(120);
check('a note opened from the home is written exactly where the pen is',
      pw.strokes().length === 1 && Math.abs(pw.strokes()[0].pts[0][0] - 300) < 1 && Math.abs(pw.strokes()[0].pts[0][1] - 300) < 1,
      pw.strokes()[0] ? 'first point ' + pw.strokes()[0].pts[0].slice(0, 2).join(',') + ' for a pen at 300,300' : 'no stroke');

/* opening a folder scales the notes up into place */
var hm3 = fresh();
(function () {
  hm3.els.newNbBtn._fire('click', {}); hm3.dlg('Physics');
  hm3.els.fabNew._fire('click', {}); hm3.flushFrames();
  hm3.els.backBtn._fire('click', {}); hm3.flushFrames();
  hm3.els.hmNav.children[0]._fire('click', {});
})();
var nbItems = hm3.els.nbList.children, nbTarget = null;
for (var k = 0; k < nbItems.length; k++) {
  var rowEl = nbItems[k].children[0];
  if (rowEl && String(rowEl.innerHTML).indexOf('Physics') >= 0) {
    nbTarget = rowEl;                          /* the row itself */
    break;
  }
}
if (nbTarget) nbTarget._fire('click', {});
check('opening a folder scales the notes up',
      hm3.els.notesGrid.className.indexOf('scale-up') >= 0 && hm3.home().title === 'Physics',
      'class "' + hm3.els.notesGrid.className + '", ' + hm3.home().title);

/* ---------- covers ---------- */
function covPick(a, box, lbl) {
  var k = a.els[box].children, i;
  for (i = 0; i < k.length; i++) if (k[i]._lbl === lbl) { k[i]._fire('click', {}); return true; }
  return false;
}
var cva = fresh();
cva.els.backBtn._fire('click', {});
cva.flushFrames();
var cvId = cva.home().ids[0];
cva.home().els[0]._more._fire('click', {});
cva.popPick('Cover');
check("a note's menu has Cover, which opens the cover picker", cva.els.covSheet.className === 'on', cva.els.covSheet.className);
covPick(cva, 'covGrid', 'Sunset');
var cvEmo = cva.els.covEmo.children[4]._lbl;
cva.els.covEmo.children[4]._fire('click', {});
cva.els.covDone._fire('click', {});
cva.flushFrames();
cva.state();                     /* flush the save */
var cvRec = cva.note(cvId);
check('Done gives the note that design and emoji', cvRec.cover && cvRec.cover.d === 11 && cvRec.cover.e === cvEmo && cvEmo.length === 2,
      JSON.stringify(cvRec.cover));
var cvPrev = cva.home().els[0].children[0];
check('...and its card wears the cover instead of a picture of the page',
      cvPrev.style.backgroundColor === '#F08A5D' && cvPrev.children[0] && cvPrev.children[0].className === 'cv-face',
      cvPrev.style.backgroundColor + ' / ' + (cvPrev.children[0] && cvPrev.children[0].className));
cva.home().els[0]._more._fire('click', {});
cva.popPick('Cover');
covPick(cva, 'covGrid', 'None');
cva.els.covDone._fire('click', {});
cva.flushFrames();
cva.state();
check('None takes the cover off, and the page shows again', !cva.note(cvId).cover &&
      cva.home().els[0].children[0].style.backgroundColor !== '#F08A5D', JSON.stringify(cva.note(cvId).cover));
cva.els.nbList.children[0].children[1]._fire('click', {});
cva.popPick('Cover');
covPick(cva, 'covGrid', 'Ocean');
cva.els.covDone._fire('click', {});
cva.flushFrames();
check("a folder's menu gives the folder a cover too", cva.state().notebooks[0].cover && cva.state().notebooks[0].cover.d === 12,
      JSON.stringify(cva.state().notebooks[0].cover));
cva.els.nbList.children[0].children[0]._fire('click', {});
cva.flushFrames();
check('...shown across the top of the folder when it is opened', cva.els.notesGrid.children[0].className.indexOf('hm-cover') === 0,
      cva.els.notesGrid.children[0].className);

/* ---------- maths answers ---------- */
/* the user's own symbols, from the reference lines they wrote on the iPad */
var fsM = require('fs'), pathM = require('path');
function mBox(list) {
  var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, list: list };
  list.forEach(function (s) { s.pts.forEach(function (p) {
    b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); }); });
  return b;
}
function mSyms(file) {
  var d = JSON.parse(fsM.readFileSync(pathM.join(__dirname, '..', 'traces', file)));
  var syms = d.ink.map(function (s) { return mBox([s]); }), merged = true, i, q;
  while (merged) {
    merged = false;
    for (i = 0; i < syms.length && !merged; i++) for (q = i + 1; q < syms.length; q++) {
      var a = syms[i], b = syms[q], ov = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      var inside = (a.x0 >= b.x0 - 3 && a.x1 <= b.x1 + 3) || (b.x0 >= a.x0 - 3 && b.x1 <= a.x1 + 3);
      if (ov > Math.max(Math.min(a.x1 - a.x0, b.x1 - b.x0), 6) * 0.5 || (inside && ov > -3)) {
        syms[i] = mBox(a.list.concat(b.list)); syms.splice(q, 1); merged = true; break;
      }
    }
  }
  return syms.sort(function (a, b) { return a.x0 - b.x0; });
}
function mFile(prefix) {
  return fsM.readdirSync(pathM.join(__dirname, '..', 'traces')).filter(function (f) { return f.indexOf(prefix) === 0; })[0];
}
/* lay symbols out left to right on one line, each at scale k, raised by up */
function mLine(parts, x) {
  var out = [];
  x = x || 200;
  parts.forEach(function (pt) {
    var s = pt.s, k = pt.k || 1, cy = (s.y0 + s.y1) / 2, gap = pt.gap === undefined ? 10 : pt.gap;
    s.list.forEach(function (st) {
      out.push({ pen: 0, w: 3, pts: st.pts.map(function (p) {
        return [x + (p[0] - s.x0) * k, 400 - (pt.up || 0) + (p[1] - cy) * k, p[2]]; }) });
    });
    x += (s.x1 - s.x0) * k + gap;
  });
  return out;
}
/* "a1+a2=10" and "x2+y2=z2" from the second takes - the templates were made from the first */
var mA = mSyms(mFile('ref-M2-neat-2')), mB = mSyms(mFile('ref-M1-neat-2'));
var ma = fresh(), MM = ma.win.__mnMath;
function calc(str) {
  var t = [], i, up = false;
  for (i = 0; i < str.length; i++) { if (str[i] === '^') { up = true; continue; } t.push({ c: str[i], sup: up }); }
  return MM.calc(t);
}
check('a sum is worked out in the usual order: 2+3x4 is 14, (2+3)x4 is 20, 2(3+4) is 14',
      calc('2+3x4') === 14 && calc('(2+3)x4') === 20 && calc('2(3+4)') === 14,
      calc('2+3x4') + ' ' + calc('(2+3)x4') + ' ' + calc('2(3+4)'));
check('...divides, subtracts left to right, raises to powers and takes minus signs',
      calc('7÷2') === 3.5 && calc('10-4-3') === 3 && calc('2^10') === 1024 && calc('-3+5') === 2 && calc('1.5x4') === 6,
      [calc('7÷2'), calc('10-4-3'), calc('2^10'), calc('-3+5'), calc('1.5x4')].join(' '));
check('...and gives up on nonsense instead of guessing', calc('1/0') === null && calc('2++') === null && calc('1..2+1') === null);
check('answers read the way a person writes them: 0.1+0.2 is 0.3, a third is 0.333333',
      MM.fmt(0.1 + 0.2) === '0.3' && MM.fmt(1 / 3) === '0.333333' && MM.fmt(12) === '12', MM.fmt(0.1 + 0.2) + ' ' + MM.fmt(1 / 3));
/* 10 + 2 = in the user's own hand: the 1 0 of "10", and the + 2 = of "a1 + a2 =" */
ma.loadInk(mLine([{ s: mA[6], gap: 6 }, { s: mA[7], gap: 18 }, { s: mA[2], gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[5] }]));
var maAns = MM.now();
check('"10 + 2 =" in the user\'s own handwriting is answered 12', maAns && maAns.txt === '12', maAns ? maAns.txt : 'no answer');
ma.loadInk(mLine([{ s: mA[0], gap: 4 }, { s: mA[1], gap: 16 }, { s: mA[2], gap: 16 }, { s: mA[3], gap: 4 }, { s: mA[4], gap: 16 }, { s: mA[5] }]));
check('...while "a1 + a2 =" is algebra, and gets no answer at all', !MM.now(), JSON.stringify(MM.ans() && MM.ans().txt));
ma.loadInk(mLine([{ s: mB[1], gap: 3 }, { s: mB[1], k: 0.55, up: 22, gap: 18 }, { s: mA[5] }]));
check('a small 2 raised after a 2 is a power: 2 squared = 4', MM.now() && MM.ans().txt === '4', JSON.stringify(MM.ans() && MM.ans().txt));
/* a half plus a half, each written as a 1 over a bar over a 2 */
function mFrac(x) {
  var one = mA[6], two = mA[4], k = 0.6, out = [];
  function put(s, dx, dy) {
    s.list.forEach(function (st) { out.push({ pen: 0, w: 3, pts: st.pts.map(function (p) {
      return [x + dx + (p[0] - s.x0) * k, 400 + dy + (p[1] - (s.y0 + s.y1) / 2) * k, 0]; }) }); });
  }
  put(one, 12, -16);
  out.push({ pen: 0, w: 3, pts: [[x, 400, 0], [x + 15, 400.5, 30], [x + 30, 400, 60], [x + 44, 400, 90]] });
  put(two, 8, 17);
  return out;
}
ma.loadInk(mFrac(200).concat(mLine([{ s: mA[2] }], 262)).concat(mFrac(300)).concat(mLine([{ s: mA[5] }], 362)));
check('fractions written one over the other: a half plus a half = 1', MM.now() && MM.ans().txt === '1',
      JSON.stringify(MM.ans() && MM.ans().txt));

/* written with the pen, through the ink engine: 1 + 1 = */
function onePlusOne(a) {
  scPath(a, 1, [[300, 380], [300, 400], [301, 420]]);
  scPath(a, 2, [[330, 400], [345, 400], [360, 400]]);
  scPath(a, 3, [[345, 386], [345, 400], [345, 414]]);
  scPath(a, 4, [[390, 380], [390, 400], [391, 420]]);
  scPath(a, 5, [[420, 395], [435, 395], [450, 395]]);
  scPath(a, 6, [[420, 407], [435, 407], [450, 407]]);
}
var mw = scApp();
onePlusOne(mw);
var mwA = mw.win.__mnMath.now();
check('written with the pen, "1 + 1 =" shows 2 just after the equals sign',
      mwA && mwA.txt === '2' && mwA.x > 450, mwA ? mwA.txt + ' at ' + Math.round(mwA.x) : 'no answer');
var mwOff = scApp({ mathOn: false });
onePlusOne(mwOff);
check('with Maths answers off, nothing is answered', !mwOff.win.__mnMath.now());

/* Teach my handwriting: ten marks on the page become the user's own 0-9 */
var mt = scApp();
mt.win.__mnMath.teachStart();
check('Teach asks for the digits in a row', mt.els.mathTeach.className === 'on' &&
      String(mt.els.mathTeachMsg.textContent).indexOf('0 1 2 3') >= 0, mt.els.mathTeachMsg.textContent);
for (var mti = 0; mti < 10; mti++) {
  scPath(mt, 10 + mti, [[120 + mti * 70, 380], [140 + mti * 70, 400], [120 + mti * 70, 420], [140 + mti * 70, 440]]);
}
mt.els.mathTeachDone._fire('click', {});
mt.flushFrames();
var mtG = JSON.parse(mt.storage.getItem('mathnotes_glyphs') || '[]');
check('Done keeps them as the user\'s own digits and takes the teaching ink off the page',
      mtG.length === 10 && mtG[0][0] === '9' && mt.strokes().length === 0,
      mtG.length + ' kept, ' + mt.strokes().length + ' left on the page');
check('...then asks for times and brackets', mt.win.__mnMath.teach().step === 1 &&
      String(mt.els.mathTeachMsg.textContent).indexOf('brackets') >= 0, mt.els.mathTeachMsg.textContent);
mt.els.mathTeachCancel._fire('click', {});
check('Cancel ends the teaching', mt.els.mathTeach.className === '' && !mt.win.__mnMath.teach());

/* ---------- Neaten: on the user's own recorded lines ----------
 * How far each full-size stroke's foot sits from the line's baseline,
 * added up. Tidy made this worse on real lines (it lifted whole words to
 * where exponents go); Neaten may only ever make it smaller. */
/* where a stroke sits: the band most of its letters' bottoms share (the
   place the pen turned back up), not its lowest point - a q or an f hangs
   below the line it is written on */
function neFoot(p, h) {
  var bots = [], j, k, low;
  for (j = 0; j < p.length; j++) {
    low = true;
    for (k = Math.max(0, j - 3); k <= Math.min(p.length - 1, j + 3) && low; k++) if (p[k][1] > p[j][1]) low = false;
    if (low) bots.push(p[j][1]);
  }
  var best = bots[0], bn = 0;
  bots.forEach(function (v) {
    var near = bots.filter(function (w) { return Math.abs(w - v) <= h * 0.12; });
    var m = near.reduce(function (t, w) { return t + w; }, 0) / near.length;
    if (near.length > bn || (near.length === bn && m < best)) { bn = near.length; best = m; }
  });
  return best;
}
function neScore(strokes) {
  var rows = strokes.filter(function (s) { return s.pts.length > 1; }).map(function (s) {
    var y0 = 1e9, y1 = -1e9;
    s.pts.forEach(function (p) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    return { foot: neFoot(s.pts, y1 - y0), h: y1 - y0 };
  });
  var hs = rows.map(function (r) { return r.h; }).sort(function (a, b) { return a - b; }), hm = hs[hs.length >> 1] || 1;
  var core = rows.filter(function (r) { return r.h >= hm * 0.6; }).map(function (r) { return r.foot; }).sort(function (a, b) { return a - b; });
  var base = core[core.length >> 1];
  return core.reduce(function (t, f) { return t + Math.abs(f - base); }, 0);
}
var neWorse = [], neB = 0, neA = 0;
fsM.readdirSync(pathM.join(__dirname, '..', 'traces')).filter(function (f) { return /^ref-(E|M)/.test(f); }).forEach(function (f) {
  var d = JSON.parse(fsM.readFileSync(pathM.join(__dirname, '..', 'traces', f)));
  if (!d.ink || !d.ink.length) return;
  var na = fresh();
  na.loadInk(d.ink.map(function (s) { return { pen: s.pen, w: s.w, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; }));
  var b = neScore(na.strokes());
  na.win.__mnNeaten();
  na.flushFrames();
  var a2 = neScore(na.strokes());
  neB += b; neA += a2;
  if (a2 > b * 1.15 + 3) neWorse.push(f.slice(0, 16) + ' ' + Math.round(b) + '->' + Math.round(a2));
});
check('Neaten leaves none of the user\'s recorded lines worse aligned than they were', neWorse.length === 0, neWorse.join(', '));
check('...and sets them straighter overall', neA < neB * 0.9, Math.round(neB) + ' -> ' + Math.round(neA) + ' px off the line in all');
var nx = fresh();
nx.loadInk(JSON.parse(fsM.readFileSync(pathM.join(__dirname, '..', 'traces', mFile('ref-M1-neat-1')))).ink.map(function (s) {
  return { pen: s.pen, w: s.w, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; }));
var nxB = nx.strokes();
nx.win.__mnNeaten();
nx.flushFrames();
var nxA = nx.strokes(), nxMax = 0;
/* How each stroke moved up or down. Turning the line level moves its two
   ends opposite ways, so the moves are fitted with a straight line across
   the page first; what is left over is a stroke moved on its own. */
function nxMid(s) { var x = 0, y = 0; s.pts.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / s.pts.length, y / s.pts.length]; }
var nxP = nxA.map(function (s, i) { return [nxMid(nxB[i])[0], nxMid(s)[1] - nxMid(nxB[i])[1]]; });
var nxn = nxP.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
nxP.forEach(function (q) { sx += q[0]; sy += q[1]; sxx += q[0] * q[0]; sxy += q[0] * q[1]; });
var nxm = (nxn * sxy - sx * sy) / (nxn * sxx - sx * sx), nxc = (sy - nxm * sx) / nxn;
nxP.forEach(function (q) { nxMax = Math.max(nxMax, Math.abs(q[1] - (nxm * q[0] + nxc))); });
check('"x2 + y2 = z2" moves as one piece: no 2 is lifted away from its letter', nxMax < 4, 'strokes shifted apart by up to ' + nxMax.toFixed(1) + 'px');

/* an i's dot is a single touch of the pen, and goes where its i goes */
function neInk(prefix) {
  return JSON.parse(fsM.readFileSync(pathM.join(__dirname, '..', 'traces', mFile(prefix)))).ink
    .filter(function (s) { return s.pts.length; })
    .map(function (s) { return { pen: s.pen, w: s.w, ord: s.ord, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; });
}
var nd = fresh();
nd.loadInk(neInk('ref-E3-norm-1'));
var ndB = nd.strokes();
nd.win.__mnNeaten();
nd.flushFrames();
var ndA = nd.strokes(), ndWorst = 0, ndDots = 0;
ndB.forEach(function (d, i) {
  if (d.pts.length !== 1) return;
  ndDots++;
  /* the nearest point of another stroke: how far it moved, against how far the dot did */
  var best = null, bd = 1e9;
  ndB.forEach(function (s, k) {
    if (s.pts.length < 2) return;
    s.pts.forEach(function (p, j) { var e = Math.pow(p[0] - d.pts[0][0], 2) + Math.pow(p[1] - d.pts[0][1], 2); if (e < bd) { bd = e; best = [k, j]; } });
  });
  var hb = ndB[best[0]].pts[best[1]], ha = ndA[best[0]].pts[best[1]];
  ndWorst = Math.max(ndWorst, Math.abs((ndA[i].pts[0][1] - d.pts[0][1]) - (ha[1] - hb[1])));
});
check('Neaten takes an i\'s dot along with its word', ndDots === 2 && ndWorst < 2.5, ndDots + ' dots, left behind by up to ' + ndWorst.toFixed(1) + 'px');

/* A word that slipped off the line is set back on it. One word of a neat
   line is dropped a third of an x-height; neatened, the line should come
   out as it does when nothing was dropped - laid over each other as a
   whole (a levelling is not a difference), the points should sit closer
   than the drop put them. */
function neAlign(A, B) {
  var a = [], b = [];
  A.forEach(function (s, i) { s.pts.forEach(function (p, j) { a.push(p); b.push(B[i].pts[j]); }); });
  var ax = 0, ay = 0, bx = 0, by = 0, n = a.length, sc = 0, ss = 0, t = 0, i;
  for (i = 0; i < n; i++) { ax += a[i][0] / n; ay += a[i][1] / n; bx += b[i][0] / n; by += b[i][1] / n; }
  for (i = 0; i < n; i++) { var u = a[i][0] - ax, v = a[i][1] - ay, p = b[i][0] - bx, q = b[i][1] - by; sc += u * p + v * q; ss += u * q - v * p; }
  var th = Math.atan2(ss, sc), c = Math.cos(th), sn = Math.sin(th);
  for (i = 0; i < n; i++) {
    var u2 = a[i][0] - ax, v2 = a[i][1] - ay;
    t += Math.sqrt(Math.pow(bx + u2 * c - v2 * sn - b[i][0], 2) + Math.pow(by + u2 * sn + v2 * c - b[i][1], 2));
  }
  return t / n;
}
var nsInk = neInk('ref-E3-neat-1'), nsDrop = JSON.parse(JSON.stringify(nsInk));
/* "wax": the strokes between the two widest gaps */
var nsBox = nsDrop.map(function (s, i) { var x0 = 1e9, x1 = -1e9; s.pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }); return { i: i, x0: x0, x1: x1 }; })
  .sort(function (a, b) { return a.x0 - b.x0; });
var nsGaps = [], nsR = nsBox[0].x1;
nsBox.forEach(function (o, k) { if (k && o.x0 > nsR) nsGaps.push({ k: k, g: o.x0 - nsR }); nsR = Math.max(nsR, o.x1); });
nsGaps.sort(function (a, b) { return b.g - a.g; });
var nsCut = nsGaps.slice(0, 2).map(function (g) { return g.k; }).sort(function (a, b) { return a - b; });
nsBox.slice(nsCut[0], nsCut[1]).forEach(function (o) { nsDrop[o.i].pts.forEach(function (p) { p[1] += 7; }); });
var nsA = fresh(); nsA.loadInk(nsInk); nsA.win.__mnNeaten(); nsA.flushFrames();
var nsB = fresh(); nsB.loadInk(nsDrop); var nsB0 = nsB.strokes(); nsB.win.__mnNeaten(); nsB.flushFrames();
var nsBefore = neAlign(nsA.strokes(), nsB0), nsAfter = neAlign(nsA.strokes(), nsB.strokes());
check('Neaten sets a word that slipped down the line back on it', nsAfter < nsBefore * 0.5,
      'dropped: ' + nsBefore.toFixed(2) + 'px off, neatened: ' + nsAfter.toFixed(2) + 'px');

/* two rows squeezed into one rule's space are not dropped into each other */
var nq = fresh(), nqi;
nq.loadInk([0, 1, 2].map(function (k) { return { pen: 0, w: 3, pts: scWord(120 + k * 200, 420).map(function (p) { return [p[0], p[1], 0]; }) }; })
  .concat([0, 1, 2].map(function (k) { return { pen: 0, w: 3, pts: scWord(140 + k * 200, 444).map(function (p) { return [p[0], p[1], 0]; }) }; })));
nq.win.__mnNeaten();
nq.flushFrames();
var nqS = nq.strokes(), nqGap = 1e9;
for (nqi = 0; nqi < 3; nqi++) nqGap = Math.min(nqGap, nqS[nqi + 3].pts[0][1] - nqS[nqi].pts[0][1]);
check('...and two rows squeezed into one ruled space are not snapped into each other', nqGap > 22,
      'rows ' + nqGap.toFixed(1) + 'px apart (written 24 apart)');

/* ---------- maths answers: working, keeping, fixing ---------- */
function stepsOf(str) {
  var t = [], i, up = false;
  for (i = 0; i < str.length; i++) { if (str[i] === '^') { up = true; continue; } t.push({ c: str[i], sup: up }); }
  return (ma.win.__mnMath.steps(t) || []).join(' | ');
}
check('the working goes the way it is done on paper: brackets first, then times, then plus',
      stepsOf('(3+5)x12') === '8 × 12 | 96' && stepsOf('2+3x4') === '2 + 12 | 14',
      stepsOf('(3+5)x12') + ' / ' + stepsOf('2+3x4'));
check('...powers are worked out together, and written raised', stepsOf('5^2') === '25' &&
      stepsOf('2+3^2') === '2 + 9 | 11', stepsOf('5^2') + ' / ' + stepsOf('2+3^2'));

var mk = scApp();
onePlusOne(mk);
var mkA = mk.win.__mnMath.now();
check('the answer stays on the page with Keep, Fix and close under it', mkA && mkA.txt === '2' && mk.els.mathBar.className === 'on' &&
      mk.els.mathKeepW.style.display === 'none', mk.els.mathBar.className);
mk.tick(9000);
mk.flushFrames();
check('...and is still there long after - it no longer fades on a timer', !!mk.win.__mnMath.ans());
mk.els.mathKeepA._fire('click', {});
mk.flushFrames();
var mkT = mk.strokes().filter(function (s) { return s.pen === 5; });
check('Keep writes the answer into the note, in a handwriting face, after the =',
      mkT.length === 1 && mkT[0].txt === '2' && mkT[0].font === 'hand' && mkT[0].pts[0][0] > 450 &&
      mk.els.mathBar.className === '', JSON.stringify(mkT.map(function (s) { return [s.txt, s.font, Math.round(s.pts[0][0])]; })));
mk.undo();
check('...and one undo takes it off again', mk.strokes().filter(function (s) { return s.pen === 5; }).length === 0);

/* Keep tapped while the hand rests on the page: the palm is a second touch,
   and the tap was refused for it (reported) */
var mp = scApp();
onePlusOne(mp);
mp.win.__mnMath.now();
function docTouch(a, type, changed, all) {
  (a.doc._h[type] || []).forEach(function (fn) { fn({ changedTouches: changed, touches: all, target: changed[0].target, preventDefault: function () {} }); });
}
var mpBtn = mp.els.mathKeepA, mpPalm = { identifier: 90, clientX: 700, clientY: 600, target: mp.els.canvasWrap };
mpBtn.tagName = 'BUTTON';
mpBtn.click = function () { this._fire('click', {}); };
mp.doc.elementFromPoint = function () { return mpBtn; };
docTouch(mp, 'touchstart', [mpPalm], [mpPalm]);
var mpTap = { identifier: 91, clientX: 480, clientY: 450, target: mpBtn };
docTouch(mp, 'touchstart', [mpTap], [mpPalm, mpTap]);
mp.tick(80);
docTouch(mp, 'touchend', [mpTap], [mpPalm]);
mp.flushFrames();
check('Keep works with the hand resting on the page', mp.strokes().filter(function (s) { return s.pen === 5; }).length === 1,
      mp.strokes().filter(function (s) { return s.pen === 5; }).length + ' answers kept');

var mw2 = fresh();
/* 2 squared + 2 squared = : two steps of working */
mw2.loadInk(mLine([{ s: mB[1], gap: 3 }, { s: mB[1], k: 0.55, up: 22, gap: 16 }, { s: mA[2], gap: 16 },
                   { s: mB[1], gap: 3 }, { s: mB[1], k: 0.55, up: 22, gap: 18 }, { s: mA[5] }]));
var mwA2 = mw2.win.__mnMath.now();
check('a sum with working offers Keep answer and Keep working', mwA2 && mwA2.txt === '8' && mwA2.steps.join(' | ') === '4 + 4 | 8' &&
      mw2.els.mathKeepA.textContent === 'Keep answer' && mw2.els.mathKeepW.style.display === '',
      mwA2 ? mwA2.steps.join(' | ') : 'no answer');
mw2.els.mathKeepW._fire('click', {});
mw2.flushFrames();
var mwT = mw2.strokes().filter(function (s) { return s.pen === 5; }).sort(function (a, b) { return a.pts[0][1] - b.pts[0][1]; });
check('...Keep working writes every step, each = under the first',
      mwT.length === 2 && mwT[0].txt === '4 + 4' && mwT[1].txt === '= 8' && mwT[1].pts[0][1] > mwT[0].pts[0][1] + 20,
      JSON.stringify(mwT.map(function (s) { return s.txt; })));

/* Fix: tap the 2 of "10 + 2", say it is a 3 - the answer changes and the 2 is remembered as a 3 */
var mfx = fresh();
mfx.win.__mnMath.mine([]);
var mfxInk = mLine([{ s: mA[6], gap: 6 }, { s: mA[7], gap: 18 }, { s: mA[2], gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[5] }]);
mfx.loadInk(JSON.parse(JSON.stringify(mfxInk)));
mfx.win.__mnMath.now();
mfx.els.mathFixBtn._fire('click', {});
var mfxChips = mfx.els.mathFixRead.children;
check('Fix shows what was read, symbol by symbol', mfx.els.mathFix.className === 'on' &&
      mfxChips.map(function (c) { return c.textContent; }).join('') === '10+2', mfxChips.map(function (c) { return c.textContent; }).join(''));
mfxChips[3]._fire('click', {});
var mfxKeys = mfx.els.mathFixKeys.children.filter(function (k) { return k._lbl === 'key 3'; });
mfxKeys[0]._fire('click', {});
check('...picking the right symbol reads the sum again', mfx.win.__mnMath.ans() && mfx.win.__mnMath.ans().txt === '13',
      JSON.stringify(mfx.win.__mnMath.ans() && mfx.win.__mnMath.ans().txt));
mfx.loadInk(JSON.parse(JSON.stringify(mfxInk)));
var mfxB = mfx.win.__mnMath.now();
check('...and remembers it: the same shape is read the user\'s way from then on', mfxB && mfxB.txt === '13',
      JSON.stringify(mfxB && mfxB.txt));

/* Not part of it: a mark that is no part of the sum, read as a symbol - one
   further along the line, or a scribble (asked for). Fix leaves it out, and
   the reader learns from it rather than needing telling every time. */
function notPart(app, idx) {
  app.els.mathFixBtn._fire('click', {});
  app.els.mathFixRead.children[idx]._fire('click', {});
  app.els.mathFixKeys.children.filter(function (k) { return k._lbl === 'key not'; })[0]._fire('click', {});
}
var mnFar = mLine([{ s: mB[1], gap: 60 }, { s: mA[6], gap: 6 }, { s: mA[7], gap: 18 }, { s: mA[2], gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[5] }]);
var mn1 = fresh();
mn1.win.__mnMath.mine([]);
mn1.loadInk(JSON.parse(JSON.stringify(mnFar)));
var mn1A = mn1.win.__mnMath.now();
check('a 2 written well before "10 + 2 =" is read into it: 212', mn1A && mn1A.txt === '212', JSON.stringify(mn1A && mn1A.txt));
notPart(mn1, 0);
check('Fix > the 2 > Not part of it: left out, the answer is 12 again', mn1.win.__mnMath.ans() && mn1.win.__mnMath.ans().txt === '12',
      JSON.stringify(mn1.win.__mnMath.ans() && mn1.win.__mnMath.ans().txt));
check('...the mark is remembered as no part of a sum, with the note',
      mn1.win.__mnRec().strokes.filter(function (s) { return s.nm; }).length === 1);
var mn1R = mn1.storage.getItem('mathnotes_reach');
var mn2 = fresh();
mn2.storage.setItem('mathnotes_reach', mn1R);
mn2.loadInk(JSON.parse(JSON.stringify(mnFar)));
var mn2A = mn2.win.__mnMath.now();
check('...and the reader learned how far this writer\'s sums reach: the same line written again is 12',
      +mn1R < 2.4 && mn2A && mn2A.txt === '12', 'reach ' + mn1R + ', read ' + JSON.stringify(mn2A && mn2A.txt));
function mnZig() {                 /* a scribble as tall as the digits */
  var pts = [], k;
  for (k = 0; k <= 8; k++) pts.push([k * 4, (k % 2 ? 18 : -18) + (k % 4 === 0 ? 3 : 0), k * 12]);
  return mBox([{ pts: pts }]);
}
var mn3 = fresh();
mn3.win.__mnMath.mine([]);
mn3.loadInk(mLine([{ s: mA[6], gap: 6 }, { s: mA[7], gap: 18 }, { s: mA[2], gap: 18 }, { s: mnZig(), gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[5] }]));
var mn3A = mn3.win.__mnMath.now();
notPart(mn3, 3);
check('a scribble read as a 4 (10 + 42) is left out with Not part of it: 12',
      mn3A && mn3A.txt === '52' && mn3.win.__mnMath.ans() && mn3.win.__mnMath.ans().txt === '12',
      JSON.stringify(mn3A && mn3A.txt) + ' -> ' + JSON.stringify(mn3.win.__mnMath.ans() && mn3.win.__mnMath.ans().txt));
var mnG = mn3.storage.getItem('mathnotes_glyphs');
var mn4 = fresh();
mn4.storage.setItem('mathnotes_glyphs', mnG);
mn4.loadInk(mLine([{ s: mA[6], gap: 6 }, { s: mA[7], gap: 18 }, { s: mA[2], gap: 18 }, { s: mA[4], gap: 18 }, { s: mnZig(), gap: 18 }, { s: mA[5] }]));
var mn4A = mn4.win.__mnMath.now();
check('...and its shape is learned as no symbol: the next one is left out by itself',
      mn4A && mn4A.txt === '12', JSON.stringify(mn4A && mn4A.txt));
var mn5 = fresh();
mn5.storage.setItem('mathnotes_glyphs', mnG);
mn5.loadInk(mLine([{ s: mA[6], gap: 18 }, { s: mnZig(), gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[2], gap: 18 }, { s: mA[4], gap: 18 }, { s: mA[5] }]));
check('...but never where leaving it out would run 1 and 2 together into 12: no answer, not a wrong one',
      !mn5.win.__mnMath.now(), JSON.stringify(mn5.win.__mnMath.ans() && mn5.win.__mnMath.ans().txt));

var mgo = scApp();
onePlusOne(mgo);
mgo.win.__mnMath.now();
scPath(mgo, 9, scWord(150, 600));
check('writing somewhere else puts the answer away', !mgo.win.__mnMath.ans() && mgo.els.mathBar.className === '');

/* ---------- lasso: turning a selection ---------- */
var srt = scApp(), srtP = [], srti;
for (srti = 0; srti <= 40; srti++) srtP.push([300 + srti * 5, 400]);
scPath(srt, 1, srtP);
lassoAround(srt, 280, 370, 520, 430);
var srtB = srt.win.__mnSelBox();
var hx = (srtB.x0 + srtB.x1) / 2, hy = srtB.y0 - 30, ocx = (srtB.x0 + srtB.x1) / 2, ocy = (srtB.y0 + srtB.y1) / 2;
/* the handle, then a quarter turn round the middle, in screen terms (+56 for the toolbar) */
srt.down(50, hx, hy + 56);
for (srti = 1; srti <= 12; srti++) {
  var ang = -Math.PI / 2 + (Math.PI / 2) * srti / 12, rr = ocy - hy;
  srt.tick(16);
  srt.moveTo(50, ocx + Math.cos(ang) * rr, ocy + Math.sin(ang) * rr + 56);
}
srt.tick(16); srt.up(50); srt.tick(100); srt.flushFrames();
function spanOf(s) { var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; s.pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); return [x1 - x0, y1 - y0]; }
var srtS = spanOf(srt.strokes()[0]);
check('the lasso\'s turn handle turns a line a quarter turn, squared to upright', srtS[0] < 2 && srtS[1] > 190,
      'width ' + srtS[0].toFixed(1) + ', height ' + srtS[1].toFixed(1));
srt.undo();
srtS = spanOf(srt.strokes()[0]);
check('...and one undo turns it back', srtS[1] < 2 && srtS[0] > 190, 'width ' + srtS[0].toFixed(1) + ', height ' + srtS[1].toFixed(1));

/* ---------- the maths session, and sending notes to the PC ---------- */
var msn = fresh();
msn.ref().start(msn.ref().maths);
check('the maths session asks for the digits first, then the sums', msn.ref().on() && msn.ref().id() === 'mth-D1-norm-1' &&
      msn.ref().maths.length === 27 && msn.ref().take().text === '0 1 2 3 4 5 6 7 8 9',
      msn.ref().id() + ', ' + msn.ref().maths.length + ' takes');
msn.ref().exit();
var mbk = H.load({ quiet: true, win: { location: { protocol: 'http:' } } });
mbk.flushFrames();
mbk.els.backupText.value = JSON.stringify({ mathnotes: 1, at: 'now', sum: 1, body: '{}' });
mbk.els.backupSendBtn._fire('click', {});
var mbkS = mbk.requests().filter(function (r) { return r.url === '/backup'; });
check('opened from the PC, Send to this PC posts the pasted notes to it',
      mbkS.length === 1 && JSON.parse(mbkS[0].body).mathnotes === 1 && String(mbk.els.backupInfo.textContent).indexOf('Sent') === 0,
      mbkS.length + ' sent, ' + mbk.els.backupInfo.textContent);

/* ---------- storage: the room there is, and using less of it ----------
 * Safari keeps 2.6 million characters for a site, not the five million the
 * app assumed, so the store filled while the app thought it half empty -
 * and one refused write then switched saving off for the rest of the
 * session. Ink is now stored compact, the older versions' leftover copies
 * are cleared, and a full store is retried rather than given up on. */
(function () {
  var pk = fresh().win.__mnPack, bad = 0, maxErr = 0, i, j, pts, back, t;
  /* points of every awkward kind: negative, large, fractional, uneven gaps */
  for (i = 0; i < 200; i++) {
    pts = []; t = 1700000000000 + i * 777;
    for (j = 0; j < 1 + (i % 37); j++) {
      t += (j * 13 + i) % 40;
      pts.push([Math.sin(i * 7 + j) * 3000 + (i % 3 ? 20000 : -150), Math.cos(i + j * 3) * 900 + j * 0.37, t]);
    }
    back = pk.unpack(pk.pack(pts));
    if (!back || back.length !== pts.length) { bad++; continue; }
    for (j = 0; j < pts.length; j++) {
      maxErr = Math.max(maxErr, Math.abs(back[j][0] - Math.round(pts[j][0] * 10) / 10),
                                Math.abs(back[j][1] - Math.round(pts[j][1] * 10) / 10));
      if (back[j][2] !== (j ? Math.round(pts[j][2] - pts[j - 1][2]) : 0)) bad++;
    }
  }
  check('compact ink reads back exactly what was stored, to a tenth of a pixel',
        bad === 0 && maxErr < 1e-9, bad + ' wrong, largest error ' + maxErr);
  check('...and a damaged string is refused rather than misread', pk.unpack('AB!C') === null, JSON.stringify(pk.unpack('AB!C')));
})();

(function () {
  var cs = fresh();
  write(cs, 1); write(cs, 2);
  cs.state();
  var raw = cs.storage.getItem('mathnotes_v5_n_' + cs.state().cur.note), rec = JSON.parse(raw);
  var old = 0, i, j, p;
  for (i = 0; i < rec.strokes.length; i++) {
    p = cs.win.__mnPack.unpack(rec.strokes[i].z);
    for (j = 0; j < p.length; j++) old += JSON.stringify([p[j][0], p[j][1], p[j][2]]).length + 1;
  }
  var nowLen = 0;
  for (i = 0; i < rec.strokes.length; i++) nowLen += rec.strokes[i].z.length;
  check('a saved note keeps its ink compact, under a third of the old room',
        raw.indexOf('"pts"') < 0 && nowLen * 3 < old, nowLen + ' characters of points, against ' + old + ' before');
})();

/* a note saved the old way by an earlier version, with that version's own
   leftover copy of everything beside it */
function oldStore(missing) {
  var ids = missing ? ['o1', 'o2'] : ['o1'];
  var seed = {
    mathnotes_v5: JSON.stringify({ v: 5, noteIds: ids,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ids }], cur: { nb: 0, note: 'o1' }, set: {} }),
    mathnotes_v5_n_o1: JSON.stringify({ id: 'o1', title: 'Old', cr: 1, mod: 1, scroll: 0,
      strokes: [{ id: 's1', pen: 0, w: 3, color: '#000000', a: 1, ord: 1, pts: [[10, 10, 0], [20.5, 20, 16], [30, 25.2, 17]] }] }),
    mathnotes_v4: JSON.stringify({ v: 4, notebooks: [], notes: { o1: { id: 'o1', strokes: [] } } })
  };
  return H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 872, seed: seed });
}
var os1 = oldStore(false);
os1.flushFrames();
check('an older version\'s leftover copy is cleared once every note has loaded',
      os1.storage.getItem('mathnotes_v4') === null, 'v4 ' + (os1.storage.getItem('mathnotes_v4') ? 'still there' : 'gone'));
os1.save();
(function () {
  var raw = os1.storage.getItem('mathnotes_v5_n_o1'), rec = os1.note('o1');
  check('...a note stored the old way reads in, and is rewritten compact',
        raw.indexOf('"z"') > 0 && raw.indexOf('"pts"') < 0 && rec.strokes[0].pts.length === 3 &&
        rec.strokes[0].pts[1][0] === 20.5 && rec.strokes[0].pts[2][1] === 25.2 && rec.strokes[0].pts[2][2] === 17,
        JSON.stringify(rec.strokes[0].pts));
})();
var os2 = oldStore(true);
check('...but with a note missing, the old copy may be the last of it, and stays',
      os2.storage.getItem('mathnotes_v4') !== null, 'v4 ' + (os2.storage.getItem('mathnotes_v4') ? 'kept' : 'removed'));

/* a full iPad is not a private window: it still has the notes */
var pv = H.load({ quiet: true, storageFull: true });
check('a store that refuses writes and holds nothing is a private window', pv.win.__mnPack.ok() === false,
      'storage ok ' + pv.win.__mnPack.ok());
var fl = H.load({ quiet: true, storageFull: true,
  seed: { mathnotes_v5: JSON.stringify({ v: 5, noteIds: [], notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: [] }], set: {} }) } });
check('...one that refuses writes but holds notes is just full, and keeps trying', fl.win.__mnPack.ok() === true,
      'storage ok ' + fl.win.__mnPack.ok());

var sf = fresh();
write(sf, 1);
sf.storage._full = true;
sf.save();
check('when the iPad refuses a save, you are told the writing is not saved yet',
      sf.win.__mnPack.full() === true && sf.els.warning.style.display === 'block' &&
      String(sf.els.warning.textContent).indexOf('NOT saved') >= 0, String(sf.els.warning.textContent));
sf.storage._full = false;                        /* room is made */
write(sf, 2);
sf.tick(6000);                                   /* the next save comes round */
sf.save();
check('...and once there is room it saves again, with nothing lost',
      sf.win.__mnPack.full() === false && sf.strokes().length === 2, sf.strokes().length + ' strokes saved');

/* ---------- offline ---------- */
(function () {
  var h = {}, ac = {
    status: 0, UPDATEREADY: 4,
    addEventListener: function (t, fn) { h[t] = fn; },
    update: function () {}, swapCache: function () {}
  };
  var of = H.load({ quiet: true, win: { applicationCache: ac } });
  of.flushFrames();
  if (h.cached) h.cached();
  check('once the app is kept on the iPad it says it works without the internet',
        String(of.els.toast.textContent).indexOf('without the internet') >= 0, String(of.els.toast.textContent));
  if (h.updateready) h.updateready();
  check('...and when a newer version has come down it offers to restart into it',
        of.els.updBar.className === 'on', of.els.updBar.className);
})();
/* A home-screen app is hardly ever started afresh - its icon brings back the
   page iOS kept - so looking for a new version only when the page loads left
   it days behind Safari on the same iPad. It looks each time it comes back. */
(function () {
  var h = {}, ups = 0, swaps = 0, ac = {
    status: 1, UPDATEREADY: 4,
    addEventListener: function (t, fn) { h[t] = fn; },
    update: function () { ups++; }, swapCache: function () { swaps++; }
  };
  var bk = H.load({ quiet: true, win: { applicationCache: ac } });
  bk.flushFrames();
  function front() { var hs = bk.doc._h.visibilitychange || [], i; for (i = 0; i < hs.length; i++) hs[i]({}); }
  front();
  check('coming back to the front, the app looks for a new version', ups === 1, ups + ' looks');
  bk.tick(60000); front();
  check('...not every time it comes back - at most every ten minutes', ups === 1, ups + ' looks');
  bk.tick(10 * 60000); front();
  check('...and again once they have passed', ups === 2, ups + ' looks');
  ac.status = 4; front();
  check('a new version that came down while it was away is put in place as it comes back',
        swaps === 1 && bk.storage.getItem('mathnotes_updated') === '1', swaps + ' swaps');
})();
/* Settings > Check for updates: says which version this is, and when the
   cache will not see a newer one the internet has, gets past it or says how */
(function () {
  var h = {}, ups = 0, swaps = 0, ac = {
    status: 1, UPDATEREADY: 4,
    addEventListener: function (t, fn) { h[t] = fn; },
    update: function () { ups++; }, swapCache: function () { swaps++; }
  };
  var ck = H.load({ quiet: true, win: { applicationCache: ac } });
  ck.flushFrames();
  var build = ck.win.__mnUpd.build(), served = build, sent = [];
  check('the app knows its own version', /^[0-9a-f]{16}$/.test(build), build);
  /* the internet answers with the version this test says it has */
  function Net() {}
  Net.prototype.open = function (m, u) { this.url = u; this.hd = {}; };
  Net.prototype.setRequestHeader = function (k, v) { this.hd[k] = v; };
  Net.prototype.send = function () {
    sent.push({ url: this.url, hd: this.hd });
    this.readyState = 4; this.status = 200;
    this.responseText = 'CACHE MANIFEST\n# version ' + served + '\n';
    if (this.onreadystatechange) this.onreadystatechange();
  };
  ck.sandbox.XMLHttpRequest = Net;
  ck.clickMenu('Check for updates');
  check('Check for updates has the cache look at once', ups === 1, ups + ' looks');
  h.noupdate();
  check('...told there is nothing newer, it asks the internet itself, past every cache',
        sent.length === 1 && /^mathnotes\.appcache\?v=\d+$/.test(sent[0].url), JSON.stringify(sent));
  check('...and says this is the newest version', String(ck.els.toast.textContent).indexOf('newest version') >= 0,
        String(ck.els.toast.textContent));
  served = 'ffffffffffffffff';
  ck.clickMenu('Check for updates'); h.noupdate();
  check('a newer version the cache did not see: the manifest is fetched again past any stale copy, and the cache looks again',
        sent.length === 3 && sent[2].url === 'mathnotes.appcache' && sent[2].hd['Cache-Control'] === 'no-cache' && ups === 3,
        sent.length + ' requests, ' + ups + ' looks');
  h.noupdate();
  check('...and if the iPad still keeps the old one, it says what to do - without deleting anything',
        String(ck.els.dlgTitle.textContent).indexOf('newer version') >= 0 &&
        String(ck.els.dlgMsg.textContent).indexOf('swipe MathNotes up') >= 0 &&
        String(ck.els.dlgMsg.textContent).indexOf('do not delete the icon') >= 0, String(ck.els.dlgTitle.textContent));
  ck.clickMenu('Check for updates'); h.downloading(); h.updateready();
  check('found and downloaded when asked for, it is put in place at once', swaps === 1, swaps + ' swaps');
  ck.clickMenu('Check for updates'); h.error();
  check('no connection: it says so', String(ck.els.toast.textContent).indexOf('Could not reach the internet') >= 0,
        String(ck.els.toast.textContent));
})();
(function () {
  var cp = require('child_process'), path = require('path'), out = '';
  try { out = cp.execSync('node "' + path.join(__dirname, 'stamp_offline.js') + '" --check').toString(); }
  catch (e) { out = String(e.stdout || e.message); }
  check('the offline copy\'s manifest matches the files it lists (run stamp_offline.js after a change)',
        out.indexOf('OK') === 0, out.trim());
})();

console.log(String.fromCharCode(10) + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
