/* How much work does lifting the pen cost, as the page fills up?
 *
 * Finishing a stroke invalidates the tile it landed in, and the next
 * frame rebuilds that tile by allocating a fresh screen-wide canvas and
 * re-rendering every stroke in the band. So the cost of a pen-up grows
 * with how much is already on the page - which is what "the fifth line
 * was a very bad experience to write" is, from the inside.
 *
 * The node canvas is a stub, so wall-clock time here would mean nothing.
 * What does mean something is the work ASKED FOR: how many curve
 * segments get rasterised and how many canvases get allocated, per
 * pen-up. Those are the two things the A5X actually has to do.
 */
var path = require('path');
var H = require(path.join(process.cwd(), 'scripts', 'harness.js'));

var count = { seg: 0, canvas: 0, clear: 0 };

var seen = new Set();
function wrap(c) {
  /* the mock context is a Proxy that answers EVERY unknown property with
     a fresh no-op function, so any `c.__flag` guard is always truthy and
     the instrumentation silently never installed. */
  if (!c || seen.has(c)) return c;
  seen.add(c);
  var q = c.quadraticCurveTo;
  c.quadraticCurveTo = function () { count.seg++; return q.apply(c, arguments); };
  var cr = c.clearRect;
  c.clearRect = function () { count.clear++; return cr.apply(c, arguments); };
  var d = c.drawImage;
  c.drawImage = function () { return d.apply(c, arguments); };
  return c;
}

var app = H.load({
  quiet: true, dpr: 2, viewW: 768, viewH: 826,
  html: process.argv[2] || undefined,
  seed: {
    mathnotes_v4: JSON.stringify({
      v: 4,
      notebooks: [{ id: 'nb1', title: 'T', color: '#0381FE', notes: ['n1'] }],
      notes: { n1: { id: 'n1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: [] } },
      cur: { nb: 0, note: 'n1' }, set: { palmLevel: 0, hand: 0 }
    })
  }
});

/* Hooked BEFORE the first frame. Tiles built during start-up would
   otherwise never be instrumented, and the work of painting into them
   would read as zero. */
var doc = app.doc;
var origCreate = doc.createElement;
doc.createElement = function (tag) {
  var e = origCreate.call(doc, tag);
  if (String(tag).toLowerCase() === 'canvas') {
    count.canvas++;
    var gc = e.getContext;
    e.getContext = function (k) { return wrap(gc.call(e, k)); };
  }
  return e;
};
/* and the one it already has */
wrap(app.els.noteCanvas && app.els.noteCanvas._ctx);
app.flushFrames();

var TOP = 56, PER_LINE = 8, LINES = 10;
var id = 1, line, k, rows = [];
for (line = 0; line < LINES; line++) {
  for (k = 0; k < PER_LINE; k++) {
    var x = 80 + k * 70, y = 120 + line * 40;
    /* draw the stroke, THEN measure what lifting the pen costs */
    app.down(id, x, y - 24 + TOP);
    count.seg = 0; count.canvas = 0; count.clear = 0;
    var st = 0;
    for (st = 1; st <= 40; st++) {
      app.tick(16);
      app.moveTo(id, x + st * 1.2, y - 24 + TOP + st * 0.6);
      app.flushFrames();
    }
    var mv = { seg: count.seg, clear: count.clear };
    app.up(id);
    app.tick(40);
    app.flushFrames();
    if (k === PER_LINE - 1) {
      rows.push({ line: line + 1, on: app.strokes().length,
                  seg: mv.seg, canvas: mv.clear });
    }
    id++;
  }
}

function pad(v, n) { v = String(v); while (v.length < n) v += ' '; return v; }
console.log('\n  the cost of DRAWING one stroke (40 moves), as the page fills up\n');
console.log('  line   strokes on page   curves rasterised   full-canvas clears');
var i;
for (i = 0; i < rows.length; i++) {
  console.log('  ' + pad(rows[i].line, 7) + pad(rows[i].on, 18) +
              pad(rows[i].seg, 20) + rows[i].canvas);
}
var a = rows[0], z = rows[rows.length - 1];
console.log('\n  line 1 -> line ' + rows.length + ':  ' + a.seg + ' -> ' + z.seg +
            ' curves' + (a.seg ? '  (x' + (z.seg / a.seg).toFixed(1) + ')' : '') +
            ',  ' + a.canvas + ' -> ' + z.canvas + ' clears');
