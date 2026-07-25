# SOP Directive: System Verification & Diagnostics

## Objective
Step-by-step procedure for verifying TypeScript compilation, running analytical unit tests, and self-healing build errors.

## Verification Checklist

### Step 1: Execute TypeScript Compilation Check
Run the strict compiler check from workspace root:
```bash
npx tsc --noEmit
```
* **Expected Output**: Zero errors (`Found 0 errors`).
* **If Errors Occur**: Inspect exact line numbers, resolve signature or type mismatches, and re-run.

### Step 2: Execute Vitest Quantitative Unit Suite
Run unit tests for analytical indicators, math engines, and valuation models:
```bash
npx vitest run
```
* **Expected Output**: All test suites passing.

### Step 3: Self-Annealing Diagnostic Loop
If any test or build check fails:
1. **Fetch Stack Trace**: Read the un-truncated error log output.
2. **Root Cause Resolution**: Fix the underlying function or invocation site. Do not delete assertions or swallow exceptions in silent catch blocks.
3. **Re-Verification**: Re-run both commands to verify full workspace integrity.
