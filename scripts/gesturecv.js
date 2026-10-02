/* ============================================================
 * gesturecv.js - do two-finger scrolls and zooms work? Measured on
 * every two-finger gesture the iPad recorded in normal use.
 *
 * A gesture is found in the raw touches, before the app has any say:
 * two contacts landing within GAP_LAND of each other, BOTH travelling - a
 * resting palm barely moves (0-6px recorded) - and nothing else on the
 * glass meanwhile, so a pen writing with the hand down is not counted.
 * What the fingers did decides what was wanted:
 *
 *   zoom    the gap between them changed by 40px+, and more than their
 *           middle travelled: wanted the page bigger or smaller
 *   scroll  their middle travelled 40px+: wanted the page moved
 *
 * Each recording is replayed through the app (scripts/replay-core.js).
 * A zoom worked if the zoom changed 5%+. A scroll worked if the app took
 * the fingers as a gesture while at least half their travel was still to
 * come - the replayed note is a blank page that mostly cannot scroll, so
 * whether the page moved says little. "ink left" is a gesture that left
 * a line on the page.
 *
 *   node scripts/gesturecv.js            node scripts/gesturecv.js v
 *   node scripts/gesturecv.js --html other.html
 * ============================================================ */
'use strict';
var fs = require('fs'), path = require('path');
var core = require('./replay-core.js');
var DIR = path.join(__dirname, '..', 'traces');
var GAP_LAND = 200, MOVED = 30;

var verbose = false, html = null;
for (var a = 2; a < process.argv.length; a++) {
  if (process.argv[a] === 'v') verbose = true;
  else if (process.argv[a] === '--html') html = process.argv[++a];
}

/* the two-finger gestures in a recording, from its raw touches */
function episodes(trace) {
  var t = {}, out = [];
  trace.samples.forEach(function (s) {
    if (typeof s[0] !== 'number') return;
    var id = s[1];
    if (s[0] === 0) t[id] = { id: id, x0: s[2], y0: s[3], t0: s[4], x: s[2], y: s[3], t1: s[4], path: [[s[4], s[2], s[3]]] };
    else if (t[id]) { t[id].x = s[2]; t[id].y = s[3]; t[id].t1 = s[4]; t[id].path.push([s[4], s[2], s[3]]); }
  });
  var list = Object.keys(t).map(function (k) { return t[k]; }).sort(function (p, q) { return p.t0 - q.t0; });
  var used = {};
  for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
    var A = list[i], B = list[j];
    if (B.t0 - A.t0 > GAP_LAND) break;
    if (used[A.id + '@' + A.t0] || used[B.id + '@' + B.t0]) continue;
    if (Math.min(A.t1, B.t1) - B.t0 < 120) continue;
    /* only these two on the glass: a hand resting while the pen writes is
       several contacts, some of them sliding, and none of it is a gesture */
    var crowd = list.some(function (o) { return o !== A && o !== B && o.t0 < Math.min(A.t1, B.t1) && o.t1 > B.t0; });
    if (crowd) continue;
    var la = Math.hypot(A.x - A.x0, A.y - A.y0), lb = Math.hypot(B.x - B.x0, B.y - B.y0);
    if (la < MOVED || lb < MOVED) continue;
    var sep = Math.hypot(B.x - A.x, B.y - A.y) - Math.hypot(B.x0 - A.x0, B.y0 - A.y0);
    var mid = Math.hypot((A.x + B.x - A.x0 - B.x0) / 2, (A.y + B.y - A.y0 - B.y0) / 2);
    var want = Math.abs(sep) >= 40 && Math.abs(sep) > mid ? 'zoom' : (mid >= 40 ? 'scroll' : null);
    if (!want) continue;
    used[A.id + '@' + A.t0] = used[B.id + '@' + B.t0] = true;
    out.push({ want: want, t0: A.t0, tB: B.t0, t1: Math.max(A.t1, B.t1), mid: mid, sep: sep, A: A, B: B,
               tilt: Math.round(Math.abs(B.y0 - A.y0)), lag: Math.round(B.t0 - A.t0) });
  }
  return out;
}

/* the time the replay's own trace gives an event, plus this, is the recording's time for it */
function clockOffset(rec, own) {
  var o = (own && own.samples || []).filter(function (x) { return typeof x[0] === 'number'; })[0], i, x;
  if (!o) return 0;
  for (i = 0; i < rec.samples.length; i++) {
    x = rec.samples[i];
    if (typeof x[0] === 'number' && x[0] === o[0] && x[1] === o[1] && Math.abs(x[2] - o[2]) < 0.2 && Math.abs(x[3] - o[3]) < 0.2) return x[4] - o[4];
  }
  return 0;
}
exports.clockOffset = clockOffset;
if (require.main !== module) return;

