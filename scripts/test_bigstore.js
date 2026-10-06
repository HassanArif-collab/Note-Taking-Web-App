/* ============================================================
 * test_bigstore.js - the notes in the iPad's database.
 *
 * localStorage stops at 5MB; the WebSQL database a home-screen app has
 * on iOS 9 does not. These tests drive the real index.html against a
 * stand-in for WebSQL that keeps its table between "starts" of the app,
 * writes only when told to (so a test can close the app between a save
 * and the database having it), and can refuse, fail or never answer.
 *
 * Above everything else here: no step of moving house may lose a note.
 *
 * Run: node scripts/test_bigstore.js
 * ============================================================ */
'use strict';
var H = require('./harness.js');

var pass = 0, fail = 0;
function check(n, c, d) {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  (' + d + ')' : '')); }
}

/* ---------- a WebSQL stand-in ----------
 * mode 'manual': transactions wait until flush() - the database answering
 * "later", which lets a test stop the app in between. 'sync': at once. */
function FakeSQL() {
  this.table = {};          /* committed: k -> { sv, v } */
  this.pending = [];
  this.mode = 'manual';
  this.failWrites = false;  /* QUOTA_ERR on every write */
  this.hang = false;        /* never answers at all */
  this.openThrows = 0;      /* refuse this many openDatabase calls */
  this.opens = 0; this.commits = 0; this.sizes = [];
}
FakeSQL.prototype.open = function () {
  var self = this;
  return function openDatabase(name, ver, desc, size) {
    self.opens++;
    self.sizes.push(size);
    if (self.openThrows > 0) {
      self.openThrows--;
      var e = new Error('SECURITY_ERR: DOM Exception 18'); e.code = 18; throw e;
    }
    return { transaction: function (cb, err, ok) { self.tx(cb, err, ok); } };
  };
};
FakeSQL.prototype.tx = function (cb, err, ok) {
  var self = this;
  function job() {
    var stmts = [], i, st, rs, failed = null;
    var tx = { executeSql: function (sql, args, s, f) { stmts.push({ sql: sql, args: args || [], s: s, f: f }); } };
    try { cb(tx); } catch (e) { if (err) err({ code: 0, message: 'callback threw ' + e.message }); return; }
    var work = JSON.parse(JSON.stringify(self.table));
    for (i = 0; i < stmts.length; i++) {
      st = stmts[i];
      try { rs = self.exec(work, st.sql, st.args); } catch (e2) { failed = e2; break; }
      if (st.s) st.s(tx, rs);
    }
    if (failed) { if (err) err(failed); return; }
    self.table = work;          /* all or nothing, as a transaction is */
    self.commits++;
    if (ok) ok();
  }
  if (this.hang) return;
  if (this.mode === 'sync') job(); else this.pending.push(job);
};
FakeSQL.prototype.exec = function (t, sql, a) {
  var rows = [], k;
  function rs(list) { return { rows: { length: list.length, item: function (i) { return list[i]; } } }; }
  if (/^CREATE TABLE IF NOT EXISTS kv/.test(sql)) return rs([]);
  if (/^SELECT k, sv, v FROM kv$/.test(sql)) {
    for (k in t) rows.push({ k: k, sv: t[k].sv, v: t[k].v });
    return rs(rows);
  }
  if (/^INSERT OR REPLACE INTO kv \(k, sv, v\) VALUES \(\?, \?, \?\)$/.test(sql)) {
    if (this.failWrites) throw { code: 4, message: 'QUOTA_ERR: the quota has been exceeded' };
    t[a[0]] = { sv: a[1], v: a[2] };
    return rs([]);
  }
  if (/^DELETE FROM kv WHERE k = \?$/.test(sql)) {
    if (this.failWrites) throw { code: 4, message: 'QUOTA_ERR' };
    delete t[a[0]];
    return rs([]);
  }
  throw new Error('the stand-in does not know: ' + sql);
};
FakeSQL.prototype.flush = function () {
  var n = 0;
  while (this.pending.length && n++ < 1000) this.pending.shift()();
  return this;
};
FakeSQL.prototype.notes = function () {
  var out = [], k;
  for (k in this.table) if (k.indexOf('mathnotes_v5_n_') === 0) out.push(k.slice(15));
  return out;
};

