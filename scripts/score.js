/* ============================================================
 * score.js - replay every recording in traces/ and print what the
 * engine actually does, as a number.
 *
 *   node scripts/score.js                 all recordings
 *   node scripts/score.js palm            only ones whose name matches
 *   node scripts/score.js --html old.html against another build
 *
 * The point is that a drill knows what was supposed to happen before
 * it happened, so nobody has to remember or explain afterwards:
 *
 *   want 0    the hand was on the glass and the pen was not.
 *             Any mark at all is a failure.
 *   want N    exactly N strokes were drawn on purpose.
 *             More than N is the palm; fewer is the pen being refused.
 *   want -1   only the pen was on the glass, so every contact that
 *             lasted long enough to be a mark should have left one.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var core = require('./replay-core.js');

var TRACES = path.join(__dirname, '..', 'traces');

var filter = null, htmlPath = null;
for (var a = 2; a < process.argv.length; a++) {
  if (process.argv[a] === '--html') htmlPath = process.argv[++a];
  else if (!filter) filter = process.argv[a];
}

if (!fs.existsSync(TRACES)) {
  console.log('no traces/ directory yet - run scripts/serve.js and do a drill');
  process.exit(2);
}
var files = fs.readdirSync(TRACES).filter(function (f) {
  return /\.json$/.test(f) && (!filter || f.indexOf(filter) >= 0);
}).sort();

if (!files.length) {
  console.log('no recordings' + (filter ? ' matching "' + filter + '"' : '') +
              ' in traces/\n\nRun:  node scripts/serve.js\nthen open the printed address on the iPad,' +
              '\nmenu -> Testing drills.');
  process.exit(2);
}

/* a contact too brief or too still to have been a deliberate mark. In a
   pen-only drill these are the stylus bouncing on landing, not strokes. */
function isMark(c, lastT) {
  var dur = (c.upAt == null ? lastT : c.upAt) - c.downAt;
  return dur >= 60 && (c.path >= 4 || dur >= 120);
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}

var results = [];

