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

/* ...and the other half of the same rule: a flicker of the length a
   resting hand actually produces must NOT leave a dot, however close to
   recent writing it lands. This is what was putting 22 of the 39 stray
   marks on the page. */
test('a palm-length flicker near recent writing leaves nothing', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.3 });
  app.tick(200);
  app.down(2, PEN.x + 130, PEN.y + 6);
  app.tick(45);
  app.up(2);
  after(400, function () {
    app.flushFrames();
    check('write + 45ms flicker -> still 1 stroke', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

test('deliberate dot near recent writing still inks', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y, speed: 0.3 });
  app.tick(200);
  /* A decimal point, at the length a real one actually is. This tap used
     to be 70ms, which is not a pen at all - measured across three aim
     drills, deliberate taps run 267-490ms at the median, while a resting
     hand fragments into contacts of 32-58ms. The old number sat squarely
     in the palm's range and was invented, not observed. */
  app.down(2, PEN.x + 130, PEN.y + 6);
  app.tick(280);
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

/* ---------------- replayed from a real iPad recording ----------------
 * These are the literal coordinate streams of two contacts that inked
 * when they should not have. Both were long-lived resting contacts
 * whose centroid snapped between lobes of the palm blob - they never
 * actually travelled anywhere. */

/* portrait, matching the geometry the recording was captured in */
function freshPortrait() {
  var app = H.load({ quiet: true, dpr: 2, viewW: 768, viewH: 872 });
  app.flushFrames();
  return app;
}

/* [dt from previous sample, clientX, clientY] */
function replay(app, id, samples) {
  app.down(id, samples[0][1], samples[0][2]);
  for (var i = 1; i < samples.length; i++) {
    app.tick(samples[i][0]);
    app.moveTo(id, samples[i][1], samples[i][2]);
  }
  app.up(id);
}

/* contact 4067367197: alive 2.4s, oscillating ~39px between two lobes */
var OSC_197 = [
  [0, 667, 482], [19, 652, 453], [14, 653, 452], [9, 672, 486], [16, 673, 491],
  [17, 672, 491], [32, 671, 490], [17, 670, 489], [24, 650, 456], [15, 650, 452],
  [11, 669, 486], [18, 670, 489], [37, 651, 455], [13, 650, 452], [21, 651, 452],
  [13, 651, 452], [18, 652, 452], [17, 651, 453], [16, 651, 454], [14, 652, 455],
  [19, 650, 455], [16, 649, 455], [17, 648, 454], [19, 647, 455], [18, 648, 455]
];

/* contact 4067367206: 81px jump 31ms after landing, then flip-flops */
var OSC_206 = [
  [0, 635, 540], [31, 669, 614], [13, 670, 625], [1, 669, 628], [15, 669, 631],
  [18, 668, 631], [18, 668, 632], [32, 666, 632], [33, 665, 632], [42, 682, 599],
  [16, 684, 594], [9, 664, 633], [17, 662, 638], [33, 684, 600], [36, 664, 635],
  [2, 683, 598], [24, 686, 592], [8, 687, 592], [15, 687, 591], [36, 687, 589],
  [20, 688, 586], [15, 689, 584], [25, 689, 581], [22, 690, 579], [4, 675, 603]
];

test('a resting contact whose centroid oscillates does not ink (real data)', function (done) {
  var app = freshPortrait();
  replay(app, 197, OSC_197);
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('oscillating palm contact 197 -> 0 strokes', n === 0, n + ' strokes');
    done();
  });
});

test('a palm that jumps 81px on landing does not ink (real data)', function (done) {
  var app = freshPortrait();
  replay(app, 206, OSC_206);
  after(300, function () {
    app.flushFrames();
    var n = app.strokes().length;
    check('jumping palm contact 206 -> 0 strokes', n === 0, n + ' strokes');
    done();
  });
});

/* ---------------- Palm: Strict ----------------
 * Contact 4067368028, replayed from a real recording. It drifted 22px
 * in 140ms at about 0.16 px/ms in one coherent direction - which is
 * arithmetically indistinguishable from slow careful writing, and
 * slower than the "careful symbol" stroke this suite requires to ink.
 * Max cannot reject it without also rejecting that. Strict can, and
 * gives up slow strokes to do it. */
