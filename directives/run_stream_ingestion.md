# SOP Directive: Databento Stream Ingestion Operations

## Objective
Provide step-by-step instructions for launching, monitoring, and troubleshooting the Databento live/mock order flow streaming engine.

## Inputs & Configuration
* **Environment Variables**: `DATABENTO_API_KEY`, `NEXT_PUBLIC_APP_URL` (default: `http://localhost:3000`).
* **Target Instruments**: Continuous Globex contracts (`GC.v.0` for Gold, `6E.v.0` for Euro FX).
* **Script Location**: `execution/databento_stream.py`.

## Operational Workflow

### Step 1: Verification of Backend API Endpoints
Before launching stream ingestion, ensure the Next.js API endpoints are accessible:
* `/api/futures/ticks` (Ingests real-time tick/quote events)
* `/api/futures/order-flow` (Ingests 1m aggregated candles)
* `/api/futures/alerts` (Ingests consensus entry alerts)

### Step 2: Launch Stream Engine
Run the Python stream worker from the workspace root:
```bash
python3 execution/databento_stream.py --symbols GC.V.0,6E.V.0
```
*For offline testing without API credits*, append `--mock`:
```bash
python3 execution/databento_stream.py --symbols GC.V.0,6E.V.0 --mock
```

### Step 3: Monitor Ingestion Telemetry
Verify that:
1. HTTP POST responses return `200 OK` from `/api/futures/ticks`.
2. SSE bridge (`lib/futures-server-bridge.ts`) broadcasts ticks to connected clients without connection drops.

## Edge Cases & Self-Healing
* **API Rate Limits / Credit Exhaustion**: Switch script to `--mock` replay mode and inform the user.
* **Network Disconnection**: The Python script automatically attempts exponential backoff reconnection after 5 seconds.
