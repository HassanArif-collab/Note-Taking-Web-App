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
 *   node scripts/stamp_offline.js           write the fingerprint
 *   node scripts/stamp_offline.js --check   exit 1 if it is out of date
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var MANIFEST = path.join(ROOT, 'mathnotes.appcache');
var FILES = ['index.html', 'lib/pdf.min.js', 'lib/pdf.worker.min.js'];

var h = crypto.createHash('sha1');
FILES.forEach(function (f) {
  /* line endings differ between a Windows checkout and what GitHub serves;
     the fingerprint is of the content, not of how git wrote it here */
  h.update(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'));
});
var ver = h.digest('hex').slice(0, 16);

var body = [
  'CACHE MANIFEST',
  '# MathNotes, kept on the iPad for use with no connection.',
  '# version ' + ver,
  '# Written by scripts/stamp_offline.js - run it after changing any file below.',
  '',
  'CACHE:',
  './',
  FILES.join('\n'),
  '',
  'NETWORK:',
  '*',
  ''
].join('\n');

if (process.argv.indexOf('--check') >= 0) {
  var cur = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== body) {
    console.log('FAIL: mathnotes.appcache is out of date - run: node scripts/stamp_offline.js');
    process.exit(1);
  }
  console.log('OK: offline manifest is current (version ' + ver + ')');
} else {
  fs.writeFileSync(MANIFEST, body);
  console.log('mathnotes.appcache -> version ' + ver);
}
