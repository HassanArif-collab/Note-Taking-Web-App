/* test_recorder.js - always-on flight recorder + gesture instrumentation.
   Run: node scripts/test_recorder.js */
'use strict';
var H = require('./harness.js');
var pass = 0, fail = 0;
function check(n, c, d) {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  (' + d + ')' : '')); }
}
function fresh() {
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712 });
  a.flushFrames(); return a;
}
console.log('\nflight recorder\n');

var app = fresh();
app.stroke({ id: 1, x0: 300, y0: 300, x1: 440, y1: 330, speed: 0.30, wobble: 3 });
var t = app.trace();
check('records without being switched on', !!t && t.samples.length > 0);
check('carries device context', !!t && t.viewW === 1024 && !!t.ua && t.v === 2);
check('records verdicts', t.samples.filter(function (r) { return r[0] === 'v'; }).length > 0);

var app2 = fresh(), i;
for (i = 0; i < 400; i++) { app2.down(500 + (i % 5), 300, 300); app2.tick(8); app2.up(500 + (i % 5)); }
var t2 = app2.trace();
check('ring is capped', t2.samples.length <= 2000, t2.samples.length + ' samples');
var times = t2.samples.map(function (r) { return r[0] === 'v' ? r[3] : r[4]; });
var ok = true;
for (i = 1; i < times.length; i++) { if (times[i] < times[i - 1]) { ok = false; break; } }
check('ring reads back in order', ok);

/* a stroke owning the pen blocks two-finger zoom - the reported bug */
var app3 = fresh();
app3.stroke({ id: 1, x0: 300, y0: 300, x1: 420, y1: 300, speed: 0.35, keepDown: true });
app3.down(2, 600, 400);
for (i = 1; i <= 6; i++) { app3.tick(16); app3.moveTo(1, 420 + i * 6, 300); app3.moveTo(2, 600 + i * 6, 400); }
app3.up(1); app3.up(2);
var reasons = app3.trace().samples.filter(function (r) { return r[0] === 'g'; })
                                  .map(function (r) { return r[1]; });
check('gesture bail recorded while a stroke owns the pen',
      reasons.indexOf('bail-ink') >= 0, JSON.stringify(reasons));

/* Copy report fills the textarea with valid, parseable JSON */
var app4 = fresh();
app4.stroke({ id: 1, x0: 300, y0: 300, x1: 400, y1: 320, speed: 0.3 });
app4.clickMenu('Copy report');
var val = app4.els.traceText.value, parsed = null;
try { parsed = JSON.parse(val); } catch (e) {}
check('Copy report produces valid JSON', !!parsed && parsed.samples.length > 0,
      val ? val.length + ' chars' : 'empty');
check('report overlay opens', app4.els.traceOverlay.className.indexOf('on') >= 0);
check('report stays pasteable', val.length < 400000, val.length + ' chars');

/* ---- pinch-zoom, from the real trace ---- */
function zoomOf(a) { return a.trace().zoom; }

/* A two-finger pinch, the supported gesture.
 *
 * An ANCHORED pinch - one finger planted, the other sliding - is not
 * supported and is not tested, because it cannot be: with no stylus id
 * and no contact radius, a single sliding contact is indistinguishable
 * from a pen stroke, and it commits as ink before any pinch can form.
 * Guessing here would mean occasionally turning a real pen stroke into
 * a zoom, which is a worse failure than not having the gesture. */
/* pinch while a stroke owns the pen - the bail-ink case that made
   "the palm draws" and "it won't zoom" the same bug */
var p2 = fresh();
var z2 = zoomOf(p2);
p2.stroke({ id: 1, x0: 200, y0: 500, x1: 320, y1: 500, speed: 0.35, keepDown: true });
p2.down(10, 300, 200);
p2.down(11, 500, 200);
for (i = 1; i <= 25; i++) { p2.tick(16); p2.moveTo(10, 300 - i * 4, 200); p2.moveTo(11, 500 + i * 4, 200); }
check('pinch works even while a stroke owns the pen', Math.abs(zoomOf(p2) - z2) > 0.02,
      z2 + ' -> ' + zoomOf(p2));