var files = fs.readdirSync(DIR).filter(function (f) { return /\.json$/.test(f); }).sort(), jobs = [];
files.forEach(function (f) {
  var d;
  try { d = JSON.parse(fs.readFileSync(path.join(DIR, f))); } catch (e) { return; }
  if (!d.samples || !/iPad/.test(d.ua || '')) return;
  var ep = episodes(d);
  if (ep.length) jobs.push({ f: f, d: d, ep: ep });
});

var res = [], k = 0;
function next() {
  if (k >= jobs.length) return report();
  var job = jobs[k++], snaps = [];
  core.replay(job.d, { html: html, settleMs: 10, onSample: function (app, t) {
    app.flushFrames();          /* the page is drawn - and a zoom applied - as often as the iPad draws it */
    var g = app.geom();
    snaps.push({ t: t, z: g.zoom, x: g.scrollX, y: g.scrollY, n: app.strokes().length });
  } }, function (r) {
    function at(t) { var s = snaps[0]; for (var i = 0; i < snaps.length && snaps[i].t <= t; i++) s = snaps[i]; return s; }
    function pos(c, t) { var q = c.path[0]; for (var i = 0; i < c.path.length && c.path[i][0] <= t; i++) q = c.path[i]; return q; }
    /* the replay's own clock starts at the first touch it traced, the recording's did not */
    var first = clockOffset(job.d, r.own);
    var eng = (r.own && r.own.samples || []).filter(function (g) { return g[0] === 'g' && g[1] === 'engage'; }).map(function (g) { return g[4] + first; });
    job.ep.forEach(function (e) {
      var s0 = at(e.t0 - 1), s1 = at(e.t1 + 30);
      var dz = s1.z / s0.z - 1, moved = Math.hypot(s1.x - s0.x, s1.y - s0.y) * s1.z;
      /* how much of the fingers' travel came after the app took them as a gesture */
      var te = null;
      eng.forEach(function (t) { if (te === null && t >= e.t0 - 5 && t <= e.t1) te = t; });
      var follow = 0;
      if (te !== null) {
        var a = pos(e.A, te), b = pos(e.B, te);
        var left = Math.hypot((e.A.x + e.B.x - a[1] - b[1]) / 2, (e.A.y + e.B.y - a[2] - b[2]) / 2);
        follow = left / Math.max(e.mid, 1);
      }
      var ok = e.want === 'zoom' ? Math.abs(dz) >= 0.05 : (te !== null && follow >= 0.5) || Math.abs(dz) >= 0.05;
      res.push({ ids: String(e.A.id).slice(-3) + '+' + String(e.B.id).slice(-3) + '@' + Math.round(e.t0), f: job.f.slice(0, 30), want: e.want, ok: ok, ink: s1.n > s0.n, tool: job.d.tool, palm: job.d.palmLevel,
                 tilt: e.tilt, lag: e.lag, mid: Math.round(e.mid), sep: Math.round(e.sep), dz: dz, moved: Math.round(moved), follow: follow });
    });
    next();
  });
}
function report() {
  function line(label, list) {
    var ok = list.filter(function (r) { return r.ok; }).length, ink = list.filter(function (r) { return r.ink; }).length;
    console.log(('   ' + label + '                          ').slice(0, 34) + ok + ' of ' + list.length + ' worked' + (ink ? ', ' + ink + ' left ink' : ''));
  }
  var zoom = res.filter(function (r) { return r.want === 'zoom'; }), scroll = res.filter(function (r) { return r.want === 'scroll'; });
  console.log('two-finger gestures recorded on the iPad: ' + res.length + ' (' + jobs.length + ' recordings)');
  line('zoom', zoom);
  line('  fingers level (< 120px)', zoom.filter(function (r) { return r.tilt < 120; }));
  line('  fingers tilted', zoom.filter(function (r) { return r.tilt >= 120; }));
  line('scroll', scroll);
  line('  fingers level (< 120px)', scroll.filter(function (r) { return r.tilt < 120; }));
  line('  fingers tilted', scroll.filter(function (r) { return r.tilt >= 120; }));
  line('second finger 40ms+ after the first', res.filter(function (r) { return r.lag >= 40; }));
  if (verbose) res.forEach(function (r) {
    console.log((r.ok ? '  ok  ' : '  --  ') + r.want + '  ' + r.f + ' ' + r.ids + '  ' + r.tool + ' palm' + r.palm + '  tilt ' + r.tilt + '  lag ' + r.lag +
                '  middle ' + r.mid + '  gap ' + r.sep + '  -> zoom ' + (r.dz * 100).toFixed(0) + '%  followed ' + Math.round(r.follow * 100) + '%' + (r.ink ? '  INK LEFT' : ''));
  });
}
next();