var DRIFT_028 = [
  [0, 524, 518], [38, 527, 525], [1, 527, 527], [17, 528, 529], [24, 529, 531],
  [26, 530, 532], [12, 531, 534], [4, 532, 535], [18, 534, 538], [19, 536, 540],
  [14, 538, 542], [18, 543, 547], [15, 545, 551], [17, 550, 555], [17, 552, 558],
  [17, 555, 561], [15, 556, 564], [18, 557, 566], [16, 558, 567], [18, 559, 568],
  [15, 560, 568], [19, 560, 569], [32, 561, 569], [15, 562, 569]
];

test('a steady slow palm drift inks at Max but not at Strict', function (done) {
  var max = freshAtLevel(2);
  max.stroke({ id: 9, x0: 524, y0: 518, x1: 560, y1: 546, speed: 0.16 });
  after(300, function () {
    max.flushFrames();
    check('0.16 px/ms drift inks at Max', max.strokes().length === 1,
          max.strokes().length + ' strokes');
    var strict = freshAtLevel(3);
    strict.stroke({ id: 9, x0: 524, y0: 518, x1: 560, y1: 546, speed: 0.16 });
    after(300, function () {
      strict.flushFrames();
      check('...and is refused at Strict', strict.strokes().length === 0,
            strict.strokes().length + ' strokes');
      done();
    });
  });
});

/* The documented ceiling, not a wish. Contact 4067368028 starts as a slow
 * drift and ACCELERATES to 0.38 px/ms - as fast as ordinary handwriting.
 * No speed threshold can refuse it without refusing writing too, so it
 * inks at every level that inks at all. This test exists to record that
 * fact, so nobody later mistakes it for a regression. */
test('a palm dragged at writing speed defeats every level (known ceiling)', function (done) {
  var app = freshAtLevel(3);
  replay(app, 28, DRIFT_028);
  after(300, function () {
    app.flushFrames();
    check('palm dragged at writing speed still inks, even at Strict',
          app.strokes().length === 1, app.strokes().length + ' strokes');
    done();
  });
});

test('Strict still inks normal writing', function (done) {
  var app = freshAtLevel(3);
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 160, y1: PEN.y + 40, speed: 0.30, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    check('normal writing inks at Strict', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

test('Strict gives up slow careful strokes - the trade, stated', function (done) {
  var app = freshAtLevel(3);
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 32, y1: PEN.y + 32, speed: 0.10 });
  after(300, function () {
    app.flushFrames();
    check('slow careful stroke is refused at Strict (expected)',
          app.strokes().length === 0, app.strokes().length + ' strokes');
    done();
  });
});

/* ---------------- Tier 0: signals the hardware gives us free ---------------- */

test('a cancelled contact must not leave ink', function (done) {
  var app = fresh();
  /* the same brisk stroke, committed normally */
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 180, y1: PEN.y + 30, speed: 0.32 });
  after(250, function () {
    app.flushFrames();
    check('uncancelled stroke inks', app.strokes().length === 1, app.strokes().length + ' strokes');

    /* now the same stroke, but iOS cancels the contact at the end */
    var app2 = fresh();
    app2.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 180, y1: PEN.y + 30,
                  speed: 0.32, keepDown: true });
    app2.up(1, true);                       /* touchcancel */
    after(250, function () {
      app2.flushFrames();
      check('cancelled stroke leaves nothing', app2.strokes().length === 0,
            app2.strokes().length + ' strokes');
      done();
    });
  });
});

test('contacts arriving together are treated as a hand', function (done) {
  /* marginal speed: inks on its own, must not ink as part of a burst */
  var solo = fresh();
  solo.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 70, y1: PEN.y + 20, speed: 0.11 });
  after(250, function () {
    solo.flushFrames();
    check('marginal stroke inks on its own', solo.strokes().length === 1,
          solo.strokes().length + ' strokes');

    var burst = fresh();
    burst.downMulti([[1, PEN.x, PEN.y], [2, PEN.x + 60, PEN.y + 70], [3, PEN.x + 120, PEN.y + 40]]);
    var i;
    for (i = 1; i <= 40; i++) {
      burst.tick(16);
      burst.moveTo(1, PEN.x + i * 1.76, PEN.y + i * 0.5);
      burst.moveTo(2, PEN.x + 60, PEN.y + 70);
      burst.moveTo(3, PEN.x + 120, PEN.y + 40);
    }
    burst.up(1); burst.up(2); burst.up(3);
    after(250, function () {
      burst.flushFrames();
      check('the same stroke in a 3-contact burst does not ink',
            burst.strokes().length === 0, burst.strokes().length + ' strokes');
      var g = burst.trace().samples.filter(function (r) { return r[0] === 'g' && r[1] === 'burst'; });
      check('the burst itself is recorded', g.length > 0);
      done();
    });
  });
});

