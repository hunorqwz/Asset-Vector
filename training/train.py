import warnings
import numpy as np
import pandas as pd
import yfinance as yf
import torch
import lightning.pytorch as pl
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer, Baseline, QuantileLoss
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import SMAPE, PoissonLoss, QuantileLoss
from lightning.pytorch.callbacks import EarlyStopping, LearningRateMonitor

warnings.filterwarnings("ignore")

# --- CONFIGURATION (SURGICAL PARAMETERS) ---
MAX_ENCODER_LENGTH = 60  # Look back 60 days
MAX_PREDICTION_LENGTH = 14 # Predict next 14 days
BATCH_SIZE = 128
EPOCHS = 30
GPU_ACCELERATOR = "cpu" # Force CPU for maximum stability (prevents MPS crashes)

def download_data():
    """
    Ingests institutional-grade data via Yahoo Finance.
    For production, replace with Twelve Data / Alpaca fetch.
    """
    tickers = ["SPY", "QQQ", "IWM", "BTC-USD", "NVDA", "AAPL", "MSFT"]
    data = yf.download(tickers, start="2018-01-01", group_by="ticker")
    
    # Restructure MultiIndex DataFrame to Long Format
    df_list = []
    for ticker in tickers:
        df = data[ticker].copy()
        df["ticker"] = ticker
        df = df.reset_index()
        # Ensure column names are standard
        df = df.rename(columns={"Date": "date", "Close": "close", "Volume": "volume", "Open": "open", "High": "high", "Low": "low"})
        df_list.append(df)
    
    combined_df = pd.concat(df_list, ignore_index=True)
    combined_df["time_idx"] = (combined_df["date"] - combined_df["date"].min()).dt.days
    
    # Feature Engineering (The "Surgical" Edge)
    from ta.trend import MACD, SMAIndicator
    from ta.momentum import RSIIndicator
    from ta.volatility import BollingerBands, AverageTrueRange

    # 1. PRICE DERIVATIVES
    combined_df["log_volume"] = np.log(combined_df.volume + 1e-8)
    combined_df["log_return"] = np.log(combined_df.close / combined_df.close.shift(1)).fillna(0)
    
    # 2. TREND & MOMENTUM (The "Pulse")
    # RSI (Relative Strength Index)
    combined_df['rsi'] = RSIIndicator(close=combined_df["close"], window=14).rsi().fillna(50)
    
    # MACD (Moving Average Convergence Divergence)
    macd = MACD(close=combined_df["close"])
    combined_df['macd'] = macd.macd().fillna(0)
    combined_df['macd_diff'] = macd.macd_diff().fillna(0)
    
    # SMA Deviation (Distance from Trend)
    sma_20 = SMAIndicator(close=combined_df["close"], window=20).sma_indicator()
    combined_df['dist_sma_20'] = (combined_df['close'] - sma_20) / sma_20
    combined_df['dist_sma_20'] = combined_df['dist_sma_20'].fillna(0)

    # 3. VOLATILITY (The "Risk")
    # ATR (Average True Range) - Normalized by Close Price
    atr = AverageTrueRange(high=combined_df['high'], low=combined_df['low'], close=combined_df['close'], window=14)
    combined_df['atr_pct'] = (atr.average_true_range() / combined_df['close']).fillna(0)
    
    # Bollinger Band Width (Squeeze Detection)
    bb = BollingerBands(close=combined_df["close"], window=20, window_dev=2)
    combined_df['bb_width'] = bb.bollinger_wband().fillna(0)
    
    # 4. TEMPORAL FEATURES (The "Seasonality")
    combined_df['day_of_week'] = combined_df['date'].dt.dayofweek.astype(str).astype('category')
    combined_df['month'] = combined_df['date'].dt.month.astype(str).astype('category')
    
    # Drop initial NaN rows created by lookback windows (e.g. first 50 days)
    combined_df = combined_df.dropna()
    
    return combined_df