function scoreOne(file, next) {
  var trace;
  try { trace = JSON.parse(fs.readFileSync(path.join(TRACES, file), 'utf8')); }
  catch (e) { results.push({ file: file, err: 'unreadable' }); next(); return; }
  if (!trace.samples || !trace.samples.length) {
    results.push({ file: file, err: 'empty' }); next(); return;
  }

  core.replay(trace, { html: htmlPath }, function (r) {
    var want = typeof trace.want === 'number' ? trace.want : -1;
    var drill = trace.drill || trace.label || 'unlabelled';
    var marks = 0, k, ids = r.order;
    for (k = 0; k < ids.length; k++) {
      if (isMark(r.contacts[ids[k]], r.lastT)) marks++;
    }
    /* a contact's LAST verdict is what became of it. ink and shortmark
       both mean a mark was drawn; dwell, palm, jumping and the rest mean
       it was taken back. Counting shortmark as a rejection - which the
       first version of this did - reported the rescue of a small mark as
       a failure to draw it. */
    var drew = 0, taken = 0, why = {}, id, v;
    for (id in r.verdicts) {
      if (!Object.prototype.hasOwnProperty.call(r.verdicts, id)) continue;
      v = r.verdicts[id];
      if (v === 'ink' || v === 'shortmark') drew++;
      else { taken++; why[v] = (why[v] || 0) + 1; }
    }
    drew += r.dots;

    var got = r.strokes.length;
    var undone = 0, uq;
    for (uq = 0; uq < (trace.samples || []).length; uq++) {
      if (trace.samples[uq][0] === 'v' && trace.samples[uq][2] === 'undo') undone++;
    }
    var zoomed = Math.abs((r.zoom || 1) - 1) > 0.02;

    var verdict, detail, ok;
    if (want === 0) {
      ok = (drew === 0);
      verdict = ok ? 'PASS' : 'FAIL';
      detail = drew + ' stray mark' + (drew === 1 ? '' : 's') +
               ' from ' + ids.length + ' contacts' +
               (undone ? '  (' + undone + ' you undid)' : '');
      if (drill === 'zoom') {
        if (!zoomed) { ok = false; verdict = 'FAIL'; detail += ', and it never zoomed'; }
        else detail += ', zoom ok';
      }
      if (drill === 'scroll' && zoomed) {
        ok = false; verdict = 'FAIL'; detail += ', and it zoomed when it should only scroll';
      }
    } else if (want > 0) {
      ok = (got === want);
      verdict = ok ? 'PASS' : 'FAIL';
      detail = got + ' of ' + want + ' strokes';
      if (got > want) detail += '  (' + (got - want) + ' from the palm)';
      if (got < want) detail += '  (' + (want - got) + ' refused)';
    } else if (want === -1) {
      /* pen only: every contact that was a mark should have drawn */
      ok = (marks > 0 && drew >= marks);
      verdict = ok ? 'PASS' : 'FAIL';
      detail = drew + ' of ' + marks + ' pen contacts drew';
      if (marks > drew) detail += '  (' + (marks - drew) + ' lost)';
    } else {
      /* want -2: the hand and the pen are both on the glass, so no count
         is knowable from the recording alone. Report, do not judge. */
      ok = true;
      verdict = 'INFO';
      detail = drew + ' marks drawn, ' + taken + ' contacts taken back, ' +
               ids.length + ' contacts total';
    }

    var whyList = [], w;
    for (w in why) { if (Object.prototype.hasOwnProperty.call(why, w)) whyList.push(w + ' x' + why[w]); }
    whyList.sort();

    /* a fixture is motion I invented, which is how the engine went wrong
       in the first place. It keeps the scoreboard runnable before anyone
       has touched the glass; it is not evidence about a real hand. */
    results.push({
      file: file, drill: drill, ok: ok, verdict: verdict,
      synthetic: file.indexOf('fixture-') === 0,
      detail: detail, why: whyList.join(', '),
      contacts: ids.length, got: got, want: want
    });
    next();
  });
}

(function run(i) {
  if (i >= files.length) { report(); return; }
  scoreOne(files[i], function () { run(i + 1); });
})(0);

function report() {
  console.log('');
  console.log('MathNotes scoreboard' +
              (htmlPath ? '   [against ' + htmlPath + ']' : '   [current build]'));
  console.log('');
  console.log('  ' + pad('drill', 16) + pad('', 6) + 'result');
  console.log('  ' + pad('-----', 16) + pad('', 6) + '------');
  var passed = 0, failed = 0, k;
  for (k = 0; k < results.length; k++) {
    var r = results[k];
    if (r.err) {
      console.log('  ' + pad(r.file, 16) + pad('SKIP', 6) + r.err);
      continue;
    }
    if (r.verdict === 'INFO') { /* reported, not judged */ }
    else if (r.ok) passed++; else failed++;
    console.log('  ' + pad(r.drill, 16) + pad(r.verdict, 6) + r.detail +
                (r.synthetic ? '   (synthetic)' : ''));
    if (r.why && (!r.ok || r.verdict === 'INFO')) {
      console.log('  ' + pad('', 22) + 'taken back by: ' + r.why);
    }
  }
  console.log('');
  console.log('  ' + passed + ' of ' + (passed + failed) + ' drills pass' +
              (failed ? '   <- ' + failed + ' to fix' : ''));
  var real = 0;
  for (k = 0; k < results.length; k++) { if (!results[k].err && !results[k].synthetic) real++; }
  if (!real) {
    console.log('');
    console.log('  Every recording here is synthetic - motion I made up. Nothing');
    console.log('  above is evidence about a real hand until a drill is run on');
    console.log('  the iPad:  node scripts/serve.js');
  }
  console.log('');
  process.exit(failed ? 1 : 0);
}