test('the trace carries what the digitizer actually reports', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 80, y1: PEN.y, speed: 0.3 });
  after(200, function () {
    var caps = app.trace().caps;
    check('caps are probed and reported', !!caps && typeof caps === 'object',
          JSON.stringify(caps));
    /* the harness fakes only radiusX/radiusY, so the prefixed twins must
       come back "absent" rather than silently reading as zero */
    check('absent properties are distinguishable from zero',
          caps.webkitRadiusX === null && caps.radiusX === 0,
          'webkitRadiusX=' + caps.webkitRadiusX + ' radiusX=' + caps.radiusX);
    done();
  });
});

/* ---------------- Tier 1: settling vs stroking ---------------- */

/* Contact 4067368407, replayed verbatim. It landed, slid 48px while the
 * contact patch settled, inked at 128ms, then dwelled for 330ms of 1px
 * steps and lifted at 531ms - just under the 600ms the old mid-stroke
 * discard required, so it left a mark. */
var SETTLE_407 = [
  [0, 671, 615], [20, 665, 621], [16, 660, 629], [13, 654, 635], [12, 650, 637],
  [17, 645, 639], [17, 640, 642], [16, 636, 645], [17, 634, 647], [38, 628, 651],
  [12, 626, 653], [26, 624, 654], [7, 623, 654], [34, 622, 655], [16, 621, 655],
  [65, 621, 656], [35, 620, 656], [17, 619, 657], [32, 618, 657], [18, 618, 658],
  [33, 617, 659], [16, 617, 658], [19, 617, 659]
];

