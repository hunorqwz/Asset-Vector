# ASSET VECTOR | SURGICAL INTELLIGENCE TRAINING

This directory contains the Python pipeline for training the **Temporal Fusion Transformer (TFT)** model used by the Asset Vector dashboard.

## 🧠 The Brain: TFT
We use `pytorch-forecasting`, a state-of-the-art framework built on PyTorch Lightning.
The TFT combines Multi-Head Attention (Transformer) with LSTM mechanisms to learn complex temporal dependencies across multiple horizons (Days, Weeks).

## 🚀 Setup & Execution

### 1. Environment
It is recommended to run this in a dedicated `conda` or `venv` environment to avoid conflicts with system Python.

```bash
cd training
python -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

### 2. Data Ingestion & Training
The automated script `train.py` handles the full pipeline:
1.  Downloads historical OHLCV data for SPY, QQQ, BTC-USD (Yahoo Finance).
2.  Builds the `TimeSeriesDataSet` with proper scaling.
3.  Trains the TFT model for 30 epochs (with Early Stopping).
4.  Saves the best checkpoint to `training/models/tft_model.pth`.

**Run command:**
```bash
python train.py
```

## 🛠️ Exporting to ONNX (For Next.js)
The current script saves a PyTorch `.pth` file. To run this in the Next.js app (which uses ONNX Runtime), you must convert it.

The challenge with TFT models is their complex input dictionary structure. To export cleanly to ONNX:
1.  Wrap the model in a `nn.Module` class that accepts flat Tensors instead of Dictionaries.
2.  Use `torch.onnx.export` with a dummy input tensor of shape `(Batch, Encoder_Length, Features)`.

**Example Export Snippet (to add to `train.py`):**
```python
class TFTONNXWrapper(torch.nn.Module):
    def __init__(self, tft_model):
        super().__init__()
        self.model = tft_model
    
    def forward(self, x):
        # Convert flat tensor 'x' into dict expected by TFT
        return self.model({"encoder_cont": x, ...}) 

wrapper = TFTONNXWrapper(best_tft)
torch.onnx.export(wrapper, dummy_input, "public/models/tft_quantized.onnx", opset_version=14)
```

## 🏆 Meaningful Metrics
When training, watch the following logs:
*   **Validation Loss (QuantileLoss)**: Lower is better. This measures how tight the probabilistic cone is.
*   **Attention Weights**: Inspecting these (via `model.plot_attention()`) reveals which days were most critical for the prediction (e.g., did the model focus on the Fed meeting last week?).

## ☁️ Cloud vs Local Training (Best Practice)
For **Production**, do not train on your MacBook Air.
**Recommendation:** use Google Colab Pro or AWS SageMaker.
1.  Upload `train.py` and `requirements.txt`.
2.  Select a T4 or A100 GPU Runtime.
3.  Run for 100-500 epochs with increased batch size.
4.  Download the final `.pth` or `.onnx` model.