/* ---------- driving ---------- */
function start(fake, seed, extra) {
  var o = { quiet: true, dpr: 2, viewW: 1024, viewH: 712, seed: seed || {}, win: {} }, k;
  if (fake) o.win.openDatabase = fake.open();
  if (extra) for (k in extra) o[k] = extra[k];
  var app = H.load(o);
  if (fake) fake.flush();
  app.flushFrames();
  return app;
}
function write(app, n) {
  for (var i = 0; i < (n || 1); i++) {
    app.stroke({ id: 100 + i, x0: 250 + i * 20, y0: 300, x1: 380 + i * 20, y1: 340, speed: 0.3, wobble: 3 });
    app.tick(120);
  }
}
/* everything in localStorage, to start the app again from */
function dump(app) {
  var out = {}, i, k;
  for (i = 0; i < app.storage.length; i++) { k = app.storage.key(i); out[k] = app.storage.getItem(k); }
  return out;
}
function lsNoteKeys(app) {
  var n = 0, i;
  for (i = 0; i < app.storage.length; i++) if (app.storage.key(i).indexOf('mathnotes_v5_n_') === 0) n++;
  return n;
}
function svOf(raw) { var m = /^\{"sv":(\d+),/.exec(raw || ''); return m ? +m[1] : 0; }
/* the newest stored copy of a note, wherever it is - what a restart reads */
function stored(app, fake, id) {
  var ls = app.storage.getItem('mathnotes_v5_n_' + id), db = fake && fake.table['mathnotes_v5_n_' + id], raw;
  raw = db && (ls === null || db.sv >= svOf(ls)) ? db.v : ls;
  if (!raw) return null;
  var rec = JSON.parse(raw);
  app.win.__mnUnpackRec(rec);
  return rec;
}
function index(app) { app.state(); return JSON.parse(app.storage.getItem('mathnotes_v5') || 'null'); }
function strokesOf(app, fake) {
  var idx = index(app), n = 0, i, r;
  if (!idx) return 0;
  for (i = 0; i < idx.noteIds.length; i++) { r = stored(app, fake, idx.noteIds[i]); if (r) n += r.strokes.length; }
  return n;
}
/* localStorage that holds `cap` characters, as Safari's does */
function capLS(app, cap) {
  var st = app.storage, set = st.setItem;
  st.setItem = function (k, v) {
    var used = 0, i, kk;
    for (i = 0; i < st.length; i++) { kk = st.key(i); if (kk !== k) used += kk.length + (st.getItem(kk) || '').length; }
    if (used + k.length + String(v).length > cap) {
      var e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
    }
    return set.call(st, k, v);
  };
}
function lsUsed(app) {
  var used = 0, i, k;
  for (i = 0; i < app.storage.length; i++) { k = app.storage.key(i); used += k.length + (app.storage.getItem(k) || '').length; }
  return used;
}
function big(app) { return app.win.__mnPack.big(); }
/* records as an older version wrote them: no save number */
function oldStyle(seed) {
  var out = {}, k;
  for (k in seed) out[k] = k.indexOf('mathnotes_v5_n_') === 0 ? seed[k].replace(/^\{"sv":\d+,/, '{') : seed[k];
  return out;
}

console.log('\nthe notes in the iPad\'s database\n');

/* ---------- no database: nothing changes ---------- */
var plain = start(null);
write(plain, 2);
plain.state();
check('without a database the notes stay in localStorage, as before',
      !big(plain).on && lsNoteKeys(plain) === 1 && strokesOf(plain, null) === 2, lsNoteKeys(plain) + ' note keys');

/* ---------- a fresh iPad with a database ---------- */
var f1 = new FakeSQL();
var a1 = start(f1);
check('the database is asked for 50MB up front, so Safari asks only once', f1.sizes[0] === 50 * 1024 * 1024, String(f1.sizes[0]));
check('the database opens and is used', big(a1).on === true, JSON.stringify(big(a1)));
write(a1, 3);
var id1 = index(a1).cur.note;
check('a save keeps a copy in localStorage until the database has the note',
      a1.storage.getItem('mathnotes_v5_n_' + id1) !== null && !f1.table['mathnotes_v5_n_' + id1], 'ls ' +
      (a1.storage.getItem('mathnotes_v5_n_' + id1) !== null) + ', db ' + !!f1.table['mathnotes_v5_n_' + id1]);
check('...the copy carries its save number first', svOf(a1.storage.getItem('mathnotes_v5_n_' + id1)) > 0,
      String(a1.storage.getItem('mathnotes_v5_n_' + id1)).slice(0, 30));
f1.flush();
check('once the database has it, the copy in localStorage is gone',
      a1.storage.getItem('mathnotes_v5_n_' + id1) === null && !!f1.table['mathnotes_v5_n_' + id1]);
check('...and the index stays in localStorage', !!a1.storage.getItem('mathnotes_v5'));

var a1b = start(f1, dump(a1));
check('starting again, the notes come back from the database', strokesOf(a1b, f1) === 3 && a1b.strokes ? true : false,
      strokesOf(a1b, f1) + ' strokes');
check('...and are what was written', stored(a1b, f1, id1).strokes.length === 3);

/* ---------- moving house: an iPad whose localStorage is FULL ----------
 * What the user's iPad has: every note in localStorage, written by the
 * old version, and no room left - the index itself cannot be saved. */
var src = start(null);
(function () {
  for (var i = 0; i < 3; i++) {
    src.els.fabNew._fire('click', {}); src.flushFrames();
    write(src, 4 + i);
    src.els.backBtn._fire('click', {}); src.flushFrames();
  }
})();
var srcStrokes = strokesOf(src, null), srcIds = index(src).noteIds.slice();
var legacy = oldStyle(dump(src));
check('the old-style store has its notes in localStorage, without save numbers',
      srcStrokes === 15 && svOf(legacy['mathnotes_v5_n_' + srcIds[1]]) === 0, srcStrokes + ' strokes');

var f2 = new FakeSQL();
var m = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712, seed: legacy, win: { openDatabase: f2.open() } });
var full = 0, kk;
for (kk in legacy) full += kk.length + legacy[kk].length;
capLS(m, full + 40);                 /* full to the brim, as the iPad is */
f2.flush(); m.flushFrames();
check('the new version reads every note the old one stored', strokesOf(m, f2) === srcStrokes,
      strokesOf(m, f2) + ' of ' + srcStrokes);
