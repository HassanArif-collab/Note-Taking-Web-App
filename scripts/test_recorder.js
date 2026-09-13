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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
