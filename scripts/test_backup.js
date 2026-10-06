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

/* ---------- restore with a code ----------
 * A pasted backup froze an iPad 3. Notes now come back from the site,
 * locked by scripts/lock_backup.js on the PC (Node's crypto) and opened by
 * the app's own SHA-256 / PBKDF2 / ChaCha20 - which must agree exactly. */
var crypto = require('crypto'), bk = fresh().win.__mnBackup;
var msg = bk.utf8('h\u00e9llo \ud83d\ude29 ' + new Array(300).join('xy'));
check('the app\'s SHA-256 agrees with Node\'s',
      bk.hex(bk.sha256(msg)) === crypto.createHash('sha256').update(Buffer.from(msg)).digest('hex'));
check('...its PBKDF2 too',
      bk.hex(bk.pbkdf2(bk.utf8('K7Q2M9XA'), bk.utf8('salt'), 1000)) ===
      crypto.pbkdf2Sync('K7Q2M9XA', 'salt', 1000, 32, 'sha256').toString('hex'));
var ck = crypto.randomBytes(32), cn = crypto.randomBytes(12), cp = crypto.randomBytes(1000);
var ce = new Uint8Array(crypto.createCipheriv('chacha20', ck, Buffer.concat([Buffer.alloc(4), cn])).update(cp));
bk.chacha(new Uint8Array(ck), new Uint8Array(cn), ce);
check('...and its ChaCha20', Buffer.from(ce).equals(cp));

/* lock a backup the way lock_backup.js does, and put it back through the panel */
function lockFor(code, packTxt) {
  var id = crypto.createHash('sha256').update('mathnotes-restore-file:' + code).digest('hex').slice(0, 32);
  var key = crypto.pbkdf2Sync(code, 'mathnotes-restore-key:' + id, 10000, 32, 'sha256'), nonce = crypto.randomBytes(12);
  var c = crypto.createCipheriv('chacha20', key, Buffer.concat([Buffer.alloc(4), nonce])).update(Buffer.from(packTxt, 'utf8'));
  var files = {};
  files['restore/' + id + '.txt'] = 'MATHNOTES-LOCKED 1\n' + nonce.toString('hex') + '\n' + c.toString('base64') + '\n';
  return files;
}
var lsrc = fresh();
write(lsrc, 3);
var lockedFiles = lockFor('K7Q2M9XA4HTDWP3FR8EN', lsrc.exportBackup()), lwant = lsrc.allStrokes().length;
var ldst = fresh();
ldst.restoreWithCode('k7q2-m9xa-4htd-wp3f-r8en', lockedFiles, function (said, a) {
  check('restore with a code: typed in any case, with dashes, the notes come back',
        a.allStrokes().length === lwant && String(a.els.toast.textContent).indexOf('Your notes are back') === 0,
        a.allStrokes().length + ' of ' + lwant + ' strokes; ' + a.els.toast.textContent);
  check('...replacing the empty note a first start makes, not sitting beside it',
        a.state().noteIds.length === 1, a.state().noteIds.length + ' notes');
  fresh().restoreWithCode('K7Q2M9XA4HTDWP3FR8EM', lockedFiles, function (said2) {
    check('a wrong code finds nothing, and says so', said2.indexOf('No notes are waiting under that code') === 0, said2);
    fresh().restoreWithCode('hello', lockedFiles, function (said3) {
      check('...and something that is not a code is told what one looks like', said3.indexOf('20 letters and numbers') >= 0, said3);
      console.log('\n' + pass + ' passed, ' + fail + ' failed');
      process.exit(fail ? 1 : 0);
    });
  });
});
