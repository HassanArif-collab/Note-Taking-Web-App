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

/* ---- recorder is on by default ---- */
var app = fresh();
app.stroke({ id: 1, x0: 300, y0: 300, x1: 440, y1: 330, speed: 0.30, wobble: 3 });
var t = app.trace();
check('recorder is on without being switched on', !!t && t.samples.length > 0,
      t ? t.samples.length + ' samples' : 'no trace');
check('trace carries device context', !!t && t.viewW === 1024 && !!t.ua && t.v === 2);
check('verdicts recorded',
      t.samples.filter(function (r) { return r[0] === 'v'; }).length > 0);

/* ---- ring buffer is capped and ordered ---- */
var app2 = fresh();
var i;
for (i = 0; i < 400; i++) {
  app2.down(500 + (i % 5), 300, 300); app2.tick(8); app2.up(500 + (i % 5));
}
var t2 = app2.trace();
check('ring buffer is capped', t2.samples.length <= 6000, t2.samples.length + ' samples');
var times = t2.samples.map(function (r) { return r[0] === 'v' ? r[3] : r[4]; });
var ordered = true;
for (i = 1; i < times.length; i++) { if (times[i] < times[i - 1]) { ordered = false; break; } }
check('ring reads back in chronological order', ordered);

/* ---- gesture bail reasons are recorded ----
 * One finger inks, a second lands, both move. anyInkActive() blocks the
 * gesture, which is the "sometimes it does not zoom" complaint. */
var app3 = fresh();
app3.stroke({ id: 1, x0: 300, y0: 300, x1: 420, y1: 300, speed: 0.35, keepDown: true });
app3.down(2, 600, 400);
for (i = 1; i <= 6; i++) { app3.tick(16); app3.moveTo(1, 420 + i * 6, 300); app3.moveTo(2, 600 + i * 6, 400); }
app3.up(1); app3.up(2);
var reasons = app3.trace().samples
  .filter(function (r) { return r[0] === 'g'; })
  .map(function (r) { return r[1]; });
check('gesture bail recorded while a stroke owns the pen',
      reasons.indexOf('bail-ink') >= 0, JSON.stringify(reasons));

/* ---- upload requires a token ---- */
var app4 = fresh();
app4.stroke({ id: 1, x0: 300, y0: 300, x1: 400, y1: 320, speed: 0.3 });
app4.clickMenu('Send report');
check('no token -> nothing is sent', app4.requests().length === 0,
      app4.requests().length + ' requests');

/* ---- with a token, the request is well formed ---- */
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
        r.headers.Authorization === 'token github_pat_TESTTOKEN');

  var body = JSON.parse(r.body);
  check('commit message describes the report', /^trace: /.test(body.message), body.message);
  check('commits to the diagnostics branch, not main', body.branch === 'diagnostics', body.branch);

  var decoded = Buffer.from(body.content, 'base64').toString('utf8');
  var parsed = null, err = null;
  try { parsed = JSON.parse(decoded); } catch (e) { err = e.message; }
  check('uploaded content is valid JSON', !!parsed, err);
  check('uploaded content is the trace', !!parsed && parsed.samples.length > 0);
  check('token is NOT in the uploaded payload', decoded.indexOf('TESTTOKEN') === -1);
  check('token is NOT anywhere in the request body except the header',
        r.body.indexOf('TESTTOKEN') === -1);
}

/* ---- the token must never leak through the tooling hook ---- */
var app6 = fresh({ mn_gh_token: 'github_pat_SECRET' });
check('tooling hook does not expose the token',
      JSON.stringify(app6.trace()).indexOf('SECRET') === -1);

/* ---- a failed upload must not claim success ---- */
var app7 = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712,
                    xhrStatus: 401, seed: { mn_gh_token: 'bad' } });
app7.flushFrames();
app7.stroke({ id: 1, x0: 300, y0: 300, x1: 400, y1: 320, speed: 0.3 });
app7.clickMenu('Send report');
check('401 reopens the token panel',
      app7.els.tokenOverlay.className.indexOf('on') >= 0,
      app7.els.tokenOverlay.className);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