p2.up(1); p2.up(10); p2.up(11);

/* two fingers resting still must NOT zoom */
var p3 = fresh();
var z3 = zoomOf(p3);
p3.down(10, 300, 300);
p3.down(11, 500, 300);
for (i = 1; i <= 12; i++) { p3.tick(30); p3.moveTo(10, 300 + (i % 2), 300); p3.moveTo(11, 500, 300 + (i % 2)); }
p3.up(10); p3.up(11);
check('two resting fingers do not zoom', Math.abs(zoomOf(p3) - z3) < 0.001,
      z3 + ' -> ' + zoomOf(p3));

/* a single stroke must still ink normally */
var p4 = fresh();
p4.stroke({ id: 1, x0: 300, y0: 300, x1: 430, y1: 330, speed: 0.30, wobble: 3 });
check('a normal stroke still inks with pinch detection in place',
      p4.strokes().length === 1, p4.strokes().length + ' strokes');

/* ---- regressions taken straight from the iPad trace ----
 * A resting palm is not one contact. It is a storm of them, appearing
 * and vanishing every 20-100ms, and any two make a plausible pinch
 * pair. A member swapped mid-gesture used to make the zoom ratio
 * explode (1.18 -> 1.96 in a single frame in the real trace). */
var p5 = fresh();
var z5 = zoomOf(p5);
var id = 900;
for (i = 0; i < 40; i++) {
  var ca = id++, cb = id++;
  p5.down(ca, 640 + (i % 7) * 4, 700 + (i % 5) * 3);
  p5.down(cb, 580 + (i % 5) * 5, 840 + (i % 3) * 4);
  p5.tick(20);
  p5.moveTo(ca, 645 + (i % 7) * 4, 704 + (i % 5) * 3);
  p5.moveTo(cb, 585 + (i % 5) * 5, 835 + (i % 3) * 4);
  p5.tick(20);
  p5.up(ca); p5.up(cb);
}
check('a flickering resting palm does not zoom', Math.abs(zoomOf(p5) - z5) < 0.01,
      z5 + ' -> ' + zoomOf(p5));
check('a flickering resting palm does not draw', p5.strokes().length === 0,
      p5.strokes().length + ' strokes');

/* Probe travel must be measured on the glass, not on the page. A
 * parked contact has to stay parked as far as the engine is concerned
 * even while the view zooms underneath it - otherwise the page moving
 * is by itself enough to commit a resting palm as ink. */
var p6 = fresh();
p6.down(20, 650, 700);                 /* a palm, parked, never moves */
p6.down(21, 300, 300);                 /* two fingers that will pinch */
p6.down(22, 500, 300);
for (i = 1; i <= 25; i++) {
  p6.tick(16);
  p6.moveTo(20, 650, 700);             /* not one pixel of real movement */
  p6.moveTo(21, 300 - i * 4, 300);
  p6.moveTo(22, 500 + i * 4, 300);
}
p6.up(20); p6.up(21); p6.up(22);
check('zooming the page does not make a parked contact ink',
      p6.strokes().length === 0, p6.strokes().length + ' strokes');

/* Replayed from a real zoom on the iPad. The moving finger travelled
 * 75px in 130ms and inked, because the pinch detector was waiting for
 * both contacts to reach 150ms - it could never win that race. */
var p7 = fresh();
var z7 = zoomOf(p7);
p7.down(310, 609, 632);                /* the anchored finger */
var MOVER = [[30, 501, 684], [13, 489, 685], [1, 471, 686], [15, 455, 689],
             [17, 444, 693], [17, 437, 695], [17, 431, 698], [16, 428, 700],
             [17, 426, 701], [17, 426, 702], [50, 426, 703], [98, 426, 702],
             [38, 426, 701], [33, 425, 700], [47, 424, 700]];