check('...and sets them moving into the database', big(m).moving === srcIds.length, 'moving ' + big(m).moving);
m.tick(5000);
m.save();                            /* the first save after starting */
check('the index cannot be written while localStorage is full - but no alarm while the notes are moving',
      m.els.warning.style.display !== 'block' || String(m.els.warning.textContent).indexOf('NOT saved') < 0,
      String(m.els.warning.textContent));
f2.flush(); m.flushFrames();
check('every note is in the database', f2.notes().length === srcIds.length, f2.notes().length + ' of ' + srcIds.length);
check('...and gone from localStorage, which has its room back', lsNoteKeys(m) === 0 && lsUsed(m) < full / 3,
      lsNoteKeys(m) + ' note keys, ' + lsUsed(m) + ' of ' + full + ' characters');
check('...the save that was refused went through by itself', m.win.__mnPack.full() === false &&
      !!m.storage.getItem('mathnotes_v5'), 'full ' + m.win.__mnPack.full());
check('...and the user is told the 5 MB limit is gone',
      String(m.els.toast.textContent).indexOf('5 MB limit is gone') >= 0, String(m.els.toast.textContent));
f2.flush();
var m2 = start(f2, dump(m));
check('starting again after moving: every stroke of every note is there', strokesOf(m2, f2) === srcStrokes,
      strokesOf(m2, f2) + ' of ' + srcStrokes);
