/* ============================================================
 * lock_backup.js - put a backup on the site, locked, for Restore with a code.
 *
 * An iPad 3 cannot paste a big backup back into a text box: it froze and
 * shut down. So a backup goes back the way the app itself arrives - from
 * the site. This takes a backup, checks it is whole, locks it with a new
 * code and writes it to restore/<id>.txt. Commit and push that file; on
 * the iPad, Settings > Backup and restore, type the code, Restore.
 *
 * It reads the backup however it was kept: the block as copied, or the
 * email it was sent in - the raw message, quoted-printable, with the
 * HTML copy beside the plain one. Each candidate is checked against the
 * backup's own checksum, and only a whole one is locked.
 *
 * The lock: ChaCha20 (counter from 0, random 12-byte nonce), its key
 * PBKDF2-HMAC-SHA256(code, "mathnotes-restore-key:" + id, 10000); the
 * file name id is the first 32 hex of SHA-256("mathnotes-restore-file:" +
 * code). The same as unlockText in index.html, which test_backup.js holds
 * this to. The code is 20 characters of Crockford base32 - 100 bits, so
 * the file can sit on a public site.
 *
 *   node scripts/lock_backup.js BACKUP_FILE        lock it, print the code
 *   node scripts/lock_backup.js --check CODE       open restore/<id>.txt again
 *
 * Automatic backup to Google Drive (scripts/drive_backup.gs): the web
 * app's address is the key to the backups, so it reaches the iPad locked
 * under the restore code too - typing the code there switches it on.
 *
 *   node scripts/lock_backup.js --ping URL              does the web app answer?
 *   node scripts/lock_backup.js --drive URL --code CODE lock the address
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var ITER = 10000;
var ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function backupSum(txt) {
  var h = 5381, i;
  for (i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
  return h;
}
function norm(s) {
  return String(s || '').toUpperCase().replace(/[\s\-_.]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
}
function fileId(code) {
  return crypto.createHash('sha256').update('mathnotes-restore-file:' + code, 'utf8').digest('hex').slice(0, 32);
}
function keyFor(code, id) {
  return crypto.pbkdf2Sync(Buffer.from(code, 'utf8'), Buffer.from('mathnotes-restore-key:' + id, 'utf8'), ITER, 32, 'sha256');
}
function chacha(key, nonce, data) {
  var c = crypto.createCipheriv('chacha20', key, Buffer.concat([Buffer.alloc(4), nonce]));
  return Buffer.concat([c.update(data), c.final()]);
}
function pretty(code) { return code.match(/.{4}/g).join('-'); }
function driveFileId(code) {
  return crypto.createHash('sha256').update('mathnotes-drive-file:' + code, 'utf8').digest('hex').slice(0, 32);
}
function lockInto(code, id, text) {
  var nonce = crypto.randomBytes(12), out = chacha(keyFor(code, id), nonce, Buffer.from(text, 'utf8'));
  fs.mkdirSync(path.join(ROOT, 'restore'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'restore', id + '.txt'), 'MATHNOTES-LOCKED 1\n' + nonce.toString('hex') + '\n' + out.toString('base64') + '\n');
}
/* GET, following Google's redirect, then cb(status, body) */
function fetchText(url, cb, hops) {
  require('https').get(url, function (res) {
    var body = '';
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (hops || 0) < 5) {
      res.resume();
      fetchText(new URL(res.headers.location, url).toString(), cb, (hops || 0) + 1);
      return;
    }
    res.setEncoding('utf8');
    res.on('data', function (d) { body += d; });
    res.on('end', function () { cb(res.statusCode, body); });
  }).on('error', function (e) { cb(0, String(e.message)); });
}
var DRIVE_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

