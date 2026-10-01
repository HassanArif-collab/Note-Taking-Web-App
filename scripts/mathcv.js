/* ============================================================
 * mathcv.js - how well maths answers read a writer.
 *
 * The maths session (Testing drills on the test server) records the
 * digits and nine short sums, three times each, every symbol labelled by
 * its prompt (see mathdata.js). Scored two ways:
 *
 *   cold     nothing taught - a new writer picking the iPad up. Digits are
 *            read by the network trained on other people.
 *   learned  each take read with everything from the OTHER takes taught,
 *            as if the user had corrected those - what the app becomes
 *            for a writer after some use. Never its own take.
 *
 *   node scripts/mathcv.js            both scores
 *   node scripts/mathcv.js why S6     step by step for takes S6-...
 * ============================================================ */
'use strict';
var H = require('./harness.js');
var app = H.load({ quiet: true });
app.flushFrames();
var M = app.win.__mnMath;
var takes = require('./mathdata.js')(M);

function taught(list) { return list.map(function (l) { return [l.c, M.flat(l.strokes)]; }); }

if (process.argv[2] === 'why') {
  M.mine([]);
  takes.filter(function (t) { return t.f.indexOf('mth-' + (process.argv[3] || '')) === 0; }).forEach(function (t) {
    app.loadInk(t.ink);
    console.log(t.f.slice(4, 14) + '  ' + M.why());
  });
  process.exit(0);
}

function run(name, mineFor) {
  var okS = 0, nS = 0, okA = 0, nA = 0, conf = {}, lines = [];
  takes.forEach(function (t, ti) {
    M.mine(mineFor(ti));
    t.lab.forEach(function (l) {
      var r = M.classify(l.strokes, l.h);
      nS++;
      if (r && r.c === l.c) okS++;
      else conf[l.c + '->' + (r && r.c)] = (conf[l.c + '->' + (r && r.c)] || 0) + 1;
    });
    if (t.w && t.w.v !== undefined) {
      app.loadInk(t.ink);
      var a = M.now(), good = a && Math.abs(parseFloat(a.txt) - t.w.v) < 1e-9;
      nA++;
      if (good) okA++;
      lines.push(t.f.slice(4, 14) + '  ' + (a ? a.txt : '-') + (good ? '   ok' : '   (should be ' + t.w.v + ')'));
    }
  });
  console.log('\n' + name + '\n' + lines.join('\n'));
  console.log('symbols read right: ' + okS + '/' + nS + '    sums answered right: ' + okA + '/' + nA);
  console.log('confusions ' + JSON.stringify(conf));
}
run('COLD - nothing taught, a new writer', function () { return []; });
run('LEARNED - everything from the other takes taught', function (ti) {
  var list = [];
  takes.forEach(function (u, ui) { if (ui !== ti) list = list.concat(u.lab); });
  return taught(list);
});
