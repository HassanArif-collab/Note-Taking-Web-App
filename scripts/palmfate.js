/* ============================================================
 * palmfate.js - what became of every contact in a recording, replayed
 * through this build: drawn and kept, drawn and then taken away, kept
 * out of sight and shown late, or never drawn. "It removed what I wrote"
 * is the second kind landing on the pen, and a verdict list cannot show
 * it: a stroke kept out of sight was still painted while it was written.
 *
 *   node scripts/palmfate.js [--auto] [--html f] [--list] traces/live-*.json
 *   fates: kept, late (kept out of sight, then shown), shown-removed,
 *   hidden-dropped (kept out of sight, never shown), never (not drawn), open
 *   --auto   replay with Auto palm rejection whatever the recording used
 *   --list   one line per contact
 *   --chain  join 20s live slices back into the sessions they came from
 *
 * Exports fate(trace, opts) for other tools.
 * ============================================================ */
'use strict';
var fs = require('fs'), path = require('path');
var H = require('./harness.js');

function fate(trace, opts) {
  opts = opts || {};
  var level = opts.auto ? 4 : (typeof trace.palmLevel === 'number' ? trace.palmLevel : 2);
  var payload = {
    v: 4,
    notebooks: [{ id: 'nb1', title: 'Replay', color: '#0381FE', notes: ['n1'] }],
    notes: { n1: { id: 'n1', title: 'Replay', cr: 1, mod: 1, scroll: 0, strokes: [] } },
    cur: { nb: 0, note: 'n1' },
    set: { palmLevel: level, hand: typeof trace.hand === 'number' ? trace.hand : 0 }
  };
  var app = H.load({ quiet: true, html: opts.html, dpr: trace.dpr || 2, viewW: trace.viewW || 1024,
                     viewH: trace.viewH || 712, seed: { mathnotes_v4: JSON.stringify(payload) } });
  app.flushFrames();
  var T0 = app.now(), cs = {}, order = [], seen = [], i, r, last = 0;
  /* page to screen at the start: nothing here scrolls before the first stroke */
  var ox = 0, oy = 56;

  /* which contact a stroke came from: a line starts when its contact
     lands, a dot is made when its contact lifts */
  function owner(s) {
    var t = s.pts[0][2] - T0, k, c, best = null, bd = 1e9, d, q;
    for (k = order.length - 1; k >= 0; k--) {
      c = cs[order[k]];
      if (c.stroke) continue;
      if (!(s.pts.length > 1 ? Math.abs(c.t0 - t) <= 1 : (c.upAt !== null && Math.abs(c.upAt - t) <= 1))) continue;
      /* several contacts land (or lift) in one event: the nearest one drew it */
      q = s.pts.length > 1 ? c.pts[0] : c.pts[c.pts.length - 1];
      d = Math.abs(q[0] - (s.pts[0][0] + ox)) + Math.abs(q[1] - (s.pts[0][1] + oy));
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function look() {
    var now = app.win.__mnInkNow(), ink = now.ink, id, c, list = now.strokes, k, s;
    for (id in ink) {
      c = cs[id];
      if (!c || ink[id].n < 3) continue;
      /* a line kept out of sight is not on the screen */
      if (ink[id].held) c.held = true;
      else c.painted = true;
    }
    for (k = 0; k < list.length; k++) {
      s = list[k];
      if (seen.indexOf(s) >= 0) continue;
      seen.push(s);
      c = owner(s);
      if (c) { c.stroke = s; c.keptAt = app.now() - T0; c.lateBy = c.keptAt - (c.upAt === null ? c.keptAt : c.upAt); }
    }
    for (k = 0; k < order.length; k++) {
      c = cs[order[k]];
      if (c.stroke && !c.gone && list.indexOf(c.stroke) < 0) { c.gone = app.now() - T0; c.painted = true; }
    }
  }

  for (i = 0; i < trace.samples.length; i++) {
    r = trace.samples[i];
    if (typeof r[0] !== 'number') continue;
    if (r[4] > last) { app.tick(r[4] - last); last = r[4]; }
    if (r[0] === 0) {
      cs[r[1]] = { id: r[1], k: order.length, t0: r[4], upAt: null, pts: [], cancel: false };
      order.push(r[1]);
      app.down(r[1], r[2], r[3], r[5] || 0);
    } else if (r[0] === 1) app.moveTo(r[1], r[2], r[3]);
    else { if (cs[r[1]]) { cs[r[1]].upAt = r[4]; cs[r[1]].cancel = r[0] === 3; } app.up(r[1], r[0] === 3); }
    if (cs[r[1]]) cs[r[1]].pts.push([r[2], r[3], r[4]]);
    app.flushFrames(1);
    look();
  }
  /* deferred strokes come in on a timer, and dots after the bounce wait */
  return new Promise(function (done) {
    setTimeout(function () {
      app.tick(3000);
      setTimeout(function () {
        app.flushFrames();
        look();
        var verdicts = {}, tr = app.trace(), k;
        (tr && tr.samples || []).forEach(function (q) { if (q[0] === 'v' && q[1] !== -1) (verdicts[q[1]] = verdicts[q[1]] || []).push(q[2]); });
        var out = order.map(function (id) {
          var c = cs[id], p = 0;
          for (k = 1; k < c.pts.length; k++) p += Math.hypot(c.pts[k][0] - c.pts[k - 1][0], c.pts[k][1] - c.pts[k - 1][1]);
          c.path = p;
          c.life = (c.upAt === null ? last : c.upAt) - c.t0;
          c.v = verdicts[id] || [];
          if (c.upAt === null) c.fate = 'open';             /* still down when the recording was cut */
          else if (c.stroke && !c.gone) c.fate = c.lateBy > 300 || (c.held && !c.painted) ? 'late' : 'kept';
          else if (c.painted) c.fate = 'shown-removed';
          else if (c.held) c.fate = 'hidden-dropped';
          else c.fate = 'never';
          c.why = (c.gone ? 'removed@' + c.gone + ' ' : '') + c.v.join(',');
          return c;
        });
        done({ contacts: out, app: app });
      }, 2600);
    }, 0);
  });
}
exports.fate = fate;

/* Live recordings are 20s slices of one session: the ring is posted and
   cleared, and the next slice carries on. Replayed one by one, each starts
   knowing nothing - no line written, no hand down - and its first seconds
   are judged unlike the iPad judged them. Slices posted within 30s of each
   other are joined back into the session they came from. */
function sessions(files) {
  var out = [], cur = null;
  files.forEach(function (f) {
    var tr = JSON.parse(fs.readFileSync(f, 'utf8')), at = Date.parse(tr.at), end = 0, i, r;
    for (i = 0; i < tr.samples.length; i++) { r = tr.samples[i]; if (typeof r[0] === 'number' && r[4] > end) end = r[4]; }
    var start = at - end;
    if (!cur || start - cur.end > 30000 || tr.palmLevel !== cur.tr.palmLevel) {
      cur = { files: [], start: start, end: at, tr: { viewW: tr.viewW, viewH: tr.viewH, dpr: tr.dpr, palmLevel: tr.palmLevel,
                                                     hand: tr.hand, samples: [] } };
      out.push(cur);
    }
    var off = Math.max(start - cur.start, cur.tr.samples.length ? cur.last + 1 : 0);
    for (i = 0; i < tr.samples.length; i++) {
      r = tr.samples[i];
      if (typeof r[0] !== 'number') continue;
      r = r.slice(); r[4] += off; cur.tr.samples.push(r); cur.last = r[4];
    }
    cur.files.push(path.basename(f));
    cur.end = at;
  });
  return out;
}
exports.sessions = sessions;

if (require.main === module) {
  var args = process.argv.slice(2), opts = {}, files = [], list = false, chain = false;
  for (var a = 0; a < args.length; a++) {
    if (args[a] === '--auto') opts.auto = true;
    else if (args[a] === '--html') opts.html = args[++a];
    else if (args[a] === '--list') list = true;
    else if (args[a] === '--chain') chain = true;
    else files.push(args[a]);
  }
  var tot = {};
  var jobs = chain ? sessions(files).map(function (s) { return { name: s.files[0] + ' +' + (s.files.length - 1), tr: s.tr }; })
                   : files.map(function (f) { return { name: path.basename(f), tr: JSON.parse(fs.readFileSync(f, 'utf8')) }; });
  (function next(i) {
    if (i >= jobs.length) { console.log('TOTAL ' + JSON.stringify(tot)); return; }
    var f = jobs[i].name, tr = jobs[i].tr;
    fate(tr, opts).then(function (res) {
      var n = {};
      res.contacts.forEach(function (c) {
        n[c.fate] = (n[c.fate] || 0) + 1; tot[c.fate] = (tot[c.fate] || 0) + 1;
        if (list || c.fate === 'shown-removed' || c.fate === 'late')
          console.log('  #' + c.k + ' ' + c.fate + ' ' + c.why + '  ' + c.life + 'ms p' + Math.round(c.path) +
                      ' @(' + c.pts[0][0] + ',' + c.pts[0][1] + ')' + (c.held ? ' held' : '') +
                      (c.lateBy > 300 ? ' late ' + c.lateBy + 'ms' : '') + (c.cancel ? ' cancel' : ''));
      });
      console.log(f + ' ' + JSON.stringify(n));
      next(i + 1);
    });
  })(0);
}
