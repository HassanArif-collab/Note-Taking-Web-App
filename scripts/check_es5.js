/* ============================================================
 * check_es5.js - Safari 9 / iOS 9.3.5 safety gate.
 *
 * A single unsupported token in the inline script is a silent
 * white screen on the iPad, with no error anyone can see. Run
 * this before every push.
 *
 *   node scripts/check_es5.js [index.html]
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');

var target = process.argv[2] || path.join(__dirname, '..', 'index.html');
var html = fs.readFileSync(target, 'utf8');

var m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('FAIL: no inline <script> found'); process.exit(1); }
var js = m[1];
var css = (html.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];

var risks = 0;

/* Scan code, not prose: a comment mentioning "let" or containing a
 * backtick is not a Safari 9 problem, and a gate that cries wolf on
 * every comment stops being run. String literals are preserved so a
 * forbidden token hiding in one is still caught. */
function stripComments(src) {
  var re = new RegExp(
    '("(?:[^"\\\\]|\\\\.)*")' +      /* double-quoted string  */
    "|('(?:[^'\\\\]|\\\\.)*')" +     /* single-quoted string  */
    '|(/\\*[\\s\\S]*?\\*/)' +        /* block comment         */
    '|(//[^\\n]*)',                  /* line comment          */
    'g'
  );
  return src.replace(re, function (m, dq, sq) { return dq || sq || ' '; });
}

try { new Function(js); console.log('parse OK (' + js.length + ' chars of JS)'); }
catch (e) { console.log('PARSE FAIL: ' + e.message); process.exit(1); }

var jsBad = [
  ['let',            /\blet\s+[a-zA-Z_$]/],
  ['const',          /\bconst\s+[a-zA-Z_$]/],
  ['arrow function', /=>/],
  ['template literal', /`/],
  ['class',          /\bclass\s+[A-Z]/],
  ['for..of',        /for\s*\(\s*(?:var\s+)?\w+\s+of\s/],
  ['Promise',        /\bPromise\b/],
  ['fetch(',         /\bfetch\s*\(/],
  ['Pointer Events', /pointerdown|PointerEvent|onpointer/],
  ['Array.includes', /\.includes\s*\(/],
  ['Object.assign',  /Object\.assign/],
  ['Array.find',     /\.find\s*\(/],
  ['String.startsWith', /\.startsWith\s*\(/],
  ['String.endsWith',   /\.endsWith\s*\(/],
  ['Array.from',     /Array\.from/],
  ['Map/Set',        /\bnew\s+(Map|Set|WeakMap)\b/],
  ['Symbol',         /\bSymbol\s*\(/],
  ['requestIdleCallback', /requestIdleCallback/],
  ['Service Worker', /serviceWorker/],
  ['default param',  /function\s*\w*\s*\([^)]*=[^)]*\)/]
];

var cssBad = [
  ['CSS custom property', /--[a-zA-Z-]+\s*:/],
  ['var()',          /var\(--/],
  ['display:grid',   /display\s*:\s*(-\w+-)?grid/],
  ['flex gap',       /[^-\w]gap\s*:/],
  ['clamp()',        /clamp\(/],
  ['aspect-ratio',   /aspect-ratio/],
  ['focus-visible',  /:focus-visible/]
];

function scan(label, src, list) {
  var i, r;
  for (i = 0; i < list.length; i++) {
    r = src.match(list[i][1]);
    if (r) {
      risks++;
      var at = src.slice(0, r.index).split('\n').length;
      console.log('  ' + label + ' RISK: ' + list[i][0] + ' -> ' + JSON.stringify(r[0]) +
                  '  (near line ' + at + ' of the inline block)');
    }
  }
}

scan('JS', stripComments(js), jsBad);
scan('CSS', css.replace(/\/\*[\s\S]*?\*\//g, ' '), cssBad);

/* the download attribute does nothing in Safari 9 - flag it in the markup */
if (/<a[^>]+\sdownload/.test(html)) {
  risks++;
  console.log('  HTML RISK: download attribute (no-op in Safari 9)');
}

if (risks) { console.log('\nFAIL: ' + risks + ' Safari 9 risk(s)'); process.exit(1); }
console.log('\nOK: Safari 9 / iOS 9.3.5 safe');
