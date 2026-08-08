---
name: verify
description: Run lint, typecheck, test, and build together for cover-letter-generator. Use before committing or claiming a change works, since no single npm script covers all four.
---

Run these in order and report the first failure without guessing at a fix:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

If all four pass, say so explicitly. If any step fails, show the failing command's output and stop — do not proceed to the next step or attempt a fix until the user has seen the failure, unless they've asked you to fix issues as you find them.
