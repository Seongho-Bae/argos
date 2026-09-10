## 2026-08-11 - Use `Date.parse` for timestamp primitives

**Learning:** `Date.parse(value)` returns the timestamp primitive directly, while `new Date(value).getTime()` also constructs a `Date` object. Both use the same ECMAScript string-parsing semantics for these call sites.

**Action:** In frequently executed paths that only need a timestamp primitive, prefer `Date.parse(value)`. Treat the allocation reduction as a bounded micro-optimization unless a committed benchmark establishes a larger runtime effect.

## 2026-09-09 - Avoid O(N log N) `Date.parse` in arrays.sort

**Learning:** Array sorting with complex transformations in the comparison function (like `Date.parse`) calls the transformation function O(N log N) times. Pre-computing the value transforms the work to O(N) mapping + O(N log N) sorting.

**Action:** Use a Schwartzian transform (map-sort-map) for expensive sort keys. Do not spread (`...item`) original objects in the wrapper, which causes O(N) shallow copies; wrap them instead (`{ original: item, parsedValue }`).