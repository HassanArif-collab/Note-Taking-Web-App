/* ============================================================
 * replay.js - replay a touch trace recorded on the iPad through
 * the current engine, and compare what happens now against what
 * happened on the device.
 *
 *   node scripts/replay.js traces/palm-dots.json
 *
 * Record a trace in the app: kebab menu -> Touch trace -> reproduce
 * the problem -> Touch trace (off) -> Show trace -> copy the JSON
 * into a file under traces/.
 *
 * The trace stores raw client coordinates and the geometry they
 * were captured in, so the replay feeds the engine exactly what it
 * saw on the device.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var H = require('./harness.js');

/* --html <path> replays the same trace against another build (for
 * example git show HEAD~1:index.html > /tmp/old.html), which is how
 * you show that a change actually altered a real-world verdict. */
var file = null, htmlPath = null;
for (var a = 2; a < process.argv.length; a++) {
  if (process.argv[a] === '--html') { htmlPath = process.argv[++a]; }
  else if (!file) { file = process.argv[a]; }
}
if (!file) {
  console.log('usage: node scripts/replay.js <trace.json> [--html <index.html>]');
  process.exit(2);
}

var trace = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!trace.samples || !trace.samples.length) {
  console.log('trace has no samples');
  process.exit(2);
}

/* ---- what the device did, according to the trace ---- */
var deviceVerdicts = {};
var deviceDots = 0;
var i, r;
for (i = 0; i < trace.samples.length; i++) {
  r = trace.samples[i];
  if (r[0] === 'v') {
    if (r[2] === 'dot') deviceDots++;
    else deviceVerdicts[r[1]] = r[2];
  }
}

/* ---- replay through the current engine ---- */
var payload = {
  v: 4,
  notebooks: [{ id: 'nb1', title: 'Replay', color: '#0381FE', notes: ['n1'] }],
  notes: { n1: { id: 'n1', title: 'Replay', cr: 1, mod: 1, scroll: 0, strokes: [] } },
  cur: { nb: 0, note: 'n1' },
  set: {
    palmLevel: typeof trace.palmLevel === 'number' ? trace.palmLevel : 2,
    hand: typeof trace.hand === 'number' ? trace.hand : 0
  }
};

var app = H.load({
  quiet: true,
  html: htmlPath || undefined,
  dpr: trace.dpr || 2,
  viewW: trace.viewW || 1024,
  viewH: trace.viewH || 712,
  seed: { mathnotes_v4: JSON.stringify(payload) }
});
app.flushFrames();

var contacts = {};      /* id -> {downAt, upAt, samples, path} */
var lastT = 0;

function advanceTo(t) {
  var d = t - lastT;
  if (d > 0) app.tick(d);
  lastT = t;
}

/* Record the replay with the app's own recorder, so the verdicts the
 * current engine reaches come back in exactly the format the device
 * produced - the two are then directly comparable. */
app.clickMenu('Touch trace');

for (i = 0; i < trace.samples.length; i++) {
  r = trace.samples[i];
  if (r[0] === 'v') continue;                 /* device verdict, not input */
  var phase = r[0], id = r[1], x = r[2], y = r[3], t = r[4], rx = r[5] || 0;
  advanceTo(t);
  if (phase === 0) {
    contacts[id] = { downAt: t, samples: 0, x0: x, y0: y, path: 0, lx: x, ly: y };
    app.down(id, x, y, rx);
  } else if (phase === 1) {
    var c = contacts[id];
    if (c) {
      c.samples++;
      c.path += Math.sqrt((x - c.lx) * (x - c.lx) + (y - c.ly) * (y - c.ly));
      c.lx = x; c.ly = y;
    }
    app.moveTo(id, x, y);
  } else {
    if (contacts[id]) contacts[id].upAt = t;
    app.up(id, phase === 3);
  }
}
app.flushFrames();

/* let any queued tap-dot timer fire before reading the result */
setTimeout(function () {
  app.flushFrames();
  var strokes = app.strokes();

  /* pull the replay's own verdicts back out of the recorder */
  var nowVerdicts = {}, nowDots = 0;
  app.clickMenu('Touch trace');
  if (app.clickMenu('Show trace')) {
    var mine = null;
    try { mine = JSON.parse(app.els.traceText.value); } catch (e) { mine = null; }
    if (mine && mine.samples) {
      for (var q = 0; q < mine.samples.length; q++) {
        var rr = mine.samples[q];
        if (rr[0] !== 'v') continue;
        if (rr[2] === 'dot') nowDots++;
        else nowVerdicts[rr[1]] = rr[2];
      }
    }
  }

  console.log('\ntrace: ' + path.basename(file) +
              (htmlPath ? '   [against ' + htmlPath + ']' : '   [against current index.html]'));
  console.log('  captured at ' + (trace.viewW || '?') + 'x' + (trace.viewH || '?') +
              ', zoom ' + (trace.zoom || 1) +
              ', palm level ' + (['Off', 'Med', 'Max'][payload.set.palmLevel] || '?') +
              ', hand ' + (['Right', 'Left', 'Both'][payload.set.hand] || '?'));
  console.log('  ' + trace.samples.length + ' samples, ' +
              Object.keys(contacts).length + ' contacts\n');

  var haveNow = false, nk;
  for (nk in nowVerdicts) { haveNow = true; break; }
  if (!haveNow && !nowDots) {
    console.log('  (this build has no trace recorder, so the "now" column is');
    console.log('   blank - compare the stroke counts below instead)\n');
  }

  console.log('  contact   duration   travel   device        now');
  console.log('  -------   --------   ------   ----------    ----------');
  var ids = Object.keys(contacts), k;
  for (k = 0; k < ids.length; k++) {
    var id = ids[k], c = contacts[id];
    var dur = (c.upAt == null ? lastT : c.upAt) - c.downAt;
    var dev = deviceVerdicts[id] || 'none';
    var now = nowVerdicts[id] || 'none';
    console.log('  ' + pad(id, 9) + pad(dur + 'ms', 11) +
                pad(Math.round(c.path) + 'px', 9) + pad(dev, 14) + pad(now, 10) +
                (dev === now ? '' : '  <- changed'));
  }

  console.log('\n  device inked : ' + countInk(deviceVerdicts) + ' stroke(s)' +
              (deviceDots ? ' + ' + deviceDots + ' dot(s)' : ''));
  console.log('  now inks     : ' + strokes.length + ' stroke(s)' +
              (nowDots ? ' (incl. ' + nowDots + ' dot(s))' : ''));

  var before = countInk(deviceVerdicts) + deviceDots;
  if (strokes.length < before) {
    console.log('\n  ' + (before - strokes.length) + ' fewer mark(s) than the device produced.');
  } else if (strokes.length > before) {
    console.log('\n  WARNING: ' + (strokes.length - before) + ' MORE mark(s) than the device produced.');
  } else {
    console.log('\n  same number of marks as the device.');
  }
  console.log('');
}, 400);

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}
function countInk(v) {
  var n = 0, k;
  for (k in v) { if (v[k] === 'ink') n++; }
  return n;
}
