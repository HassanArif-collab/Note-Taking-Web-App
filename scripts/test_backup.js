/* ============================================================
 * test_backup.js - storage durability and backup/restore.
 *
 * This is the suite that matters most: everything else costs a
 * stray mark, this one costs the notes.
 *
 * Run: node scripts/test_backup.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');

var pass = 0, fail = 0;
function check(n, c, d) {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  (' + d + ')' : '')); }
}
function fresh(seed) {
  var a = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712, seed: seed || {} });
  a.flushFrames(); return a;
}
function write(app, n) {
  var i;
  for (i = 0; i < (n || 1); i++) {
    app.stroke({ id: 100 + i, x0: 250 + i * 20, y0: 300, x1: 380 + i * 20, y1: 340,
                 speed: 0.3, wobble: 3 });
    app.tick(120);
  }
}

console.log('\nstorage and backup\n');

/* ---------- per-note keys ---------- */
var app = fresh();
write(app, 2);
var idx = app.state();
check('index is written', !!idx && idx.v === 5, idx ? 'v' + idx.v : 'none');
check('index lists the notes', !!idx && idx.noteIds.length >= 1,
      idx ? idx.noteIds.length + ' ids' : 'none');
check('the note lives in its own key', !!app.note(idx.cur.note));
check('the index does NOT carry stroke data',
      JSON.stringify(idx).indexOf('pts') === -1);

/* ---------- delta timestamps ---------- */
var pts = app.strokes()[0].pts;
var big = 0, i;
for (i = 0; i < pts.length; i++) { if (pts[i][2] > 100000) big++; }
check('timestamps are stored as deltas, not epochs', big === 0,
      big + ' absolute stamps of ' + pts.length);
check('the first point has no delta', pts[0][2] === 0, String(pts[0][2]));

/* One damaged note key must cost one note, not the collection. That is
 * the whole reason for splitting the keys in the first place. */
var seed = {
  mathnotes_v5: JSON.stringify({
    v: 5, noteIds: ['good1', 'bad1'],
    notebooks: [{ id: 'nb', title: 'T', color: '#0381FE', notes: ['good1', 'bad1'] }],
    cur: { nb: 0, note: 'good1' }, set: {}
  }),
  mathnotes_v5_n_good1: JSON.stringify({
    id: 'good1', title: 'Good', cr: 1, mod: 1, scroll: 0,
    strokes: [{ id: 's', pen: 0, w: 2, color: '#000000', a: 1, ord: 1,
                pts: [[10, 10, 0], [30, 20, 16]] }]
  }),
  mathnotes_v5_n_bad1: '{ this is not json'
};
var survivor = fresh(seed);
check('a corrupt note key does not take the others with it',
      survivor.strokes().length === 1, survivor.strokes().length + ' strokes');

/* ---------- backup round trip ---------- */
var src = fresh();
write(src, 3);
var backup = src.exportBackup();
check('export produces a backup block', !!backup && backup.length > 50,
      backup ? backup.length + ' chars' : 'empty');

var parsed = JSON.parse(backup);
check('backup is tagged and checksummed',
      parsed.mathnotes === 1 && typeof parsed.sum === 'number' && !!parsed.body);

var srcStrokes = src.allStrokes().length;
var dest = fresh();
check('a fresh device starts empty', dest.allStrokes().length === 0);

var res = dest.importBackup(backup);
check('restore reports success', typeof res === 'object', String(res));
check('every stroke came across', dest.allStrokes().length === srcStrokes,
      dest.allStrokes().length + ' of ' + srcStrokes);

/* ---------- the failure that actually happens ---------- */
var truncated = backup.slice(0, Math.floor(backup.length * 0.8));
var d2 = fresh();
var r2 = d2.importBackup(truncated);
check('a truncated paste is refused, not half-applied', typeof r2 === 'string',
      String(r2).slice(0, 60));
check('...and nothing was written', d2.allStrokes().length === 0,
      d2.allStrokes().length + ' strokes');

var d3 = fresh();
check('junk is refused', typeof d3.importBackup('hello') === 'string');
check('a valid-JSON non-backup is refused',
      typeof d3.importBackup('{"a":1}') === 'string');

/* checksum must actually be checked, not just present */
var tampered = JSON.parse(backup);
tampered.body = tampered.body.replace('Untitled', 'Untitled ');
var d4 = fresh();
check('a modified body fails the checksum',
      typeof d4.importBackup(JSON.stringify(tampered)) === 'string');

/* ---------- restore is safe to run twice ---------- */
var d5 = fresh();
d5.importBackup(backup);
var afterOne = d5.allStrokes().length;
d5.importBackup(backup);
check('restoring twice does not duplicate anything',
      d5.allStrokes().length === afterOne, afterOne + ' -> ' + d5.allStrokes().length);

/* ---------- v4 collections still open ---------- */
var v4 = {
  v: 4,
  notebooks: [{ id: 'nb1', title: 'Old', color: '#0381FE', notes: ['old1'] }],
  notes: { old1: { id: 'old1', title: 'Old note', cr: 1, mod: 1, scroll: 0,
                   strokes: [{ id: 's1', pen: 0, w: 2, color: '#000000', a: 1, ord: 1,
                               pts: [[100, 100, 1700000000000], [120, 110, 1700000000016]] }] } },
  cur: { nb: 0, note: 'old1' }, set: {}
};
var migrated = fresh({ mathnotes_v4: JSON.stringify(v4) });
check('a v4 collection is migrated, not lost',
      migrated.strokes().length === 1, migrated.strokes().length + ' strokes');
check('migration rewrites it into per-note keys',
      !!migrated.note('old1'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