(function () {
  var same = true, i, a, b;
  for (i = 0; i < srcIds.length; i++) {
    a = stored(src, null, srcIds[i]); b = stored(m2, f2, srcIds[i]);
    if (!a || !b || JSON.stringify(a.strokes) !== JSON.stringify(b.strokes) || a.title !== b.title) same = false;
  }
  check('...point for point the same as the old store held', same);
})();
check('writing goes on after the move', (function () {
  write(m2, 2); m2.state(); f2.flush();
  return strokesOf(m2, f2) === srcStrokes + 2;
})(), strokesOf(m2, f2) + ' strokes');

/* the database refuses while the notes are moving: they are still whole in
   localStorage, so that is no reason for an alarm - and they move later */
var fm = new FakeSQL();
var mv = H.load({ quiet: true, dpr: 2, viewW: 1024, viewH: 712, seed: legacy, win: { openDatabase: fm.open() } });
fm.flush(); mv.flushFrames();
fm.failWrites = true;
mv.tick(5000); mv.save(); fm.flush();
check('a refused move raises no alarm - every note is still whole in localStorage',
      mv.win.__mnPack.full() === false && String(mv.els.warning.textContent).indexOf('NOT saved') < 0 &&
      lsNoteKeys(mv) === srcIds.length, 'full ' + mv.win.__mnPack.full() + ', ' + lsNoteKeys(mv) + ' note keys');
fm.failWrites = false;
mv.tick(20000); mv.save(); fm.flush();
check('...and the move goes through once the database takes it',
      fm.notes().length === srcIds.length && lsNoteKeys(mv) === 0, fm.notes().length + ' in the database');
var mv2 = start(fm, dump(mv));
check('...with every stroke there', strokesOf(mv2, fm) === srcStrokes, strokesOf(mv2, fm) + ' of ' + srcStrokes);

/* ---------- closed before the database had it ---------- */
var f3 = new FakeSQL();
var c1 = start(f3);
write(c1, 2); c1.state(); f3.flush();          /* two strokes safely in the database */
write(c1, 3); c1.state();                      /* three more: saved, database not yet */
var c3id = index(c1).cur.note;
var snap = dump(c1);
f3.pending.length = 0;                         /* iOS closes the app: the write never lands */
var c2 = start(f3, snap);
check('closed before the database wrote it, the copy in localStorage brings it all back',
      stored(c2, f3, c3id) && stored(c2, f3, c3id).strokes.length === 5, (stored(c2, f3, c3id) || {}).strokes + '');
c2.state(); f3.flush();
check('...and it is in the database on the next save', f3.table['mathnotes_v5_n_' + c3id] &&
      JSON.parse(f3.table['mathnotes_v5_n_' + c3id].v).strokes.length === 5);

/* ---------- the newer copy wins, wherever it is ---------- */
function twoCopies(lsSvN, dbSvN) {
  var f = new FakeSQL();
  var mk = function (sv, n) {
    var st = [], i;
    for (i = 0; i < n; i++) st.push({ id: 's' + i, pen: 0, w: 2, color: '#000000', a: 1, ord: i + 1, pts: [[10 + i, 10, 0], [30 + i, 20, 16]] });
    return '{"sv":' + sv + ',' + JSON.stringify({ id: 'x1', title: 'T', cr: 1, mod: 1, scroll: 0, strokes: st }).slice(1);
  };
  var seed = {
    mathnotes_v5: JSON.stringify({ v: 5, noteIds: ['x1'], notebooks: [{ id: 'nb', title: 'My Notes', color: '#0381FE', notes: ['x1'] }],
                                  cur: { nb: 0, note: 'x1' }, set: {} }),
    mathnotes_v5_n_x1: mk(lsSvN, 1)
  };
  f.table.mathnotes_v5_n_x1 = { sv: dbSvN, v: mk(dbSvN, 2) };
  var a = start(f, seed);
  return { a: a, f: f, n: a.strokes().length };
}
var t1 = twoCopies(100, 200);
check('a newer copy in the database beats an older one in localStorage', t1.a.win.__mnRec().strokes.length === 2,
      t1.a.win.__mnRec().strokes.length + ' strokes');