p7.tick(MOVER[0][0]);
p7.down(311, MOVER[0][1], MOVER[0][2]);
for (i = 1; i < MOVER.length; i++) {
  p7.tick(MOVER[i][0]);
  p7.moveTo(310, 609 + (i % 3), 632 + (i % 2));   /* anchor micro-drift */
  p7.moveTo(311, MOVER[i][1], MOVER[i][2]);
}
p7.up(310); p7.up(311);
check('a finger sliding during a pinch does not ink (real data)',
      p7.strokes().length === 0, p7.strokes().length + ' strokes');
check('...and that pinch actually zooms', Math.abs(zoomOf(p7) - z7) > 0.02,
      z7 + ' -> ' + zoomOf(p7));

/* ---- stylus session, replayed from the iPad ----
 * A stylus means MORE contacts on the glass, not fewer: nib, palm heel,
 * sometimes a knuckle. Any two of them drifting used to read as a pinch,
 * because the test only asked whether they moved in opposing directions
 * and never whether the distance between them actually changed. In the
 * recording, two contacts 528px apart - stylus and resting palm - sent
 * the zoom from 1.16 down to 0.72 and back. */
var sx = fresh();
var zx = zoomOf(sx);
sx.down(336, 410, 491);
sx.down(337, 823, 143);
var k;
for (k = 1; k <= 45; k++) {
  sx.tick(20);
  sx.moveTo(336, 410 + k * 1.7, 491 + k * 3.9);
  sx.moveTo(337, 823 - k * 2.1, 143 + k * 5.1);
}
sx.up(336); sx.up(337);
check('two slowly drifting contacts do not zoom the page',
      Math.abs(zoomOf(sx) - zx) < 0.02, zx + ' -> ' + zoomOf(sx));

/* ...but a real pinch still has to work */
var rp = fresh();
var zr = zoomOf(rp);
rp.down(10, 380, 300);
rp.down(11, 560, 300);
for (k = 1; k <= 25; k++) {
  rp.tick(16);
  rp.moveTo(10, 380 - k * 5, 300);
  rp.moveTo(11, 560 + k * 5, 300);
}
rp.up(10); rp.up(11);
check('a deliberate pinch still zooms', Math.abs(zoomOf(rp) - zr) > 0.02,
      zr + ' -> ' + zoomOf(rp));

/* The convergence test was not enough. Contacts 144376336 and 144376337
 * in a reported stylus session - a hand resting bottom-left and the pen
 * working top-right, 540px apart - genuinely closed to 378px as the user
 * wrote, which IS convergence, and took the page from 1.16 down to 0.72
 * and back while they were writing. No thumb and finger span most of a
 * 9.7-inch screen: a pinch is two fingers of one hand. */
var wide = fresh();
var zw = zoomOf(wide);
wide.down(336, 250, 500);            /* the heel of the hand */
wide.down(337, 790, 420);            /* the pen, 546px away */
for (k = 1; k <= 30; k++) {
  wide.tick(16);
  wide.moveTo(336, 250 + k * 4, 500 + k * 2);
  wide.moveTo(337, 790 + k * 5, 420 + k * 2);   /* separation creeps */
}
wide.up(336); wide.up(337);
check('a pair a screen apart never zooms, however it moves',
      Math.abs(zoomOf(wide) - zw) < 0.02, zw + ' -> ' + zoomOf(wide));

/* a dot beside a resting palm - the commonest thing a stylus does */
var dt = fresh();
dt.down(99, 700, 620);
for (k = 0; k < 6; k++) { dt.tick(40); dt.moveTo(99, 700 + (k % 2), 620); }
dt.stroke({ id: 1, x0: 300, y0: 300, x1: 420, y1: 320, speed: 0.3, wobble: 3 });
dt.tick(200);
dt.down(2, 432, 326);
dt.tick(90);
dt.up(2);
dt.up(99);

setTimeout(function () {
  dt.flushFrames();
  check('a dot lands even with the palm down', dt.strokes().length === 2,
        dt.strokes().length + ' strokes');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 400);
