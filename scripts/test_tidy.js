/* ============================================================
 * test_tidy.js - Tidy writing, judged against real recordings
 * rather than against strokes I made up.
 *
 *   node scripts/test_tidy.js
 *
 * Every other suite builds its own input, which means it can only
 * ever check what I already thought of. This one replays writing
 * that actually happened on the tablet and asks the engine what it
 * would do with it - which is how the two bugs below were found,
 * and neither of them was a thing I would have invented.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var core = require(path.join(__dirname, 'replay-core.js'));

var TRACES = path.join(__dirname, '..', 'traces');
var pass = 0, fail = 0;

function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  (' + detail + ')' : '')); }
}

/* the widest stretch of ink that the engine calls one line */
function widest(rep) {
  var best = null, i;
  for (i = 0; i < rep.sizes.length; i++) {
    if (!best || rep.sizes[i].n > best.n) best = rep.sizes[i];
  }
  return best || { n: 0, syms: 0, span: 0, why: '-' };
}

function withTrace(file, fn, next) {
  var full = path.join(TRACES, file);
  if (!fs.existsSync(full)) {
    console.log('  --   ' + file + ' missing, skipped');
    next();
    return;
  }
  var t = JSON.parse(fs.readFileSync(full, 'utf8'));
  core.replay(t, {}, function (r) {
    fn(r, r.app.tidy());
    next();
  });
}

console.log('\nTidy writing, against recorded handwriting\n');

/* ---- 1. a written line stays one line ----
 * Reported as "my second name got more tilt rather than aligning". The
 * grouping asked whether each stroke sat near the PREVIOUS one, and a
 * dot, a cross-bar and a descender all sit far from their neighbours by
 * design - so a name came apart, each half got its own baseline fit and
 * its own rotation, and the halves ended up at different angles.
 * This recording is two words; the engine has to see one line.
 */
withTrace('live-20260920-033756.json', function (r, rep) {
  var w = widest(rep);
  check('two words of a name stay one line',
        w.n >= 12 && w.syms >= 10,
        'widest line is ' + w.n + ' strokes / ' + w.syms + ' symbols of ' +
        r.strokes.length + ' drawn');
  check('...and it is wide enough to be worth an angle',
        w.span > 8, 'span ' + w.span + ' symbol heights');
}, function () {

/* ---- 2. a group that is not a line is refused ----
 * The guard that was missing. Recorded writing has groups whose feet fit
 * a straight line to 0.3px and groups that miss by 18px, and every one of
 * them used to be rotated by whatever angle least squares returned. Noise
 * applied to someone's handwriting is strictly worse than doing nothing.
 */
  withTrace('live-20260920-033636.json', function (r, rep) {
    var refused = 0, acted = 0, i, L;
    for (i = 0; i < rep.sizes.length; i++) {
      L = rep.sizes[i];
      if (L.why === 'not a line') refused++;
      if (L.why === 'ok') acted++;
    }
    check('a group whose feet miss the line by 18px is left alone',
          refused >= 1, refused + ' refused, ' + acted + ' tidied');
    check('...but the recording is not refused wholesale',
          acted >= 1, acted + ' lines tidied');
  }, function () {

/* ---- 3. nothing the engine touches comes out crooked ----
 * The whole promise. A line it acted on must end up flat, and a line it
 * refused must be exactly as it was.
 */
    withTrace('live-20260920-033716.json', function (r, rep) {
      var before = [], i;
      for (i = 0; i < rep.sizes.length; i++) before.push(rep.sizes[i]);
      /* run it again: everything it fixed should now say 'already tidy',
         and nothing should have a new angle to correct */
      var again = r.app.tidy(), bad = [], L;
      for (i = 0; i < again.sizes.length; i++) {
        L = again.sizes[i];
        if (L.why === 'ok' && Math.abs(L.deg) > 0.3) bad.push(L.deg + 'deg');
      }
      check('tidying twice changes nothing the second time',
            bad.length === 0, bad.length ? 'still crooked: ' + bad.join(', ') : '');
      check('...and the first pass did do something',
            rep.moved > 0, rep.moved + ' of ' + rep.lines + ' lines changed');
    }, function () {

/* ---- 4. it never runs itself ----
 * It used to fire 900ms after the last stroke, which is a thinking pause
 * and not the end of a line, so it rewrote half a line while the hand was
 * still on it and the redraw landed as the pen came back down. Replaying
 * a recording must leave the ink exactly as drawn until it is asked.
 */
      var full = path.join(TRACES, 'live-20260920-033716.json');
      if (!fs.existsSync(full)) { done(); return; }
      var t = JSON.parse(fs.readFileSync(full, 'utf8'));
      core.replay(t, { settleMs: 1500 }, function (r) {
        var snap = JSON.stringify(r.app.strokes().map(function (s) {
          return s.pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
        }));
        r.app.flushFrames();
        var later = JSON.stringify(r.app.strokes().map(function (s) {
          return s.pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
        }));
        check('ink is never moved unless tidy is asked for',
              snap === later, 'ink changed on its own after 1.5s of idle');
        done();
      });
    });
  });
});

function done() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