check('...and the older copy is cleared away', svOf(t1.a.storage.getItem('mathnotes_v5_n_x1')) !== 100 &&
      (t1.f.flush(), t1.a.storage.getItem('mathnotes_v5_n_x1') === null), String(t1.a.storage.getItem('mathnotes_v5_n_x1')).slice(0, 20));
var t2 = twoCopies(300, 200);
check('a newer copy in localStorage beats an older one in the database', t2.a.win.__mnRec().strokes.length === 1,
      t2.a.win.__mnRec().strokes.length + ' strokes');
check('...and is moved into the database', (function () { t2.a.tick(5000); t2.a.save(); t2.f.flush();
  return JSON.parse(t2.f.table.mathnotes_v5_n_x1.v).strokes.length === 1 && t2.a.storage.getItem('mathnotes_v5_n_x1') === null; })());

/* ---------- the database refuses ---------- */
var f4 = new FakeSQL();
var r1 = start(f4);
f4.failWrites = true;
write(r1, 2); r1.state(); f4.flush();
check('a refused database write, with the copy safe in localStorage, raises no alarm',
      r1.win.__mnPack.full() === false && lsNoteKeys(r1) === 1, 'full ' + r1.win.__mnPack.full());
var r1id = index(r1).cur.note;
f4.failWrites = false;
r1.tick(6000); r1.save(); f4.flush();
check('...it is written again later, and then the copy goes',
      !!f4.table['mathnotes_v5_n_' + r1id] && lsNoteKeys(r1) === 0, lsNoteKeys(r1) + ' note keys');

var f5 = new FakeSQL();
var r2 = start(f5);
write(r2, 1); r2.state(); f5.flush();
capLS(r2, lsUsed(r2) + 10);           /* and no room for a copy either */
f5.failWrites = true;
write(r2, 2); r2.tick(6000); r2.save(); f5.flush();
check('refused by the database AND no room for a copy: you are told it is NOT saved',
      r2.win.__mnPack.full() === true && String(r2.els.warning.textContent).indexOf('NOT saved') >= 0,
      String(r2.els.warning.textContent));
f5.failWrites = false;
r2.tick(16000); r2.save(); f5.flush();
check('...and when the database takes it again, it saves by itself, nothing lost',
      r2.win.__mnPack.full() === false && JSON.parse(f5.table['mathnotes_v5_n_' + index(r2).cur.note].v).strokes.length === 3,
      'full ' + r2.win.__mnPack.full());

/* ---------- deleted for good ---------- */
function newNotes(app, n) {
  for (var i = 0; i < n; i++) {
    app.els.fabNew._fire('click', {}); app.flushFrames();
    write(app, 1);
    app.els.backBtn._fire('click', {}); app.flushFrames();
  }
}
function deleteForGood(app) {
  var id = app.home().ids[0];
  app.home().els[0]._more._fire('click', {}); app.popPick('Delete');
  app.els.hmNav.children[2]._fire('click', {});
  app.home().els[0]._more._fire('click', {}); app.popPick('Delete for good'); app.dlg();
  app.els.hmNav.children[0]._fire('click', {});
  return id;
}
var f6 = new FakeSQL();
var d1 = start(f6);
newNotes(d1, 2); d1.state(); f6.flush();
var gone = deleteForGood(d1);
check('deleting for good is remembered in the index until the database has done it',
      (index(d1).gone || []).indexOf(gone) >= 0 && !!f6.table['mathnotes_v5_n_' + gone]);
var dsnap = dump(d1);
f6.pending.length = 0;                          /* closed before the database deleted it */
var d2 = start(f6, dsnap);
check('closed before the database deleted it, the note does not come back',
      d2.home().ids.indexOf(gone) < 0 && index(d2).noteIds.indexOf(gone) < 0, d2.home().ids.join(','));
