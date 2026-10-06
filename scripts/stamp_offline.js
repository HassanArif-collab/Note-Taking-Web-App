/* ============================================================
 * stamp_offline.js - keep the iPad's offline copy current.
 *
 * iOS 9 has no service workers; its way of keeping a web app for use
 * without a connection is the application cache. The iPad holds the files
 * listed in mathnotes.appcache and fetches new ones ONLY when that file
 * itself changes - so it carries a fingerprint of everything it lists.
 * Change any of them, run this, commit the manifest with them, and every
 * iPad picks the new version up the next time it is online.
 *
 * The same fingerprint is written into index.html as APP_BUILD (and the
 * day it changed as APP_DATE), so the app can say which version it is and
 * tell when the internet has a newer one than the copy it is running. That
 * line is left out of the fingerprint, or writing it would change it.
 *
 *   node scripts/stamp_offline.js           write the fingerprint
 *   node scripts/stamp_offline.js --check   exit 1 if it is out of date
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var MANIFEST = path.join(ROOT, 'mathnotes.appcache');
var HTML = path.join(ROOT, 'index.html');
var FILES = ['index.html', 'lib/pdf.min.js', 'lib/pdf.worker.min.js'];
/* What the iPad keeps. "./" is the address the home-screen icon opens, and
   whichever page carries the manifest is kept with it anyway - so index.html
   is not listed again: that was a second 800KB copy of the same page. */
var CACHE = ['./', 'lib/pdf.min.js', 'lib/pdf.worker.min.js'];
var BUILD_RE = /var APP_BUILD = '[0-9a-f]*', APP_DATE = '[0-9-]*';/;

function read(f) {
  /* line endings differ between a Windows checkout and what GitHub serves;
     the fingerprint is of the content, not of how git wrote it here */
  return fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
}

var html = fs.readFileSync(HTML, 'utf8');
var cur = BUILD_RE.exec(html);
if (!cur) {
  console.log("FAIL: index.html has no \"var APP_BUILD = '', APP_DATE = '';\" line to stamp");
  process.exit(1);
}

var h = crypto.createHash('sha1');
FILES.forEach(function (f) {
  var txt = read(f);
  if (f === 'index.html') txt = txt.replace(BUILD_RE, "var APP_BUILD = '', APP_DATE = '';");
  h.update(txt);
});
var ver = h.digest('hex').slice(0, 16);

var body = [
  'CACHE MANIFEST',
  '# MathNotes, kept on the iPad for use with no connection.',
  '# version ' + ver,
  '# Written by scripts/stamp_offline.js - run it after changing any file below.',
  '',
  'CACHE:',
  CACHE.join('\n'),
  '',
  'NETWORK:',
  '*',
  ''
].join('\n');

var had = /APP_BUILD = '([0-9a-f]*)', APP_DATE = '([0-9-]*)'/.exec(cur[0]);

if (process.argv.indexOf('--check') >= 0) {
  var man = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8').replace(/\r\n/g, '\n') : '';
  if (man !== body || had[1] !== ver) {
    console.log('FAIL: mathnotes.appcache or the APP_BUILD in index.html is out of date - run: node scripts/stamp_offline.js');
    process.exit(1);
  }
  console.log('OK: offline manifest is current (version ' + ver + ')');
} else {
  /* the date moves only when the version does */
  var day = had[1] === ver && had[2] ? had[2] : new Date().toISOString().slice(0, 10);
  fs.writeFileSync(HTML, html.replace(BUILD_RE, "var APP_BUILD = '" + ver + "', APP_DATE = '" + day + "';"));
  fs.writeFileSync(MANIFEST, body);
  console.log('mathnotes.appcache -> version ' + ver + ' (' + day + ')');
}