def create_dataset(data):
    """
    Constructs the Institutional-Grade TimeSeriesDataSet.
    Predicts using Price + Volatility + Momentum + Seasonality.
    """
    training_cutoff = data["time_idx"].max() - MAX_PREDICTION_LENGTH

    training = TimeSeriesDataSet(
        data[lambda x: x.time_idx <= training_cutoff],
        time_idx="time_idx",
        target="close",
        group_ids=["ticker"],
        min_encoder_length=MAX_ENCODER_LENGTH // 2,
        max_encoder_length=MAX_ENCODER_LENGTH,
        min_prediction_length=1,
        max_prediction_length=MAX_PREDICTION_LENGTH,
        static_categoricals=["ticker"],
        time_varying_known_categoricals=["day_of_week", "month"],
        time_varying_known_reals=["time_idx"],
        time_varying_unknown_reals=[
            "close", "volume", "log_volume", "log_return", 
            "rsi", "macd", "macd_diff", "dist_sma_20", 
            "atr_pct", "bb_width"
        ],
        target_normalizer=GroupNormalizer(
            groups=["ticker"], transformation="softplus"
        ),
        add_relative_time_idx=True,
        add_target_scales=True,
        add_encoder_length=True,
        allow_missing_timesteps=True
    )
    
    validation = TimeSeriesDataSet.from_dataset(training, data, predict=True, stop_randomization=True)
    return training, validation

def train_tft(training_dataset, validation_dataset):
    """
    Initializes and trains the Temporal Fusion Transformer.
    """
    train_dataloader = training_dataset.to_dataloader(train=True, batch_size=BATCH_SIZE, num_workers=0)
    val_dataloader = validation_dataset.to_dataloader(train=False, batch_size=BATCH_SIZE * 10, num_workers=0)

    tft = TemporalFusionTransformer.from_dataset(
        training_dataset,
        learning_rate=0.03,
        hidden_size=16,
        attention_head_size=1,
        dropout=0.1,
        hidden_continuous_size=8,
        output_size=7,  # 7 quantiles for probabilistic forecasting
        loss=QuantileLoss(),
        log_interval=10,
        reduce_on_plateau_patience=4,
    )
    
    trainer = pl.Trainer(
        max_epochs=EPOCHS,
        accelerator=GPU_ACCELERATOR,
        gradient_clip_val=0.1,
        limit_train_batches=30,  # Fast run for verifying pipeline
        callbacks=[
            EarlyStopping(monitor="val_loss", min_delta=1e-4, patience=10, verbose=False, mode="min"),
            LearningRateMonitor()
        ],
    )
    
    print(f"Starting Training on {GPU_ACCELERATOR}...")
    trainer.fit(
        tft,
        train_dataloaders=train_dataloader,
        val_dataloaders=val_dataloader,
    )
    
    best_model_path = trainer.checkpoint_callback.best_model_path
    best_tft = TemporalFusionTransformer.load_from_checkpoint(best_model_path)
    return best_tft

def export_onnx(model, dummy_input_sample):
    """
    Exports the trained PyTorch model to ONNX format.
    """
    print("Exporting to ONNX...")
    model.eval()
    
    # Requires complex input handling for TFT (feature dictionaries).
    # For V1, we simplify: usually we export the raw forward pass.
    # However, PyTorch Forecasting's forward pass expects dictionary inputs.
    # We must wrap it or trace it carefully.
    
    # SKELETON: Save PyTorch model for now, as ONNX export of TFT is non-trivial 
    # and requires a specific wrapper class.
    torch.save(model.state_dict(), "models/tft_model.pth")
    print("Saved PyTorch model to models/tft_model.pth")
    
    # To properly export to ONNX for Next.js usage, we would typically
    # trace the model with representative input data.
    # input_sample = ...
    # torch.onnx.export(model, input_sample, "training/models/tft.onnx", ...)

if __name__ == "__main__":
    print("--- ASSET VECTOR TRAINING PIPELINE ---")
    df = download_data()
    print(f"Data Downloaded: {len(df)} rows.")
    
    training_ds, validation_ds = create_dataset(df)
    print("Datasets created.")
    
    model = train_tft(training_ds, validation_ds)
    print("Training Complete.")
    
    export_onnx(model, None)
    print("Pipeline Finished.")
