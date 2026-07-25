---
name: code-quality-and-verification
description: Master code quality skill enforcing automated build verification (tsc, vitest), self-annealing error loops, Drizzle ORM database schemas, SPLR caching patterns, and 3-layer architecture governance.
---

# Master Skill: Code Quality, Verification & Architecture

## 1. Mandatory Build & Test Verification Protocol
* **Never declare success based only on editing a file.**
* After modifying TypeScript or UI code, run:
  ```bash
  npx tsc --noEmit
  ```
* After modifying analytics, indicators, or agents, execute unit tests:
  ```bash
  npx vitest run
  ```

### Self-Annealing Protocol
1. **Inspect Full Log**: Fetch exact stack trace and line numbers on build/test failure.
2. **Identify Root Cause**: Trace upstream signature mismatches, unhandled null states, or broken interfaces.
3. **Fix Underlying Implementation**: Update target module and all invocation sites.
4. **Prohibited Actions**: Never swallow errors in silent `catch` blocks, comment out failing assertions, or delete tests to mask symptoms.

---

## 2. Database Architecture & Drizzle ORM Guidelines (`db/schema.ts`)
* **Primary Keys**: Use UUIDs (`defaultRandom()`) or compound keys for join tables.
* **Indexing Mandate**: Every foreign key and query filter column (`ticker`, `userId`, `timestamp`) **must have an explicit index**.
* **Numeric Precision**: Store financial values with high precision (`numeric("price", { precision: 18, scale: 8 })`) to prevent float rounding errors.

### SPLR Cache Architecture (System KV + In-Memory L1)
```typescript
// Pattern: Two-layer fetch with fallback
export async function getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttlMs: number): Promise<T> {
  const l1 = getFromL1Cache<T>(key);
  if (l1) return l1;

  const l2 = await getFromDbKv<T>(key);
  if (l2) {
    setInL1Cache(key, l2, ttlMs);
    return l2;
  }

  const fresh = await fetchFn();
  await setInDbKv(key, fresh, ttlMs);
  setInL1Cache(key, fresh, ttlMs);
  return fresh;
}
```

---

## 3. The 3-Layer System Governance
* **Layer 1 (Directive)**: SOP instructions in `directives/` defining goals, inputs, tools, and edge cases.
* **Layer 2 (Orchestration - Agent)**: Decision-making and intelligent routing.
* **Layer 3 (Execution - Scripts)**: Deterministic scripts in `execution/` for heavy data processing and API ingestion.

### Code Quality Rules
* **Never Guess Symbol Signatures**: Inspect source files before calling unfamiliar functions or props.
* **Preserve API Contracts**: Update every invocation site across the workspace whenever modifying a function signature.
* **Workspace Hygiene**: Keep temporary processing files strictly in `.tmp/` (never committed).
