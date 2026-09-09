## 2026-08-11 - Use `Date.parse` for timestamp primitives

**Learning:** `Date.parse(value)` returns the timestamp primitive directly, while `new Date(value).getTime()` also constructs a `Date` object. Both use the same ECMAScript string-parsing semantics for these call sites.

**Action:** In frequently executed paths that only need a timestamp primitive, prefer `Date.parse(value)`. Treat the allocation reduction as a bounded micro-optimization unless a committed benchmark establishes a larger runtime effect.

## 2026-08-11 - Use Schwartzian transform to avoid O(N log N) Date.parse

**Learning:** When sorting an array using `Array.prototype.sort`, calling `Date.parse(a) - Date.parse(b)` inside the comparator function is highly inefficient because the sort operation has O(N log N) time complexity. `Date.parse` will be called multiple times for the same array element, creating unnecessary overhead.
**Action:** Before sorting, use `Array.prototype.map` to pre-calculate parsed primitive values in O(N) time (Schwartzian transform). Then sort the mapped array (O(N log N) but fast comparisons), and optionally map it back to its original form or keep the parsed value for further use.
