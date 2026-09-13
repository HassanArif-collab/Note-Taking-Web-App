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

/* anchored pinch: one finger planted, the other sliding. The old
   detector needed BOTH moving, so this could never zoom. */
var p1 = fresh();
var z1 = zoomOf(p1);
p1.down(10, 300, 300);
p1.down(11, 500, 300);
for (i = 1; i <= 10; i++) { p1.tick(16); p1.moveTo(10, 300, 300); p1.moveTo(11, 500 + i * 9, 300); }
p1.up(10); p1.up(11);
check('anchored pinch zooms (one finger held still)', Math.abs(zoomOf(p1) - z1) > 0.02,
      z1 + ' -> ' + zoomOf(p1));

/* pinch while a stroke owns the pen - the bail-ink case that made
   "the palm draws" and "it won't zoom" the same bug */
var p2 = fresh();
var z2 = zoomOf(p2);
p2.stroke({ id: 1, x0: 200, y0: 500, x1: 320, y1: 500, speed: 0.35, keepDown: true });
p2.down(10, 300, 200);
p2.down(11, 500, 200);
for (i = 1; i <= 10; i++) { p2.tick(16); p2.moveTo(10, 300 - i * 5, 200); p2.moveTo(11, 500 + i * 5, 200); }
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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
