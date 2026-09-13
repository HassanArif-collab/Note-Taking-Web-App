# Touch traces

Recordings of real touch input from the iPad, used to tune and verify palm
rejection against an actual hand instead of a synthetic model.

Record one from the kebab menu: **Touch trace** (starts), reproduce the problem,
**Touch trace** again (stops), **Show trace**, Copy. Mail it to yourself, save it
here as `<what-went-wrong>.json`, then:

```
node ../scripts/replay.js palm-dots-while-writing.json
```

A trace stores raw client coordinates plus the geometry they were captured in
(viewport, zoom, scroll, palm level, handedness). The engine is deterministic,
so replaying those raw samples reproduces every decision exactly - and any
internal value (velocity, coherence, straightness, suspect flags) can be
recomputed from them. That is why the recorder does not store internals: they
would be redundant.

## What the recorder cannot see

It captures what the engine **decided**, never whether the decision was
**right**. No sensor on this hardware reports which contact was a palm - an
iPad 3 gives no touch radius, no force, and no stylus id. Ground truth has to
come from you.

Two ways to supply it, both free:

### 1. Undo is a label

An undo recorded just after a mark appeared means "that mark was wrong". Replay
prints these and points at whichever contact inked just before. So when a stray
mark shows up while recording, **undo it** - that turns normal use into
labelled data.

### 2. Scripted sessions

A session where the correct answer is known in advance is worth far more than a
mixed one. Record these separately, one file each:

| File | What to do | Correct result |
|------|-----------|----------------|
| `only-palm.json` | Rest your hand and shift it around. Write **nothing**. | 0 marks. Anything that inks is a false positive. |
| `only-pen.json` | Write a few lines with your hand held **off** the glass. | Every stroke inks. Anything missing is a false negative. |
| `normal-writing.json` | Write a few lines the way you actually do, hand resting. | Every pen stroke inks, nothing else does. |
| `slow-and-careful.json` | Draw slow deliberate straight things - fraction bars, minus signs, a long division - hand resting. | All of them ink. This is the case most at risk from the straight-and-slow veto. |

Keep each under ~20 seconds. The buffer holds 4000 samples and drops the oldest
beyond that, so short and targeted beats long and general.
