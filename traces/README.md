# Touch traces

Recordings of real touch input from the iPad, used to tune and verify palm
rejection against an actual hand instead of a synthetic model.

To record one, see "Reporting a palm-rejection problem" in the top-level
README. Save the copied JSON here as `<what-went-wrong>.json`, for example
`palm-dots-while-writing.json`, then:

```
node ../scripts/replay.js palm-dots-while-writing.json
```

A trace stores raw client coordinates plus the geometry they were captured in
(viewport, zoom, scroll, palm level, handedness), so a replay feeds the engine
exactly what it saw on the device.