test('a contact that settles and dwells is a palm, not a stroke', function (done) {
  var app = fresh();
  replay(app, 407, SETTLE_407);
  after(300, function () {
    app.flushFrames();
    check('landed, slid, then dwelled -> no ink', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    done();
  });
});

test('a real stroke that moves and lifts is untouched', function (done) {
  var app = fresh();
  /* same distance and speed as the palm above, but it LIFTS when it stops */
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 150, y1: PEN.y + 40,
               speed: 0.35, wobble: 3 });
  after(300, function () {
    app.flushFrames();
    check('move then lift -> inks', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

test('a brief pause mid-stroke does not kill the stroke', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 90, y1: PEN.y,
               speed: 0.3, keepDown: true });
  /* hesitate for 200ms - under the dwell threshold - then carry on */
  var i;
  for (i = 0; i < 7; i++) { app.tick(28); app.moveTo(1, PEN.x + 90, PEN.y); }
  for (i = 1; i <= 20; i++) { app.tick(16); app.moveTo(1, PEN.x + 90 + i * 5, PEN.y + i); }
  app.up(1);
  after(300, function () {
    app.flushFrames();
    check('pause then continue -> still one stroke', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

test('three contacts translating together are one hand', function (done) {
  var app = fresh();
  app.downMulti([[1, 400, 300], [2, 470, 360], [3, 540, 330]]);
  var i;
  for (i = 1; i <= 20; i++) {
    app.tick(16);
    app.moveTo(1, 400 + i * 6, 300 + i * 2);
    app.moveTo(2, 470 + i * 6, 360 + i * 2);
    app.moveTo(3, 540 + i * 6, 330 + i * 2);
  }
  app.up(1); app.up(2); app.up(3);
  after(300, function () {
    app.flushFrames();
    check('rigid 3-contact translation -> no ink', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    var g = app.trace().samples.filter(function (r) { return r[0] === 'g' && r[1] === 'rigid'; });
    check('the rigid group is recorded', g.length > 0);
    done();
  });
});

test('two fingers moving together are still a pan, not a hand', function (done) {
  var app = fresh();
  var z = app.trace().zoom;
  app.down(1, 300, 300);
  app.down(2, 500, 300);
  var i;
  for (i = 1; i <= 20; i++) {
    app.tick(16);
    app.moveTo(1, 300, 300 + i * 7);
    app.moveTo(2, 500, 300 + i * 7);
  }
  app.up(1); app.up(2);
  after(300, function () {
    app.flushFrames();
    /* the pinch math applies a factor of ~1.0 each frame, so zoom drifts
       by ~1e-15 - compare with a tolerance, not for equality */
    check('two-finger pan is not treated as a rigid hand',
          app.strokes().length === 0 && Math.abs(app.trace().zoom - z) < 0.001,
          app.strokes().length + ' strokes, zoom ' + app.trace().zoom);
    done();
  });
});

/* Contact 4067368813, replayed verbatim - the single mark that survived
 * a 48 second recording. It crept, committed, and then began snapping
 * between two contact lobes: 33px, 31px back, 38px, 40px. The hopping
 * reads as motion, so the dwell test never fires and the stroke keeps
 * the ink. The jump detector existed but only ran before a contact
 * committed; appendInk watched nothing. */
var LOBES_813 = [
  [0, 547, 421], [56, 544, 426], [17, 544, 427], [17, 544, 428], [17, 544, 430],
  [16, 544, 431], [16, 544, 433], [17, 544, 435], [17, 544, 436], [16, 544, 437],
  [17, 544, 438], [19, 543, 438], [14, 543, 439], [33, 543, 440], [17, 542, 440],
  [49, 542, 441], [34, 542, 442], [50, 542, 443], [50, 542, 444], [51, 542, 445],
  [99, 542, 446], [116, 542, 447], [51, 541, 447], [33, 540, 447], [17, 539, 447],
  [16, 538, 447], [17, 536, 447], [17, 534, 447], [17, 531, 447], [16, 527, 447],
  [16, 524, 448], [30, 522, 448], [8, 520, 448], [20, 519, 448], [32, 517, 448],
  [12, 515, 448], [21, 514, 448], [14, 513, 448], [19, 513, 447], [13, 513, 445],
  [21, 513, 443], [13, 512, 441],
  [36, 542, 427], [18, 511, 430], [1, 506, 427], [27, 543, 420], [21, 547, 416],
  [35, 508, 410], [18, 542, 409], [31, 547, 406], [3, 548, 405], [10, 548, 403],
  [20, 549, 401], [14, 549, 398], [20, 553, 397], [13, 555, 395], [22, 556, 393]
];

test('a committed stroke that starts hopping between lobes is dropped', function (done) {
  var app = fresh();
  replay(app, 813, LOBES_813);
  after(300, function () {
    app.flushFrames();
    check('oscillating centroid -> no surviving mark', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    done();
  });
});

test('a long stroke with genuine direction changes survives', function (done) {
  var app = fresh();
  /* writing reverses direction constantly, but never teleports */
  app.down(1, PEN.x, PEN.y);
  var i, a;
  for (i = 1; i <= 60; i++) {
    app.tick(16);
    a = i * 0.35;
    app.moveTo(1, PEN.x + i * 3 + Math.sin(a) * 18, PEN.y + Math.cos(a) * 22);
  }
  app.up(1);
  after(300, function () {
    app.flushFrames();
    check('curvy writing -> still one stroke', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

/* ---------------- run ---------------- */
console.log('\npalm rejection behaviour\n');

/* ---------------- stylus: writing small ---------------- */

/* Contact 144376933, replayed verbatim from a report sent from the iPad
 * with NOTHING else on the glass - no palm, no second contact. It is a
 * stylus writing a small character: it inked at 212ms and then, at
 * 1461ms, was erased as "dwell" because it had stayed inside a 14px
 * circle for just over 300ms while drawing the flat of a letter. Four
 * strokes in that one 24-second recording died the same way, which is
 * what "my stylus is treated as the palm and removed" actually was. */
var WRITE_933 = [
  [0, 253, 172], [112, 241, 178], [17, 239, 182], [17, 239, 187], [50, 241, 187],
  [16, 244, 185], [16, 247, 181], [17, 249, 179], [16, 249, 177], [20, 250, 175],
  [46, 249, 176], [18, 249, 177], [17, 249, 179], [16, 249, 180], [33, 251, 181],
  [17, 253, 181], [17, 256, 181], [16, 258, 180], [17, 260, 176], [17, 261, 173],
  [16, 262, 168], [17, 262, 165], [18, 262, 163], [15, 262, 162], [33, 262, 164],
  [18, 262, 169], [16, 262, 170], [17, 263, 174], [16, 263, 176], [17, 264, 179],
  [17, 264, 184], [17, 264, 187], [17, 264, 189], [15, 264, 191], [19, 265, 191],
  [14, 267, 189], [19, 269, 184], [16, 272, 181], [16, 275, 177], [17, 277, 175],
  [16, 278, 172], [18, 279, 171], [65, 279, 172], [17, 279, 173], [17, 279, 175],
  [17, 280, 175], [16, 281, 176], [16, 282, 178], [18, 283, 180], [18, 284, 180],
  [14, 285, 180], [18, 287, 180], [32, 288, 180], [33, 289, 180], [34, 290, 180],
  [17, 292, 178], [16, 294, 177], [33, 295, 176], [18, 296, 176], [17, 297, 175],
  [17, 299, 175], [17, 300, 175], [16, 301, 175], [16, 300, 179], [17, 300, 183],
  [18, 295, 187], [15, 293, 189], [17, 291, 189], [17, 290, 189], [16, 290, 186],
  [18, 291, 183], [17, 293, 180], [14, 293, 179], [18, 294, 178], [32, 294, 180],
  [18, 294, 183], [17, 294, 186], [50, 295, 186], [15, 297, 185], [19, 298, 184],
  [15, 298, 182], [16, 299, 182], [34, 300, 182], [33, 300, 183], [33, 302, 183],
  [17, 304, 183], [17, 306, 181], [17, 308, 180]
];

test('writing a small character is not a settling palm', function (done) {
  var app = fresh();
  replay(app, 933, WRITE_933);
  after(300, function () {
    app.flushFrames();
    check('a small stylus character survives to the lift', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    var v = app.trace().samples.filter(function (r) { return r[0] === "v"; })
                               .map(function (r) { return r[2]; });
    check('...and is never called dwell', v.indexOf('dwell') < 0, v.join(','));
    done();
  });
});

/* A short deliberate mark - a comma, a minus sign, the tick on a 7. Too
 * slow and too short to pass the live commit gate, so it used to leave
 * nothing at all: "it is not accurate when i draw small line kind of
 * thing". The lift is what proves it was a pen. */
test('a small slow mark still leaves a mark', function (done) {
  var app = fresh();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 22, y1: PEN.y + 4, speed: 0.07 });
  after(300, function () {
    app.flushFrames();
    check('a 22px mark drawn slowly is drawn', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

/* ...but the same mark must not be a licence for a palm that lands,
 * creeps and then sits there. It never lifts in time. */
test('a palm that lands and sits is not rescued as a small mark', function (done) {
  var app = fresh();
  app.down(50, 640, 600);
  var i;
  for (i = 1; i <= 8; i++) { app.tick(40); app.moveTo(50, 640 + i * 2, 600 + i); }
  for (i = 1; i <= 20; i++) { app.tick(60); app.moveTo(50, 656 + (i % 2), 608); }
  app.up(50);
  after(300, function () {
    app.flushFrames();
    check('a resting palm leaves nothing', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    done();
  });
});


/* ---------------- Glove mode ----------------
 * With the hand physically off the glass there is nothing to confuse the
 * pen with, so every contact is the pen and none of the guessing runs.
 * Everything the guessing costs comes straight back: ink from the first
 * sample instead of 160-320ms later, every small mark kept instead of
 * sixteen of twenty-seven, no stroke retracted mid-word. What must still
 * work is everything that is NOT rejection - gestures, dots, undo - and
 * that is what these check, because switching the engine off used to
 * switch those off with it. */

function freshGlove() {
  return freshAtLevel(0);
}

test('Glove: a stroke inks, and so does a mark Max would lose', function (done) {
  var app = freshGlove();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y + 30, speed: 0.30, wobble: 3 });
  app.tick(150);
  /* 18px at 0.05 px/ms - below every commit threshold there is */
  app.stroke({ id: 2, x0: PEN.x + 200, y0: PEN.y, x1: PEN.x + 218, y1: PEN.y + 4, speed: 0.05 });
  after(300, function () {
    app.flushFrames();
    check('Glove inks both, including the slow 18px mark',
          app.strokes().length === 2, app.strokes().length + ' strokes');
    done();
  });
});

test('Glove: a motionless tap leaves a dot', function (done) {
  var app = freshGlove();
  app.down(1, 600, 400);
  app.tick(200);
  app.up(1);
  after(300, function () {
    app.flushFrames();
    /* a one-point stroke draws no segment at all, so without the dot path
       a decimal point simply vanishes */
    check('a tap leaves a mark', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    done();
  });
});

test('Glove: two fingers gesture rather than draw', function (done) {
  var app = freshGlove();
  var z0 = app.trace().zoom;
  app.down(10, 380, 300);
  app.down(11, 560, 300);
  var i;
  for (i = 1; i <= 25; i++) {
    app.tick(16);
    app.moveTo(10, 380 - i * 5, 300);
    app.moveTo(11, 560 + i * 5, 300);
  }
  app.up(10); app.up(11);
  after(300, function () {
    app.flushFrames();
    check('a pinch zooms in Glove mode', Math.abs(app.trace().zoom - z0) > 0.02,
          z0 + ' -> ' + app.trace().zoom);
    check('...and leaves no ink behind', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    done();
  });
});

/* The jump rule lived in appendInk with no palm-level gate, and the note
 * above it says plainly that a disc tip hops 30-40px between lobes. So in
 * the one mode that is meant to contain no guessing at all, real strokes
 * were being thrown away and announced as 'Palm stroke discarded'. */
test('Glove: a stroke whose centroid hops is still a stroke', function (done) {
  var app = freshGlove();
  var i;
  app.down(1, 300, 300);
  for (i = 1; i <= 5; i++) { app.tick(16); app.moveTo(1, 300 + i * 8, 300); }
  app.tick(16); app.moveTo(1, 378, 300);            /* a 38px hop */
  for (i = 1; i <= 3; i++) { app.tick(16); app.moveTo(1, 378 + i * 8, 300); }
  app.tick(16); app.moveTo(1, 450, 302);            /* and another */
  for (i = 1; i <= 5; i++) { app.tick(16); app.moveTo(1, 450 + i * 8, 302); }
  app.up(1);
  after(300, function () {
    app.flushFrames();
    check('Glove keeps it', app.strokes().length === 1,
          app.strokes().length + ' strokes');
    check('...and says nothing about palms',
          String(app.els.toast.innerHTML || '').indexOf('alm') < 0,
          JSON.stringify(app.els.toast.innerHTML || ''));
    done();
  });
});

/* ...while Max, which exists to guess, still rejects the same contact */
test('Max still rejects a hopping contact', function (done) {
  var app = freshAtLevel(2);
  var i;
  app.down(1, 300, 300);
  for (i = 1; i <= 5; i++) { app.tick(16); app.moveTo(1, 300 + i * 8, 300); }
  app.tick(16); app.moveTo(1, 378, 300);
  for (i = 1; i <= 3; i++) { app.tick(16); app.moveTo(1, 378 + i * 8, 300); }
  app.tick(16); app.moveTo(1, 450, 302);
  for (i = 1; i <= 5; i++) { app.tick(16); app.moveTo(1, 450 + i * 8, 302); }
  app.up(1);
  after(300, function () {
    app.flushFrames();
    check('Max rejects it', app.strokes().length === 0,
          app.strokes().length + ' strokes');
    done();
  });
});

test('Glove: a two-finger tap still undoes', function (done) {
  var app = freshGlove();
  app.stroke({ id: 1, x0: PEN.x, y0: PEN.y, x1: PEN.x + 120, y1: PEN.y + 30, speed: 0.30 });
  app.tick(150);
  app.flushFrames();
  var before = app.strokes().length;
  app.twoFingerTap(300, 500, 480, 520);
  after(300, function () {
    app.flushFrames();
    /* both tap contacts are already inking by the time the gesture is
       recognised, so each would leave a dot and the undo would remove one
       of those instead of the stroke */
    check('the tap undoes the stroke, not a dot it just made',
          before === 1 && app.strokes().length === 0,
          before + ' -> ' + app.strokes().length);
    done();
  });
});

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
