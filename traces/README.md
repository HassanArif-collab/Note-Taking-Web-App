# Touch traces

Recordings of real touch input from the iPad, used to tune and verify palm
rejection. Each one is what the glass actually reported — raw client
coordinates plus the geometry they were captured in — so replaying a file
gives the engine exactly what it saw on the device.

## Where they come from

```
node scripts/serve.js
```

Open the printed address on the iPad (same wifi), then **⋮ → Testing drills**.
Each drill records itself for a fixed time and posts the result here
automatically.

## Why drills rather than bug reports

A drill says what the hand is about to do **before** it does it, so every
contact in the file carries ground truth:

| `want` | meaning |
|---|---|
| `0` | the hand was on the glass and the pen was not. Any mark is a failure. |
| `N` | exactly N strokes were drawn on purpose. More is the palm; fewer is the pen being refused. |
| `-1` | only the pen was down, so every contact that lasted long enough to be a mark should have left one. |

That is the difference between "it felt bad" and a number.

## Reading them

```
node scripts/score.js                   every recording, as a scoreboard
node scripts/score.js pen               only ones whose name matches
node scripts/score.js --html old.html   the same recordings, another build
node scripts/replay.js <file>           one recording, contact by contact
```

`score.js` exits non-zero if any drill fails, so a change that costs you a
stroke cannot be shipped by accident.

## fixture-*.json

Synthetic. Motion I made up, so the scoreboard runs before anyone has touched
the glass. **They are not evidence about a real hand** — tuning against
invented motion is exactly how the engine came to erase real handwriting.
`score.js` labels them so they can never be mistaken for the real thing.
Delete them once there are enough real recordings.
