/* ============================================================
 * test_upload.js - the diagnostics pipeline: always-on recorder,
 * gesture instrumentation, and the GitHub upload request.
 *
 * The harness swaps XMLHttpRequest for a recorder, so this checks
 * exactly what the app WOULD send without touching the network.
 *
 * Run: node scripts/test_upload.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');

var pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  (' + detail + ')' : '')); }
}

function fresh(seed) {
  var app = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712, seed: seed || {} });
  app.flushFrames();
  return app;
}

console.log('\ndiagnostics pipeline\n');

/* ---- recorder is on by default and captures input ---- */
var app = fresh();
app.stroke({ id: 1, x0: 300, y0: 300, x1: 440, y1: 330, speed: 0.30, wobble: 3 });
var t = app.trace();
check('recorder is on without being switched on', !!t && t.samples.length > 0,
      t ? t.samples.length + ' samples' : 'no trace');
check('trace carries device context', !!t && t.viewW === 1024 && !!t.ua && t.v === 2);
var verdicts = t.samples.filter(function (r) { return r[0] === 'v'; });
check('verdicts recorded', verdicts.length > 0, JSON.stringify(verdicts));

/* ---- ring buffer never grows past its cap and stays in order ---- */
var app2 = fresh();
for (var i = 0; i < 400; i++) {
  app2.down(500 + (i % 5), 300, 300); app2.tick(8); app2.up(500 + (i % 5));
}
var t2 = app2.trace();
check('ring buffer is capped', t2.samples.length <= 6000, t2.samples.length + ' samples');
var times = t2.samples.map(function (r) { return r[0] === 'v' ? r[3] : r[4]; });
var ordered = true;
for (i = 1; i < times.length; i++) { if (times[i] < times[i - 1]) { ordered = false; break; } }
check('ring reads back in chronological order', ordered);

/* ---- gesture bail reasons are recorded ---- */
var app3 = fresh();
/* one finger inks, then a second lands and both move: zoom is blocked
   by anyInkActive(), which is the bug the user reports as "sometimes
   it does not zoom" */
app3.stroke({ id: 1, x0: 300, y0: 300, x1: 420, y1: 300, speed: 0.35, keepDown: true });
app3.down(2, 600, 400);
for (i = 1; i <= 6; i++) { app3.tick(16); app3.moveTo(1, 420 + i * 6, 300); app3.moveTo(2, 600 + i * 6, 400); }
app3.up(1); app3.up(2);
var g3 = app3.trace().samples.filter(function (r) { return r[0] === 'g'; });
var reasons = g3.map(function (r) { return r[1]; });
check('gesture bail is recorded while a stroke owns the pen',
      reasons.indexOf('bail-ink') >= 0, JSON.stringify(reasons));

/* ---- upload: no token means no request ---- */
var app4 = fresh();
app4.stroke({ id: 1, x0: 300, y0: 300, x1: 400, y1: 320, speed: 0.3 });
app4.clickMenu('Send report');
check('no token -> nothing is sent', app4.requests().length === 0,
      app4.requests().length + ' requests');

/* ---- upload: with a token, the request is well formed ---- */
var app5 = fresh({ mn_gh_token: 'github_pat_TESTTOKEN' });
app5.stroke({ id: 1, x0: 300, y0: 300, x1: 440, y1: 330, speed: 0.30, wobble: 3 });
app5.clickMenu('Send report');
var reqs = app5.requests();
check('token present -> one request sent', reqs.length === 1, reqs.length + ' requests');

if (reqs.length === 1) {
  var r = reqs[0];
  check('method is PUT', r.method === 'PUT', r.method);
  check('targets the repo contents API under traces/auto/',
        /^https:\/\/api\.github\.com\/repos\/HassanArif-collab\/Note-Taking-Web-App\/contents\/traces\/auto\/.+\.json$/.test(r.url),
        r.url);
  check('sends the token as an Authorization header',
        r.headers.Authorization === 'token github_pat_TESTTOKEN', r.headers.Authorization);

  var body = JSON.parse(r.body);
  check('commit message describes the report', /^trace: /.test(body.message), body.message);
  check('commits to the diagnostics branch, not main', body.branch === 'diagnostics', body.branch);

  var decoded = Buffer.from(body.content, 'base64').toString('utf8');
  var parsed = null, err = null;
  try { parsed = JSON.parse(decoded); } catch (e) { err = e.message; }
  check('uploaded content is valid JSON', !!parsed, err);
  check('uploaded content is the trace', !!parsed && parsed.samples.length > 0,
        parsed ? parsed.samples.length + ' samples' : 'none');
  check('token is NOT in the uploaded payload', decoded.indexOf('TESTTOKEN') === -1);
  check('token is NOT in the commit message', r.body.indexOf('TESTTOKEN') === -1 || body.message.indexOf('TESTTOKEN') === -1);
}

/* ---- token never reachable from the tooling hook ---- */
var app6 = fresh({ mn_gh_token: 'github_pat_SECRET' });
var dump = JSON.stringify(app6.trace());
check('tooling hook does not expose the token', dump.indexOf('SECRET') === -1);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
