/* ============================================================
 * replay-core.js - feed a recorded trace back through the engine.
 *
 * Shared by replay.js (look at one recording in detail) and
 * score.js (run every recording and print a scoreboard). The trace
 * stores raw client coordinates and the geometry they were captured
 * in, so the replay gives the engine exactly what the glass gave it.
 * ============================================================ */
'use strict';
var H = require('./harness.js');

function emptyPayload(trace) {
  return {
    v: 4,
    notebooks: [{ id: 'nb1', title: 'Replay', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'Replay', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' },
    set: {
      palmLevel: typeof trace.palmLevel === 'number' ? trace.palmLevel : 2,
      hand: typeof trace.hand === 'number' ? trace.hand : 0
    }
  };
}

/* what the device itself decided, read straight out of the recording */
function deviceSide(trace) {
  var verdicts = {}, dots = 0, undos = [], gestures = [], i, r;
  for (i = 0; i < trace.samples.length; i++) {
    r = trace.samples[i];
    if (r[0] === 'g') { gestures.push(r); continue; }
    if (r[0] !== 'v') continue;
    if (r[2] === 'dot') dots++;
    else if (r[2] === 'undo') undos.push(r[3]);
    else verdicts[r[1]] = r[2];
  }
  return { verdicts: verdicts, dots: dots, undos: undos, gestures: gestures };
}

/* done(result) is called after the tap-dot timer has had a chance to
   fire, because a dot is not on the page until it does. */
function replay(trace, opts, done) {
  opts = opts || {};
  var payload = emptyPayload(trace);
  var app = H.load({
    quiet: true,
    html: opts.html || undefined,
    dpr: trace.dpr || 2,
    viewW: trace.viewW || 1024,
    viewH: trace.viewH || 712,
    seed: { mathnotes_v4: JSON.stringify(payload) }
  });
  app.flushFrames();

  var contacts = {}, order = [], lastT = 0, i, r;

  function advanceTo(t) {
    var d = t - lastT;
    if (d > 0) app.tick(d);
    lastT = t;
  }

  for (i = 0; i < trace.samples.length; i++) {
    r = trace.samples[i];
    if (r[0] === 'v' || r[0] === 'g' || r[0] === 'z') continue;   /* not input */
    var phase = r[0], id = r[1], x = r[2], y = r[3], t = r[4], rx = r[5] || 0;
    advanceTo(t);
    if (phase === 0) {
      contacts[id] = { id: id, downAt: t, samples: 0, x0: x, y0: y,
                       path: 0, lx: x, ly: y, upAt: null };
      order.push(id);
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

  setTimeout(function () {
    app.flushFrames();
    var mine = app.trace();
    var verdicts = {}, dots = 0, gestures = [], q, rr;
    if (mine && mine.samples) {
      for (q = 0; q < mine.samples.length; q++) {
        rr = mine.samples[q];
        if (rr[0] === 'g') { gestures.push(rr); continue; }
        if (rr[0] !== 'v') continue;
        if (rr[2] === 'dot') dots++;
        else verdicts[rr[1]] = rr[2];
      }
    }
    done({
      app: app,
      contacts: contacts,
      order: order,
      lastT: lastT,
      strokes: app.strokes(),
      verdicts: verdicts,
      dots: dots,
      gestures: gestures,
      zoom: mine ? mine.zoom : 1,
      device: deviceSide(trace)
    });
  }, opts.settleMs || 400);
}

exports.replay = replay;
exports.deviceSide = deviceSide;
