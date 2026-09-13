/* ============================================================
 * test_palm.js - behavioural tests for the palm-rejection engine.
 * Drives the real index.html through scripts/harness.js.
 *
 * Geometry: iPad 3 landscape, 1024x712 canvas under a 56px header.
 * Right-handed writer: pen works around (300,300), the palm rests
 * low and right, around (700,600) - where a right hand actually
 * sits when writing mid-page.
 *
 * Run: node scripts/test_palm.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');

var pass = 0, fail = 0, failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else {
    fail++; failures.push(name + (detail ? ' -- ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? '  (' + detail + ')' : ''));
  }
}

function fresh(opts) {
  opts = opts || {};
  var app = H.load({ quiet: true, dpr: opts.dpr || 2, viewW: 1024, viewH: 712 });
  app.flushFrames();
  return app;
}

/* the tap-dot path queues a real 220ms timer, so tests that could
 * produce a dot must wait past it before reading the note */
function after(ms, fn) { setTimeout(fn, ms); }

var PEN = { x: 300, y: 300 };
var PALM = { x: 700, y: 600 };

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

/* ---------------- palm must not ink ---------------- */

test('palm tap (land, sit 150ms, lift) leaves nothing', function (done) {
  var app = fresh();
  app.down(9, PALM.x, PALM.y);
  app.tick(60); app.moveTo(9, PALM.x + 1, PALM.y + 1);
  app.tick(60); app.moveTo(9, PALM.x + 2, PALM.y);
  app.tick(30); app.up(9);
  after(300, function () {
    app.flushFrames();
    check('palm tap -> 0 strokes', app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

test('palm slide (60px at 0.06 px/ms) leaves nothing', function (done) {
  var app = fresh();
  app.stroke({ id: 9, x0: PALM.x, y0: PALM.y, x1: PALM.x - 60, y1: PALM.y - 10, speed: 0.06, hold: 120 });
  after(300, function () {
    app.flushFrames();
    check('palm slide -> 0 strokes', app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

test('palm long slow drag (120px at 0.05 px/ms) leaves nothing', function (done) {
  var app = fresh();
  app.stroke({ id: 9, x0: PALM.x, y0: PALM.y, x1: PALM.x - 120, y1: PALM.y, speed: 0.05, hold: 200 });
  after(300, function () {
    app.flushFrames();
    check('palm drag -> 0 strokes', app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

test('palm resting still for 1.5s leaves nothing', function (done) {
  var app = fresh();
  app.down(9, PALM.x, PALM.y);
  for (var i = 0; i < 40; i++) { app.tick(40); app.moveTo(9, PALM.x + (i % 3) - 1, PALM.y + (i % 2)); }
  app.up(9);
  after(300, function () {
    app.flushFrames();
    check('palm rest -> 0 strokes', app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

/* ---------------- pen must ink ---------------- */

test('brisk writing (200px at 0.35 px/ms) inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 200, y1: PEN.y - 40, speed: 0.35 });
  after(300, function () {
    app.flushFrames();
    check('brisk write -> 1 stroke', app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

test('normal writing (100px at 0.15 px/ms) inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 90, y1: PEN.y + 40, speed: 0.15 });
  after(300, function () {
    app.flushFrames();
    check('normal write -> 1 stroke', app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

test('small careful symbol (45px at 0.10 px/ms) inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 32, y1: PEN.y + 32, speed: 0.10 });
  after(300, function () {
    app.flushFrames();
    check('careful symbol -> 1 stroke', app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

test('deliberate dot near recent writing still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.3 });
  app.tick(200);
  /* a decimal point: quick tap right where we were just writing */
  app.down(2, PEN.x + 130, PEN.y + 6);
  app.tick(70);
  app.up(2);
  after(400, function () {
    app.flushFrames();
    check('write + dot -> 2 strokes', app.strokes().length === 2, app.strokes().length + ' strokes');
    done();
  });
});

/* ---------------- palm + pen together (the reported bug) ---------------- */

test('pen writes while palm rests (palm landed first)', function (done) {
  var app = fresh();
  /* hand lands first, as it does in a real writing posture */
  app.down(9, PALM.x, PALM.y);
  for (var i = 0; i < 10; i++) { app.tick(40); app.moveTo(9, PALM.x + (i % 3) - 1, PALM.y); }
  /* now the pen writes */
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 180, y1: PEN.y - 30, speed: 0.3 });
  app.up(9);
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('palm down + pen writes -> exactly 1 stroke', n === 1, n + ' strokes');
    done();
  });
});

test('pen writes after a palm has slid (palm must not lock the pen out)', function (done) {
  var app = fresh();
  /* palm lands and slides - today this falsely wins the ink */
  app.down(9, PALM.x, PALM.y);
  app.tick(120); app.moveTo(9, PALM.x, PALM.y);
  for (var i = 1; i <= 12; i++) { app.tick(30); app.moveTo(9, PALM.x - i * 5, PALM.y - i); }
  /* pen now writes briskly while the palm is still down */
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 180, y1: PEN.y - 30, speed: 0.32 });
  app.up(9);
  after(300, function () {
    app.flushFrames();
    var s = app.strokes();
    check('palm slide + pen -> exactly 1 stroke', s.length === 1, s.length + ' strokes');
    if (s.length === 1) {
      /* the surviving stroke must be the pen's, not the palm's */
      var x0 = s[0].pts[0][0];
      check('surviving stroke is the pen (not the palm)', x0 < 500, 'starts at x=' + Math.round(x0));
    } else {
      check('surviving stroke is the pen (not the palm)', false, 'wrong stroke count');
    }
    done();
  });
});

test('two palm contacts landing together (heel + edge) leave nothing', function (done) {
  var app = fresh();
  app.down(9, PALM.x, PALM.y);
  app.tick(40);
  app.down(10, PALM.x + 30, PALM.y + 20);
  for (var i = 1; i <= 10; i++) {
    app.tick(35);
    app.moveTo(9, PALM.x - i * 3, PALM.y);
    app.moveTo(10, PALM.x + 30 - i * 3, PALM.y + 20);
  }
  app.up(9); app.up(10);
  after(300, function () {
    app.flushFrames();
    check('palm team -> 0 strokes', app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

/* ---------------- false negatives: real writing must survive ----------------
 * Rejecting a palm is only half the job. An engine tuned until nothing
 * inks would pass every test above, so these guard the other side. */

test('sustained writing with the palm resting (8 strokes)', function (done) {
  var app = fresh();
  app.down(9, PALM.x, PALM.y);            /* hand down for the whole session */
  var i;
  for (i = 0; i < 8; i++) {
    app.tick(120);
    app.moveTo(9, PALM.x + (i % 3) - 1, PALM.y + (i % 2));   /* palm micro-drift */
    app.stroke({ id: 100 + i, x0: PEN.x + i * 22, y0: PEN.y, x1: PEN.x + i * 22 + 18, y1: PEN.y + 26, speed: 0.22, wobble: 3 });
  }
  app.up(9);
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('8 strokes written with palm down -> 8 inked', n === 8, n + ' inked');
    done();
  });
});

test('writing the next line down still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(300);
  /* next line: below the previous ink, same side - must not be read as a palm */
  app.stroke({ id: 2, x0: PEN.x, y0: PEN.y + 40, x1: PEN.x + 120, y1: PEN.y + 40, speed: 0.25, wobble: 3 });
  app.tick(300);
  app.stroke({ id: 3, x0: PEN.x, y0: PEN.y + 80, x1: PEN.x + 120, y1: PEN.y + 80, speed: 0.25, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('three successive lines -> 3 inked', n === 3, n + ' inked');
    done();
  });
});

test('fraction bar (deliberate straight line) inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 70, y1: PEN.y, speed: 0.18 });
  after(300, function () {
    app.flushFrames();
    check('straight fraction bar -> 1 stroke', app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

test('slow fraction bar under a resting palm still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 100, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(200);
  app.down(9, PALM.x, PALM.y);
  app.tick(200); app.moveTo(9, PALM.x + 1, PALM.y);
  /* a slow, dead-straight line drawn deliberately with the hand down */
  app.stroke({ id: 2, x0: PEN.x, y0: PEN.y + 30, x1: PEN.x + 80, y1: PEN.y + 30, speed: 0.13 });
  app.up(9);
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('writing + slow straight bar with palm down -> 2 inked', n === 2, n + ' inked');
    done();
  });
});

test('writing low on the page (inside the palm zone) still inks', function (done) {
  var app = fresh();
  /* bottom-right of the canvas is a soft palm band - writing there
     should be harder to commit, never impossible */
  app.stroke({ id: 1, x0: 820, y0: 690, x1: 940, y1: 700, speed: 0.28, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    check('writing in the palm band -> 1 stroke', app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

/* seed storage so the app boots at a chosen palm level */
function freshAtLevel(level, hand) {
  var payload = {
    v: 4,
    notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' },
    set: { palmLevel: level, hand: typeof hand === 'number' ? hand : 0 }
  };
  var app = H.load({
    quiet: true, dpr: 2, viewW: 1024, viewH: 712,
    seed: { mathnotes_v4: JSON.stringify(payload) }
  });
  app.flushFrames();
  return app;
}

test('palm level Off is a real escape hatch (inks what Max rejects)', function (done) {
  var slide = { id: 9, x0: PALM.x, y0: PALM.y, x1: PALM.x - 60, y1: PALM.y, speed: 0.05, hold: 150 };
  var maxApp = freshAtLevel(2);
  maxApp.stroke(slide);
  after(300, function () {
    maxApp.flushFrames();
    check('same slide rejected at Max', maxApp.strokes().length === 0, maxApp.strokes().length + ' strokes');
    var offApp = freshAtLevel(0);
    offApp.stroke(slide);
    after(300, function () {
      offApp.flushFrames();
      check('same slide inks at Off', offApp.strokes().length === 1, offApp.strokes().length + ' strokes');
      done();
    });
  });
});

test('left-handed palm zone mirrors correctly', function (done) {
  var app = freshAtLevel(2, 1);            /* HAND_L */
  /* a left-hander's palm rests low and LEFT */
  app.stroke({ id: 1, x0: 300, y0: 250, x1: 420, y1: 250, speed: 0.28, wobble: 3 });
  app.tick(200);
  app.stroke({ id: 9, x0: 120, y0: 620, x1: 175, y1: 618, speed: 0.14, hold: 150 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('left-hand: pen inks, low-left palm slide rejected', n === 1, n + ' strokes');
    done();
  });
});

test('resuming lower down the page after a gap still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(400);
  /* skip a line or finish a tall equation: the next stroke starts well
     below the last ink, which is where the anatomy rule looks for a palm */
  app.stroke({ id: 2, x0: PEN.x, y0: PEN.y + 170, x1: PEN.x + 110, y1: PEN.y + 170, speed: 0.22, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('writing 170px lower -> 2 inked', n === 2, n + ' inked');
    done();
  });
});

test('slow straight stroke 170px below previous ink still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(400);
  /* worst case for the anatomy rule: below recent ink AND straight AND slow */
  app.stroke({ id: 2, x0: PEN.x, y0: PEN.y + 170, x1: PEN.x + 90, y1: PEN.y + 170, speed: 0.13 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('slow straight stroke below ink -> 2 inked', n === 2, n + ' inked');
    done();
  });
});

test('continuing down-AND-right (long division, matrix) still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(400);
  /* down and to the RIGHT of the last ink is exactly the quadrant the
     anatomy rule calls "palm" - but it is also where a long division or
     the next column of a matrix goes */
  app.stroke({ id: 2, x0: PEN.x + 200, y0: PEN.y + 170, x1: PEN.x + 290, y1: PEN.y + 176, speed: 0.24, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('down-and-right stroke -> 2 inked', n === 2, n + ' inked');
    done();
  });
});

test('SLOW straight stroke down-AND-right still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.25, wobble: 3 });
  app.tick(400);
  /* the genuine worst case: suspect quadrant + straight + slow */
  app.stroke({ id: 2, x0: PEN.x + 200, y0: PEN.y + 170, x1: PEN.x + 280, y1: PEN.y + 170, speed: 0.13 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('slow straight down-and-right -> 2 inked', n === 2, n + ' inked');
    done();
  });
});

test('a setting saved on the old Med level is migrated to Max', function (done) {
  var app = freshAtLevel(1);            /* PALM_MED as stored by an old build */
  app.stroke({ id: 9, x0: PALM.x, y0: PALM.y, x1: PALM.x - 60, y1: PALM.y, speed: 0.05, hold: 150 });
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('stored Med no longer means "6px and it inks"', n === 0, n + ' strokes');
    done();
  });
});

/* ---------------- run ---------------- */
console.log('\npalm rejection behaviour\n');
(function run(i) {
  if (i >= tests.length) {
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    if (fail) {
      console.log('\nfailing:');
      for (var k = 0; k < failures.length; k++) console.log('  - ' + failures[k]);
    }
    process.exit(fail ? 1 : 0);
    return;
  }
  tests[i].fn(function () { run(i + 1); });
})(0);