/* ---------- finding the backup in what was kept ---------- */
function qpDecode(s) {
  return Buffer.from(s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, function (m, h) {
    return String.fromCharCode(parseInt(h, 16));
  }), 'latin1').toString('utf8');
}
function htmlDecode(s) {
  return s.replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|quot|amp|lt|gt|apos|nbsp);/gi, function (m, e) {
    var l = e.toLowerCase();
    if (l === 'quot') return '"';
    if (l === 'amp') return '&';
    if (l === 'lt') return '<';
    if (l === 'gt') return '>';
    if (l === 'apos') return "'";
    if (l === 'nbsp') return ' ';
    return String.fromCodePoint(l.charAt(1) === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10));
  });
}
/* the {"mathnotes":1 ... } object in a piece of text, by matching braces */
function cutPack(t) {
  var at = t.indexOf('{"mathnotes"'), i, depth = 0, inStr = false, esc = false, ch;
  if (at < 0) return null;
  for (i = at; i < t.length; i++) {
    ch = t.charAt(i);
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return t.slice(at, i + 1);
  }
  return null;
}
/* a whole backup: parses, and its body matches its checksum */
function whole(txt) {
  if (!txt) return null;
  try {
    var p = JSON.parse(txt);
    if (p && p.mathnotes === 1 && typeof p.body === 'string' && backupSum(p.body) === p.sum) return txt;
  } catch (e) {}
  return null;
}
function findBackup(raw) {
  var tries = [], parts, i, t;
  tries.push(raw);
  /* an email: each part on its own, decoded the ways mail encodes it */
  parts = raw.split(/\r?\n--[^\r\n]+\r?\n/);
  for (i = 0; i < parts.length; i++) {
    t = parts[i].replace(/^(?:[A-Za-z-]+:[^\r\n]*\r?\n)+\r?\n/, '');    /* the part's own headers */
    tries.push(t, qpDecode(t), htmlDecode(qpDecode(t)), htmlDecode(t));
  }
  for (i = 0; i < tries.length; i++) {
    var p = cutPack(tries[i]);
    /* a mail program wrapping long lines leaves a line break where there
       was a space; a backup has no line breaks of its own */
    var got = whole(p) || whole(p && p.replace(/\r?\n/g, ' ')) || whole(cutPack(tries[i].replace(/\r?\n/g, ' ')));
    if (got) return got;
  }
  return null;
}

function summary(txt) {
  var body = JSON.parse(JSON.parse(txt).body), k, n = 0, s = 0;
  for (k in body.notes) { n++; s += (body.notes[k].strokes || []).length; }
  return body.notebooks.length + ' folders, ' + n + ' notes, ' + s + ' strokes';
}

/* ---------- main ---------- */
var args = process.argv.slice(2);
if (args[0] === '--ping' || args[0] === '--drive') {
  var url = String(args[1] || '').trim();
  if (!DRIVE_URL.test(url)) {
    console.log('FAIL: that is not a web app address - it looks like https://script.google.com/macros/s/.../exec');
    process.exit(1);
  }
  if (args[0] === '--ping') {
    fetchText(url + '?what=last', function (st, body) {
      var r = null;
      try { r = JSON.parse(body); } catch (e) { r = null; }
      if (st === 200 && r && r.ok) { console.log('OK: the web app answers' + (r.at ? ' - newest copy ' + r.at : ' - no copy in Drive yet')); process.exit(0); }
      console.log('FAIL: the web app did not answer as MathNotes (' + st + '). In the deployment, Who has access must be: Anyone.');
      process.exit(1);
    });
  } else {
    var dc = norm(args[args.indexOf('--code') + 1]);
    if (args.indexOf('--code') < 0 || !/^[0-9A-HJKMNP-TV-Z]{20}$/.test(dc)) { console.log('FAIL: give the restore code: --code XXXX-XXXX-XXXX-XXXX-XXXX'); process.exit(1); }
    lockInto(dc, driveFileId(dc), JSON.stringify({ mathnotes_drive: 1, u: url }));
    console.log('OK: the backup address is locked into restore/' + driveFileId(dc) + '.txt under ' + pretty(dc));
    process.exit(0);
  }
  return;
}
if (args[0] === '--check') {
  var code = norm(args[1]), id = fileId(code), f = path.join(ROOT, 'restore', id + '.txt');
  if (!fs.existsSync(f)) { console.log('FAIL: no restore/' + id + '.txt for that code'); process.exit(1); }
  var lines = fs.readFileSync(f, 'utf8').split('\n');
  var txt = chacha(keyFor(code, id), Buffer.from(lines[1], 'hex'), Buffer.from(lines[2], 'base64')).toString('utf8');
  if (!whole(txt)) { console.log('FAIL: the code does not open restore/' + id + '.txt'); process.exit(1); }
  console.log('OK: restore/' + id + '.txt opens with that code - ' + summary(txt));
  process.exit(0);
}
if (!args[0]) {
  console.log('usage: node scripts/lock_backup.js BACKUP_FILE   |   --check CODE');
  process.exit(1);
}
var raw = fs.readFileSync(args[0], 'utf8');
var pack = findBackup(raw);
if (!pack) {
  console.log('FAIL: no whole MathNotes backup in ' + args[0] + ' - it is missing, cut short or changed.');
  process.exit(1);
}
var bytes = crypto.randomBytes(20), c = '', j;
for (j = 0; j < 20; j++) c += ABC.charAt(bytes[j] & 31);
var fid = fileId(c);
lockInto(c, fid, pack);
console.log('Backup found and whole: ' + summary(pack) + ' (made ' + JSON.parse(pack).at + ')');
console.log('Locked into restore/' + fid + '.txt');
console.log('');
console.log('RESTORE CODE:  ' + pretty(c));
console.log('');
console.log('Commit and push restore/, then on the iPad: Settings > Backup and restore, type the code, Restore.');
