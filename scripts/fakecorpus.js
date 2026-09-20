/* Prove the scoreboard works BEFORE anyone spends twelve minutes writing.
 *
 * Builds a fake corpus: a neat line, a second neat line differing only by
 * a little natural wobble (that pair is the noise floor), and a normal
 * line that is the neat one tilted, resized unevenly and pushed off its
 * baseline. The damage is known exactly, so the scoreboard's answer can
 * be checked against it. */
var fs = require('fs');
var path = require('path');

var OUT = process.argv[2];
if (!OUT) { console.error('usage: fakecorpus.js <dir>'); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function rnd(seed) {
  var s = seed;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* a line of little letter-ish strokes sitting on y = base */
function line(seed, opts) {
  var r = rnd(seed), ink = [], i, q, x, h, foot, pts, wob = opts.wobble || 0;
  var n = opts.n || 14;
  for (i = 0; i < n; i++) {
    x = 100 + i * 34 + (opts.gapJitter ? (r() - 0.5) * opts.gapJitter : 0);
    h = 26 * (1 + (opts.sizeJitter || 0) * (r() - 0.5));
    foot = 300 + (opts.tilt || 0) * (x - 100) +
           (opts.baseJitter ? (r() - 0.5) * opts.baseJitter : 0);
    pts = [];
    for (q = 0; q <= 8; q++) {
      pts.push([
        x + q * 2.4 + (r() - 0.5) * wob,
        foot - h + (q / 8) * h + (r() - 0.5) * wob,
        1700000000000 + i * 300 + q * 18
      ]);
    }
    ink.push({ pen: 0, w: 3, ord: i, pts: pts });
  }
  return ink;
}

function write(item, text, mode, take, ink) {
  var obj = { v: 1, label: 'ref-' + item + '-' + mode + '-' + take,
              ref: { item: item, mode: mode, take: take, text: text },
              ink: ink, samples: [] };
  fs.writeFileSync(path.join(OUT, obj.label + '-fake.json'), JSON.stringify(obj));
}

/* E1: the neat pair differs only by natural wobble; the normal take is
   tilted 4 degrees, sizes vary 40%, feet scatter, gaps uneven */
write('E1', 'the quick brown fox', 'neat', 1,
      line(11, { wobble: 0.6, sizeJitter: 0.05, baseJitter: 1 }));
write('E1', 'the quick brown fox', 'neat', 2,
      line(29, { wobble: 0.6, sizeJitter: 0.05, baseJitter: 1 }));
write('E1', 'the quick brown fox', 'norm', 1,
      line(47, { wobble: 1.4, tilt: 0.07, sizeJitter: 0.40,
                 baseJitter: 9, gapJitter: 14 }));

/* E2: a much smaller difference, to prove the noise floor actually
   suppresses a gap that is not real */
write('E2', 'jumps over lazy dog', 'neat', 1,
      line(53, { wobble: 0.6, sizeJitter: 0.05, baseJitter: 1 }));
write('E2', 'jumps over lazy dog', 'neat', 2,
      line(71, { wobble: 0.6, sizeJitter: 0.05, baseJitter: 1 }));
write('E2', 'jumps over lazy dog', 'norm', 1,
      line(89, { wobble: 0.6, sizeJitter: 0.05, baseJitter: 1 }));

console.log('fake corpus written to ' + OUT);
