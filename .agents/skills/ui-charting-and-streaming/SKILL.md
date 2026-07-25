---
name: ui-charting-and-streaming
description: Master UI skill for high-performance financial chart rendering (Lightweight Charts), real-time SSE data streaming, clean Light-Theme design aesthetics, and structured AI narrative display.
---

# Master Skill: UI, Charting & Real-Time Streaming Engine

## 1. Canvas Charting Lifecycle (`lightweight-charts`)
* **Single Initializing Call**: Invoke `createChart(...)` strictly **once** inside a React `useEffect` with a container `ref`.
* **Zero Visual Canvas Flashing**: Do not trigger React state re-renders for chart containers on every incoming price tick.
* **Differential Hydration**:
  * Historical batch loads: `series.setData(historicalArray)`
  * Live incoming ticks: `series.update({ time, open, high, low, close })`

```typescript
// Pattern: High-performance real-time tick chart hydration
useEffect(() => {
  const sse = new EventSource(`/api/futures/stream?symbols=${ticker}`);
  
  sse.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "tick" && priceSeriesRef.current) {
      const nowSec = Math.floor(Date.now() / 1000) as UTCTimestamp;
      priceSeriesRef.current.update({
        time: nowSec,
        open: data.price,
        high: data.price,
        low: data.price,
        close: data.price,
      });
    }
  };

  return () => sse.close();
}, [ticker]);
```

---

## 2. Server-Sent Events (SSE) & Stream Safety
* Store `EventSource` instances in a `useRef` or effect scope.
* **Clean Unmount**: Call `sse.close()` in effect cleanup to prevent duplicate event listeners and memory leaks.
* Handle connection drops with exponential backoff on `sse.onerror`.

---

## 3. UI Design System Guidelines
* **Palette**: Crisp white background (`#ffffff`), soft slate surfaces (`#f8fafc`), clean gray borders (`border-slate-200`), and emerald/red price indicator accents.
* **Typography**: Clean, sans-serif typography (`Inter`, `sans-serif`) with uppercase micro-labels (`text-[10px] font-bold uppercase tracking-wider text-slate-400`).
* **Cards & Layout**: Rounded corners (`rounded-2xl`), subtle shadows (`shadow-[0_1px_3px_rgba(0,0,0,0.05)]`), and responsive grid structures.

---

## 4. Structured AI Narrative Display
* Wrap LLM inference calls with a 5-second `Promise.race` timeout wrapper to prevent UI freezes.
* Normalize sentiment ratings: Bullish/Bearish range $[-1.0, +1.0]$, Confidence range $[0.0, 1.0]$.
