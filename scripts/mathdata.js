/* ============================================================
 * mathdata.js - the maths session's takes, with every symbol labelled.
 *
 * Testing drills -> maths session records the digits and nine short sums,
 * three times each. The prompt says what was written, so once the
 * reader's own grouping agrees with the prompt on how many symbols there
 * are, each symbol gets its label from the prompt.
 *
 *   var takes = require('./mathdata.js')(M)   M = the app's __mnMath
 * ============================================================ */
'use strict';
var fs = require('fs'), path = require('path');
var DIR = path.join(__dirname, '..', 'traces');

var WANT = {
  D1: { seq: '0123456789' },
  S1: { seq: '22+4=', v: 26 }, S2: { seq: '47-19=', v: 28 }, S3: { seq: '6x8=', v: 48 },
  S4: { seq: '56÷7=', v: 8 }, S5: { seq: '(3+5)x12=', v: 96 }, S6: { seq: '3.5+1.25=', v: 4.75 },
  S7: { seq: '52+122=', v: 169 }, S8: { seq: '#+#=', v: 1.25, frac: ['12', '34'] }
};

function boxOf(strokes) {
  var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  strokes.forEach(function (st) { st.pts.forEach(function (p) {
    b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); }); });
  return b;
}

module.exports = function (M) {
  return fs.readdirSync(DIR).filter(function (f) { return /^mth-/.test(f); }).sort().map(function (f) {
    var d = JSON.parse(fs.readFileSync(path.join(DIR, f))), item = d.ref.item;
    var ink = d.ink.map(function (s) { return { pen: s.pen, w: s.w, pts: s.pts.map(function (p) { return [p[0], p[1], p[2]]; }) }; });
    var syms = M.group(ink.map(function (s) { return { pts: s.pts, pen: 0 }; }));
    /* the first "22 + 4 =" take on the iPad holds the digits written again */
    if (item === 'S1' && syms.length >= 10) item = 'D1';
    var w = WANT[item], lab = [], fi = 0;
    var hs = syms.map(function (s) { return s.y1 - s.y0; }).sort(function (a, b) { return a - b; });
    var h = hs[hs.length >> 1] || 28;
    if (w && syms.length === w.seq.length) {
      syms.forEach(function (s, i) {
        var c = w.seq[i];
        if (c === '#') {
          /* a fraction: the longest stroke is its bar, the digits above and below are known */
          var bar = null;
          s.list.forEach(function (st) { var b = boxOf([st]); if (!bar || b.x1 - b.x0 > bar.w) bar = { st: st, w: b.x1 - b.x0, y: (b.y0 + b.y1) / 2 }; });
          var up = [], dn = [];
          s.list.forEach(function (st) { if (st === bar.st) return; var b = boxOf([st]); ((b.y0 + b.y1) / 2 < bar.y ? up : dn).push(st); });
          var pair = w.frac[fi++];
          if (up.length) lab.push({ c: pair[0], strokes: up, h: h });
          if (dn.length) lab.push({ c: pair[1], strokes: dn, h: h });
        } else if (c !== '=' && c !== '.') {
          lab.push({ c: c, strokes: s.list, h: h });
        }
      });
    }
    return { f: f, item: item, ink: ink, w: w, lab: lab, n: syms.length };
  });
};
module.exports.boxOf = boxOf;