f6.flush();
check('...and the database finishes deleting it as the app starts', !f6.table['mathnotes_v5_n_' + gone]);
d2.state(); f6.flush(); d2.state();
check('...and once it is gone, the index forgets it', !index(d2).gone, JSON.stringify(index(d2).gone));

/* ---------- the database holds notes the index has lost ---------- */
var f7 = new FakeSQL();
var o1 = start(f7);
newNotes(o1, 2); o1.state(); f7.flush();
var lostIds = index(o1).noteIds.slice();
var o2 = start(f7, {});                         /* localStorage cleared: no index at all */
var back = 0;
lostIds.forEach(function (id) { if (index(o2).noteIds.indexOf(id) >= 0) back++; });
check('with the index lost, the notes in the database are found and put back', back === lostIds.length,
      back + ' of ' + lostIds.length);
check('...and the user is told', String(o2.els.toast.textContent).indexOf('found in the database') >= 0,
      String(o2.els.toast.textContent));

/* ---------- the database will not open, or never answers ---------- */
var f8 = new FakeSQL();
f8.openThrows = 1;
var w1 = start(f8);
check('refused the 50MB, it opens at the default size and still grows', big(w1).on === true && f8.opens === 2,
      f8.opens + ' opens, on ' + big(w1).on);
var f9 = new FakeSQL();
f9.openThrows = 2;
var w2 = start(f9);
write(w2, 1);
check('refused altogether, the app works on from localStorage', !big(w2).on && strokesOf(w2, null) === 1);

/* backup and restore through the database */
var f10 = new FakeSQL();
var b1 = start(f10);
newNotes(b1, 2); b1.state(); f10.flush();
var block = b1.exportBackup();
var f11 = new FakeSQL();
var b2 = start(f11);
var res = b2.importBackup(block);
f11.flush();
check('a backup restored on a database iPad lands in its database', typeof res === 'object' && f11.notes().length >= 2,
      f11.notes().length + ' notes in the database');

/* ---------- the restart into a new version waits for the database ---------- */
var f12 = new FakeSQL();
var swapped = 0;
var ac = { status: 0, UPDATEREADY: 4, UNCACHED: 0, addEventListener: function () {}, update: function () {},
           swapCache: function () { swapped++; } };
var u1 = start(f12, {}, { win: { openDatabase: f12.open(), applicationCache: ac } });
write(u1, 2);
ac.status = 4;
u1.win.__mnUpd.back();                          /* back at the front with a new version waiting */
check('a new version waiting when the app comes back is put in place - after the database has the notes',
      swapped === 0 && f12.pending.length > 0, 'swapped ' + swapped);
f12.flush();
check('...and then it restarts into it', swapped === 1 && u1.storage.getItem('mathnotes_updated') === '1', 'swapped ' + swapped);

/* ---------- nothing is saved before the notes are in ---------- */
var f13 = new FakeSQL();
var e1 = start(f13);
newNotes(e1, 1); e1.state(); f13.flush();
var esnap = dump(e1);
var f13b = f13;
f13b.hang = true;
var e2 = H.load({ quiet: true, dpr: 2, seed: esnap, win: { openDatabase: f13b.open() } });
e2.save(); e2.fire('pagehide');
check('while the database has not answered, nothing is written over the index',
      e2.storage.getItem('mathnotes_v5') === esnap.mathnotes_v5 && e2.win.__mnPack.ready() === false);

console.log('\nwaiting out a database that never answers (12s)...');
setTimeout(function () {
  check('...after a while the app goes on without it', e2.win.__mnPack.ready() === true && big(e2).failed === true);
  check('...says why the notes are missing, and that nothing was deleted',
        String(e2.els.warning.textContent).indexOf('Nothing has been deleted') >= 0, String(e2.els.warning.textContent));
  e2.state();
  var idx2 = JSON.parse(e2.storage.getItem('mathnotes_v5'));
  check('...and keeps the missing notes in the index for the next start',
        idx2.noteIds.length === JSON.parse(esnap.mathnotes_v5).noteIds.length, idx2.noteIds.length + ' ids');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 12600);
