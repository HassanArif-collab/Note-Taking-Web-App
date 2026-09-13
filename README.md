# Diagnostics

Touch traces uploaded automatically from the iPad by the app (kebab menu -> Send report).
This branch exists so reports do not rebuild the live site on every upload.

Replay one:

```
git checkout main
git fetch origin diagnostics
git show origin/diagnostics:traces/auto/<file>.json > /tmp/t.json
node scripts/replay.js /tmp/t.json
```
