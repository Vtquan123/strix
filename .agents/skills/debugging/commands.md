# Commands: Debugging

```bash
npm test -- path/to.test   # reproduce with a focused test
node --inspect src/...     # attach debugger
npm run lint               # rule out obvious issues
git bisect start           # isolate a regressing commit
```
_Prefer a failing test over console spelunking._
