# Trader Analyzer Benchmarking Guide

## Microbenchmarks (mitata)

Run core function benchmarks:
```sh
bun run bench:micro
```

**Sample Results (Apple M4, Bun 1.3.3):**
```
Canonicalize simple market              3.78 µs/iter
Canonicalize complex sports market      3.11 µs/iter
Cache manager has check                11.79 µs/iter
MarketFetcher quickFetch               153.02 µs/iter
Exchange manager getExchange            558.05 ps/iter
```

## Build & CLI Benchmarks (hyperfine)

```sh
bun run bench:build      # Next.js build time
bun run bench:typecheck  # TypeScript checking
bun run bench:lint       # ESLint
bun run bench:cli-markets # CLI markets fetch
```

## HTTP Load Testing (oha)

Benchmark API endpoints (start dev server first):
```sh
bun run dev &  # In background
oha -n 1000 -c 50 http://localhost:8000/api/health
```

## Memory Profiling

### JS Heap
Add to scripts:
```ts
import { heapStats } from "bun:jsc";
console.log(heapStats());
Bun.gc(true);
```

### Native Heap
```sh
MIMALLOC_SHOW_STATS=1 bun scripts/benchmarks.ts
```

### Heap Snapshots
```ts
import { generateHeapSnapshot } from "bun";
const snapshot = generateHeapSnapshot();
await Bun.write("heap.json", JSON.stringify(snapshot, null, 2));
```
View in Safari DevTools > Timeline > JavaScript Allocations.

## CPU Profiling
```sh
bun --cpu-prof scripts/benchmarks.ts
```
Open `.cpuprofile` in Chrome DevTools Performance tab.

## npm Scripts Summary
- `bench:micro` - mitata microbenchmarks
- `bench:build` - hyperfine build benchmark
- `bench:typecheck` - hyperfine typecheck
- `bench:lint` - hyperfine lint
- `bench:cli-markets` - hyperfine CLI markets
