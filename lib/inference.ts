import fs from 'fs';
import path from 'path';

// Placeholder types until onnxruntime-node is installed
type InferenceSession = any;
type Tensor = any;

const MODEL_PATH = path.join(process.cwd(), 'training', 'models', 'tft_model.pth');

/**
 * Singleton to hold the loaded model session in memory.
 * Prevents reloading the 50MB model on every request.
 */
let session: InferenceSession | null = null;

export async function loadModel() {
  if (!session) {
    // Check if the trained brain exists
    if (fs.existsSync(MODEL_PATH)) {
       console.log("✅ AI BRAIN FOUND:", MODEL_PATH);
       session = { mock: true, active: true }; // Mock session object
    } else {
       console.warn("⚠️ AI BRAIN MISSING. Run 'python training/train.py' to activate.");
    }
  }
  return session;
}

/**
 * Runs the Temporal Fusion Transformer (TFT) inference.
 * @param inputSequence Recent 50 candles (OHLCV)
 */
export async function predictNextHorizon(inputSequence: number[][]) {
  try {
      // 1. BRAIN CONNECTION (Attempt to call Python AI Server)
      const last = inputSequence[inputSequence.length - 1][3]; // Close price column
      
      const payload = {
          ticker: "UNKNOWN", // We can pass ticker later if needed
          history: inputSequence.map(x => ({ 
              open: x[0], high: x[1], low: x[2], close: x[3], volume: x[4] 
          }))
      };

      const res = await fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          next: { revalidate: 0 } // No cache for prediction
      });
      
      if (res.ok) {
          const aiData = await res.json();
          // SUCCESS: The Brain Spoke
          return {
              p10: aiData.p10,
              p50: aiData.p50,
              p90: aiData.p90,
              source: "TFT-v1 (Python)"
          };
      }
  } catch (e) {
      // API Offline -> Fallback to Local Simulation
      console.warn("AI Server Offline, using local simulation");
  }

  // 2. FALLBACK (Local Simulation)
  return generateFallbackPrediction(inputSequence);
}

function generateFallbackPrediction(seq: number[][]) {
  const last = seq[seq.length - 1][3] || 100;
  // High Uncertainty (Wide Cone)
  return {
    p10: last * 0.95,
    p50: last * 1.00,
    p90: last * 1.05,
    source: "Heuristic (Fallback)"
  };
}
