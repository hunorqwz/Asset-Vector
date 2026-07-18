#!/usr/bin/env python3
"""
Asset Vector - Databento Live & Mock Stream Processor
Ingests CME Futures tick data, calculates order flow metrics (CVD, Volume Profile, Imbalances),
generates entry alerts, and posts updates to Next.js API endpoints.
"""

import sys
import os
import time
import json
import argparse
import random
import threading
import urllib.request
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCY MANAGER
# ─────────────────────────────────────────────────────────────────────────────
DATABENTO_AVAILABLE = False
try:
    import databento as db
    DATABENTO_AVAILABLE = True
except ImportError:
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "databento"])
        import databento as db
        DATABENTO_AVAILABLE = True
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# CORE ORDER FLOW & MATHEMATICAL STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────
class SessionVolumeProfile:
    """
    Computes Session Volume Profile, Point of Control (POC), 
    Value Area High (VAH), and Value Area Low (VAL).
    """
    def __init__(self, tick_size=0.10):
        self.tick_size = tick_size
        self.profile = {}  # price -> volume
        self.total_volume = 0.0

    def add_trade(self, price, size):
        # Round to nearest tick increment to group levels cleanly
        rounded_price = round(round(price / self.tick_size) * self.tick_size, 5)
        self.profile[rounded_price] = self.profile.get(rounded_price, 0) + size
        self.total_volume += size

    def get_poc(self):
        if not self.profile:
            return 0.0
        return max(self.profile, key=self.profile.get)

    def calculate_value_area(self, value_area_pct=0.70):
        """
        Derives VAH and VAL containing 70% of total session volume starting at POC.
        """
        if not self.profile or self.total_volume <= 0:
            return 0.0, 0.0, 0.0

        poc = self.get_poc()
        prices = sorted(self.profile.keys())
        poc_idx = prices.index(poc)

        target_volume = self.total_volume * value_area_pct
        accumulated_vol = self.profile[poc]

        lower_idx = poc_idx
        upper_idx = poc_idx

        # Expand outwards from POC summing the larger adjacent volume levels
        while accumulated_vol < target_volume:
            has_lower = lower_idx > 0
            has_upper = upper_idx < len(prices) - 1

            if not has_lower and not has_upper:
                break

            vol_lower = self.profile[prices[lower_idx - 1]] if has_lower else 0
            vol_upper = self.profile[prices[upper_idx + 1]] if has_upper else 0

            if vol_lower >= vol_upper and has_lower:
                lower_idx -= 1
                accumulated_vol += vol_lower
            elif has_upper:
                upper_idx += 1
                accumulated_vol += vol_upper
            else:
                lower_idx -= 1
                accumulated_vol += vol_lower

        val = prices[lower_idx]
        vah = prices[upper_idx]
        return poc, vah, val

    def get_lvns(self, pct=0.15):
        if not self.profile:
            return []
            
        poc = self.get_poc()
        poc_vol = self.profile[poc]
        if poc_vol <= 0:
            return []

        prices = sorted(self.profile.keys())
        min_p = min(prices)
        max_p = max(prices)
        
        lvns = []
        for p in prices:
            if p == min_p or p == max_p:
                continue
            if self.profile[p] < poc_vol * pct:
                lvns.append(p)
        return lvns



class CandleBuilder:
    """
    Aggregates tick-by-tick data into 1-minute OHLCV bars.
    """
    def __init__(self):
        self.open = None
        self.high = -float("inf")
        self.low = float("inf")
        self.close = None
        self.volume = 0.0
        
    def add_tick(self, price, size):
        if self.open is None:
            self.open = price
        self.high = max(self.high, price)
        self.low = min(self.low, price)
        self.close = price
        self.volume += size

    def get_bar(self, fallback_price=0.0):
        if self.open is None:
            return {
                "open": fallback_price,
                "high": fallback_price,
                "low": fallback_price,
                "close": fallback_price,
                "volume": 0.0
            }
        return {
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume
        }

class MarketStructureAgent:
    """
    Agent 1: Market Structure Analyst
    Identifies Swing Points (Highs/Lows) and active Fair Value Gaps (FVGs) 
    to define high-probability Areas of Value.
    """
    def __init__(self, fvg_min_pct=0.0005):
        self.candles = []
        self.swing_highs = []
        self.swing_lows = []
        self.unmitigated_fvgs = []  # list of {"type": "BULLISH"|"BEARISH", "top", "bottom"}
        self.fvg_min_pct = fvg_min_pct

    def add_candle(self, bar):
        self.candles.append(bar)
        if len(self.candles) > 120:
            self.candles.pop(0)
            
        self._detect_swings()
        self._detect_fvgs()
        self._mitigate_fvgs(bar["close"])

    def _detect_swings(self):
        """
        Detects 5-candle swing highs and swing lows.
        """
        if len(self.candles) < 5:
            return
            
        c_prev2 = self.candles[-5]
        c_prev1 = self.candles[-4]
        c_mid = self.candles[-3]
        c_next1 = self.candles[-2]
        c_next2 = self.candles[-1]

        # Swing High
        if c_mid["high"] > c_prev2["high"] and c_mid["high"] > c_prev1["high"] and \
           c_mid["high"] > c_next1["high"] and c_mid["high"] > c_next2["high"]:
            val = c_mid["high"]
            if val not in self.swing_highs:
                self.swing_highs.append(val)
                if len(self.swing_highs) > 20: self.swing_highs.pop(0)

        # Swing Low
        if c_mid["low"] < c_prev2["low"] and c_mid["low"] < c_prev1["low"] and \
           c_mid["low"] < c_next1["low"] and c_mid["low"] < c_next2["low"]:
            val = c_mid["low"]
            if val not in self.swing_lows:
                self.swing_lows.append(val)
                if len(self.swing_lows) > 20: self.swing_lows.pop(0)

    def _detect_fvgs(self):
        """
        Identifies new Fair Value Gaps using a 3-candle sequence.
        """
        if len(self.candles) < 3:
            return
            
        c1 = self.candles[-3]
        c2 = self.candles[-2]
        c3 = self.candles[-1]

        # Bullish FVG
        if c3["low"] > c1["high"]:
            gap_size = c3["low"] - c1["high"]
            min_gap = c2["open"] * self.fvg_min_pct
            if gap_size >= min_gap:
                fvg = {"type": "BULLISH", "top": c3["low"], "bottom": c1["high"]}
                if not any(f["bottom"] == fvg["bottom"] for f in self.unmitigated_fvgs):
                    self.unmitigated_fvgs.append(fvg)
                    if len(self.unmitigated_fvgs) > 15: self.unmitigated_fvgs.pop(0)

        # Bearish FVG
        elif c3["high"] < c1["low"]:
            gap_size = c1["low"] - c3["high"]
            min_gap = c2["open"] * self.fvg_min_pct
            if gap_size >= min_gap:
                fvg = {"type": "BEARISH", "top": c1["low"], "bottom": c3["high"]}
                if not any(f["top"] == fvg["top"] for f in self.unmitigated_fvgs):
                    self.unmitigated_fvgs.append(fvg)
                    if len(self.unmitigated_fvgs) > 15: self.unmitigated_fvgs.pop(0)

    def _mitigate_fvgs(self, current_close):
        active_fvgs = []
        for fvg in self.unmitigated_fvgs:
            if fvg["type"] == "BULLISH":
                if current_close < fvg["bottom"]:
                    continue
            else:
                if current_close > fvg["top"]:
                    continue
            active_fvgs.append(fvg)
        self.unmitigated_fvgs = active_fvgs

    def get_structure_zones(self, current_price):
        bullish_fvgs = [f for f in self.unmitigated_fvgs if f["type"] == "BULLISH"]
        bearish_fvgs = [f for f in self.unmitigated_fvgs if f["type"] == "BEARISH"]
        
        support_fvg = max([f for f in bullish_fvgs if f["top"] <= current_price], key=lambda f: f["top"], default=None)
        resistance_fvg = min([f for f in bearish_fvgs if f["bottom"] >= current_price], key=lambda f: f["bottom"], default=None)
        
        nearest_swing_high = min([sh for sh in self.swing_highs if sh > current_price], default=None)
        nearest_swing_low = max([sl for sl in self.swing_lows if sl < current_price], default=None)

        return {
            "support_fvg": support_fvg,
            "resistance_fvg": resistance_fvg,
            "nearest_swing_high": nearest_swing_high,
            "nearest_swing_low": nearest_swing_low
        }

    def get_trend_bias(self, current_price):
        if not self.candles:
            return "NEUTRAL"
            
        bullish_fvgs = [f for f in self.unmitigated_fvgs if f["type"] == "BULLISH"]
        bearish_fvgs = [f for f in self.unmitigated_fvgs if f["type"] == "BEARISH"]

        if bullish_fvgs and not bearish_fvgs:
            return "BULLISH"
        elif bearish_fvgs and not bullish_fvgs:
            return "BEARISH"
            
        if self.swing_highs and self.swing_lows:
            if current_price > self.swing_highs[-1]:
                return "BULLISH"
            elif current_price < self.swing_lows[-1]:
                return "BEARISH"

        return "NEUTRAL"



class MicrostructureAgent:
    """
    Agent 2: Microstructure & Order Flow Analyst
    Analyzes CVD delta slopes, footprint imbalances, and size flow to spot buy/sell triggers.
    """
    def __init__(self, block_size_threshold=10):
        self.block_size_threshold = block_size_threshold
        self.candle_history = []  # list of {"close", "cvd"}

    def add_candle_state(self, close_price, cvd):
        self.candle_history.append({"close": close_price, "cvd": cvd})
        if len(self.candle_history) > 60:
            self.candle_history.pop(0)

    def detect_cvd_divergence(self):
        """
        Scans recent completed candles for price-delta divergence.
        """
        if len(self.candle_history) < 5:
            return None

        # Compare current state with 5 candles ago
        curr = self.candle_history[-1]
        prev = self.candle_history[-5]

        price_diff = curr["close"] - prev["close"]
        cvd_diff = curr["cvd"] - prev["cvd"]

        # Bullish Divergence: Price goes down, CVD goes up (buying absorption)
        if price_diff < 0 and cvd_diff > 150:
            return "BULLISH_DIVERGENCE"

        # Bearish Divergence: Price goes up, CVD goes down (selling absorption)
        if price_diff > 0 and cvd_diff < -150:
            return "BEARISH_DIVERGENCE"

        return None

    def detect_imbalance(self, bid_sz, ask_sz):
        total = bid_sz + ask_sz
        if total <= 0:
            return "NEUTRAL"
            
        imbalance = (bid_sz - ask_sz) / total
        if imbalance >= 0.85:
            return "STRONG_BID"
        elif imbalance <= -0.85:
            return "STRONG_ASK"
        return "NEUTRAL"

    def calculate_diagonal_imbalances(self, footprint, tick_size, min_volume=10, ratio=3.0):
        """
        Scans footprint price levels to detect diagonal buying/selling imbalances.
        """
        prices = sorted(footprint.keys())
        buying_imbalances = []
        selling_imbalances = []

        for p in prices:
            # Diagonal buy check: buy_vol at p vs sell_vol at p - tick_size
            p_below = round(p - tick_size, 5)
            buy_vol = footprint[p]["buy_vol"]
            if buy_vol >= min_volume and p_below in footprint:
                sell_vol_below = footprint[p_below]["sell_vol"]
                if sell_vol_below > 0 and buy_vol >= sell_vol_below * ratio:
                    buying_imbalances.append(p)
                elif sell_vol_below == 0 and buy_vol >= min_volume:
                    buying_imbalances.append(p)

            # Diagonal sell check: sell_vol at p vs buy_vol at p + tick_size
            p_above = round(p + tick_size, 5)
            sell_vol = footprint[p]["sell_vol"]
            if sell_vol >= min_volume and p_above in footprint:
                buy_vol_above = footprint[p_above]["buy_vol"]
                if buy_vol_above > 0 and sell_vol >= buy_vol_above * ratio:
                    selling_imbalances.append(p)
                elif buy_vol_above == 0 and sell_vol >= min_volume:
                    selling_imbalances.append(p)

        return buying_imbalances, selling_imbalances



class SessionRiskAgent:
    """
    Agent 3: Session & Risk Manager
    Defines trend states relative to Volume Profile Value Areas (VAH/VAL/POC) 
    and checks risk constraints (spreads, ATR-based Stop Loss / Take Profit offsets).
    """
    def __init__(self, atr_period=14, fallback_atr=1.5):
        self.atr_period = atr_period
        self.fallback_atr = fallback_atr
        self.candles = []
        self.tr_values = []

    def add_candle(self, bar):
        self.candles.append(bar)
        if len(self.candles) > self.atr_period + 5:
            self.candles.pop(0)

        # Calculate True Range (TR)
        if len(self.candles) == 1:
            tr = bar["high"] - bar["low"]
        else:
            prev_close = self.candles[-2]["close"]
            tr = max(
                bar["high"] - bar["low"],
                abs(bar["high"] - prev_close),
                abs(bar["low"] - prev_close)
            )

        self.tr_values.append(tr)
        if len(self.tr_values) > self.atr_period * 2:
            self.tr_values.pop(0)

    def get_atr(self):
        if len(self.tr_values) < self.atr_period:
            return self.fallback_atr
        return sum(self.tr_values[-self.atr_period:]) / self.atr_period

    def check_trade_risk(self, direction, price, swing_low, swing_high, tick_size):
        """
        Derives target SL and TP. Ensures Take Profit is placed just BEFORE 
        swing boundaries to optimize win rate. Calculates Risk-to-Reward.
        """
        atr = self.get_atr()
        
        # Volatility-adjusted offsets
        tp_offset = max(2 * tick_size, atr * 0.20)
        sl_offset = max(1 * tick_size, atr * 0.10)

        if direction == "BUY":
            sl_level = (swing_low - sl_offset) if swing_low else (price - atr)
            tp_level = (swing_high - tp_offset) if swing_high else (price + atr * 2.0)
            
            sl = max(sl_level, price - atr * 1.5)
            tp = min(tp_level, price + atr * 3.0)
            
            risk = price - sl
            reward = tp - price
        else:
            sl_level = (swing_high + sl_offset) if swing_high else (price + atr)
            tp_level = (swing_low + tp_offset) if swing_low else (price - atr * 2.0)
            
            sl = min(sl_level, price + atr * 1.5)
            tp = max(tp_level, price - atr * 3.0)
            
            risk = sl - price
            reward = price - tp

        if risk <= 0:
            return False, 0, 0, 0
            
        rr = reward / risk
        is_safe = rr >= 1.2  # Risk-reward minimum threshold
        
        return is_safe, round(sl, 5), round(tp, 5), round(rr, 2)



class ConsensusEngine:
    """
    Consensus Coordinator
    Orchestrates the decision loop between Structure, Microstructure, and Risk Agents.
    """
    def __init__(self, streamer):
        self.streamer = streamer

    def evaluate(self, symbol, current_price):
        sa = self.streamer.structure_agents.get(symbol)
        ma = self.streamer.microstructure_agents.get(symbol)
        ra = self.streamer.session_risk_agents.get(symbol)
        cfg = self.streamer.configs.get(symbol, {"tick_size": 0.01})
        
        if not sa or not ma or not ra:
            return

        # Fetch 5-minute Higher Timeframe (HTF) trend bias filter
        m5_agent = self.streamer.structure_agents_5m.get(symbol)
        m5_bias = m5_agent.get_trend_bias(current_price) if m5_agent else "NEUTRAL"

        zones = sa.get_structure_zones(current_price)
        cvd_div = ma.detect_cvd_divergence()
        
        # Check order book skews
        ba = self.streamer.last_bid_ask.get(symbol, {"bid_sz": 0, "ask_sz": 0})
        book_skew = ma.detect_imbalance(ba["bid_sz"], ba["ask_sz"])

        # ── BULLISH CONSENSUS ──
        # Price is sitting at Support FVG or rejected Swing Low, AND microstructure is bullish
        at_support = False
        if zones["support_fvg"]:
            # Price within 0.1% of FVG top or inside
            at_support = current_price <= zones["support_fvg"]["top"] and current_price >= zones["support_fvg"]["bottom"]
        elif zones["nearest_swing_low"]:
            at_support = abs(current_price - zones["nearest_swing_low"]) / current_price <= 0.0015

        bullish_trigger = (cvd_div == "BULLISH_DIVERGENCE") or (book_skew == "STRONG_BID")
        mtf_aligned = (m5_bias in ["BULLISH", "NEUTRAL"])
        
        if at_support and bullish_trigger and mtf_aligned:
            swing_l = zones["nearest_swing_low"] or (current_price - current_price * 0.001)
            swing_h = zones["nearest_swing_high"] or (current_price + current_price * 0.002)
            
            is_safe, sl, tp, rr = ra.check_trade_risk("BUY", current_price, swing_l, swing_h, cfg["tick_size"])
            if is_safe:
                self.streamer._trigger_alert(
                    ticker=symbol,
                    alert_type="CONSENSUS_BULLISH",
                    price=current_price,
                    message=f"Consensus BUY: Price retesting support at {current_price:.4f} with {cvd_div or book_skew} (HTF {m5_bias}). Target TP: {tp:.4f}, SL: {sl:.4f} (R:R {rr}).",
                    cvd=self.streamer.cvd_states[symbol],
                    imbalance=None
                )

        # ── BEARISH CONSENSUS ──
        at_resistance = False
        if zones["resistance_fvg"]:
            at_resistance = current_price >= zones["resistance_fvg"]["bottom"] and current_price <= zones["resistance_fvg"]["top"]
        elif zones["nearest_swing_high"]:
            at_resistance = abs(current_price - zones["nearest_swing_high"]) / current_price <= 0.0015

        bearish_trigger = (cvd_div == "BEARISH_DIVERGENCE") or (book_skew == "STRONG_ASK")
        mtf_aligned = (m5_bias in ["BEARISH", "NEUTRAL"])

        if at_resistance and bearish_trigger and mtf_aligned:
            swing_l = zones["nearest_swing_low"] or (current_price - current_price * 0.002)
            swing_h = zones["nearest_swing_high"] or (current_price + current_price * 0.001)
            
            is_safe, sl, tp, rr = ra.check_trade_risk("SELL", current_price, swing_l, swing_h, cfg["tick_size"])
            if is_safe:
                self.streamer._trigger_alert(
                    ticker=symbol,
                    alert_type="CONSENSUS_BEARISH",
                    price=current_price,
                    message=f"Consensus SELL: Price retesting resistance at {current_price:.4f} with {cvd_div or book_skew} (HTF {m5_bias}). Target TP: {tp:.4f}, SL: {sl:.4f} (R:R {rr}).",
                    cvd=self.streamer.cvd_states[symbol],
                    imbalance=None
                )


# ─────────────────────────────────────────────────────────────────────────────
# INGESTION STREAM CONTROLLER
# ─────────────────────────────────────────────────────────────────────────────
class DatabentoStreamer:
    def __init__(self, symbols, mock_mode=False, api_key=None, api_url=None):
        self.symbols = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        self.mock_mode = mock_mode
        self.api_key = api_key or os.environ.get("DATABENTO_API_KEY")
        self.api_url = api_url or os.environ.get("NEXTAUTH_URL") or "http://localhost:3000"
        self.running = False
        
        # Configuration details per symbol
        self.configs = {
            "GC.V.0": {"tick_size": 0.10, "spread": 0.20, "base_price": 2420.50, "alert_threshold": 8},
            "6E.V.0": {"tick_size": 0.00005, "spread": 0.00010, "base_price": 1.0925, "alert_threshold": 15}
        }
        
        # In-memory states per symbol
        self.cvd_states = {}       # symbol -> current CVD value
        self.profiles = {}         # symbol -> SessionVolumeProfile
        self.candles = {}          # symbol -> CandleBuilder
        self.structure_agents = {}  # symbol -> MarketStructureAgent
        self.structure_agents_5m = {} # symbol -> MarketStructureAgent (5m Structure)
        self.candles_1m_buffer = {}  # symbol -> list of completed 1m candles
        self.microstructure_agents = {} # symbol -> MicrostructureAgent
        self.session_risk_agents = {} # symbol -> SessionRiskAgent
        self.footprints = {}        # symbol -> price level buys/sells footprint
        self.last_bid_ask = {}     # symbol -> {"bid": float, "ask": float, "bid_sz": int, "ask_sz": int}
        self.mock_prices = {
            "GC.V.0": 2420.50,
            "6E.V.0": 1.0925
        }
        
        # Initializing states
        for sym in self.symbols:
            cfg = self.configs.get(sym, {"tick_size": 0.01})
            self.cvd_states[sym] = 0.0
            self.profiles[sym] = SessionVolumeProfile(tick_size=cfg["tick_size"])
            self.candles[sym] = CandleBuilder()
            self.structure_agents[sym] = MarketStructureAgent(
                fvg_min_pct=0.00025 if sym == "6E.V.0" else 0.0005
            )
            self.structure_agents_5m[sym] = MarketStructureAgent(
                fvg_min_pct=0.00025 if sym == "6E.V.0" else 0.0005
            )
            self.candles_1m_buffer[sym] = []
            self.microstructure_agents[sym] = MicrostructureAgent(
                block_size_threshold=cfg.get("alert_threshold", 10)
            )
            self.session_risk_agents[sym] = SessionRiskAgent(
                atr_period=14
            )
            self.footprints[sym] = {}
            self.last_bid_ask[sym] = {"bid": 0.0, "ask": 0.0, "bid_sz": 0, "ask_sz": 0}
            
        self.consensus_engine = ConsensusEngine(self)
        
        # Thread lock for database/HTTP sending operations
        self.lock = threading.Lock()
        
    def start(self):
        self.running = True
        
        if not self.api_key and not self.mock_mode:
            print("[Ingestion Engine] No DATABENTO_API_KEY found. Falling back to MOCK MODE.")
            self.mock_mode = True
            
        if not DATABENTO_AVAILABLE and not self.mock_mode:
            print("[Ingestion Engine] Databento SDK unavailable. Falling back to MOCK MODE.")
            self.mock_mode = True

        # Start 1-minute Candle Aggregator Timer Loop
        self.timer_thread = threading.Thread(target=self._run_candle_timer, daemon=True)
        self.timer_thread.start()

        if self.mock_mode:
            print(f"[Ingestion Engine] Mock Replay active for: {self.symbols}")
            self.threads = []
            for symbol in self.symbols:
                t = threading.Thread(target=self._run_mock_loop, args=(symbol,), daemon=True)
                self.threads.append(t)
                t.start()
        else:
            print(f"[Ingestion Engine] Databento Live active (CME Globex)...")
            self.thread = threading.Thread(target=self._run_live_loop, daemon=True)
            self.thread.start()
            
    def stop(self):
        self.running = False
        print("[Ingestion Engine] Stream halted.")

    # ── CLIENT HTTP UTILITIES ────────────────────────────────────────────────
    def _send_post(self, path, payload):
        """
        Sends payload to the Next.js server using built-in urllib (no requests dependency).
        """
        def send_task():
            try:
                url = f"{self.api_url}{path}"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    response.read()
            except Exception as e:
                # Silently catch server connections limits/timeouts during high-freq tick stream
                pass
        
        # Dispatch HTTP calls asynchronously to prevent stalling processing event loops
        threading.Thread(target=send_task, daemon=True).start()

    # ── ORDER FLOW ENGINE (AGGREGATOR & METRICS ENGINE) ──────────────────────
    def process_tick(self, symbol, event_type, data):
        """
        Injects a tick (trade or quote) into calculations, updates profile/CVD,
        generates entry alerts, and forwards the tick to the frontend stream bridge.
        """
        with self.lock:
            # 1. Forward raw ticks immediately to the stream API
            forward_payload = {"symbol": symbol, "event": event_type, **data}
            self._send_post("/api/futures/ticks", forward_payload)

            if event_type == "trade":
                price = data["price"]
                size = data["size"]
                side = data["side"] # 'B' (Buyer Aggressed), 'A' (Seller Aggressed), 'N' (None)
                cfg = self.configs.get(symbol, {"tick_size": 0.01, "alert_threshold": 10})

                # Accumulate Footprint Volume
                tick_size = cfg.get("tick_size", 0.01)
                rounded_price = round(round(price / tick_size) * tick_size, 5)
                if rounded_price not in self.footprints[symbol]:
                    self.footprints[symbol][rounded_price] = {"buy_vol": 0, "sell_vol": 0}
                if side == "B":
                    self.footprints[symbol][rounded_price]["buy_vol"] += size
                elif side == "A":
                    self.footprints[symbol][rounded_price]["sell_vol"] += size

                # A. Accumulate Session Volume Profile
                self.profiles[symbol].add_trade(price, size)

                # B. Update Candle Builder
                self.candles[symbol].add_tick(price, size)

                # C. Compute CVD
                multiplier = 1 if side == "B" else -1 if side == "A" else 0
                delta = size * multiplier
                self.cvd_states[symbol] += delta

                # D. Alert Check: Large Block Trades (Institutional Flow)
                cfg = self.configs.get(symbol, {"alert_threshold": 10})
                if size >= cfg["alert_threshold"]:
                    action_word = "Buying" if side == "B" else "Selling" if side == "A" else "Block"
                    self._trigger_alert(
                        ticker=symbol,
                        alert_type="INSTITUTIONAL_FLOW",
                        price=price,
                        message=f"Large Institutional {action_word} Imbalance detected: {size} contracts executed at {price}.",
                        cvd=self.cvd_states[symbol],
                        imbalance=None
                    )

                # E. Evaluate Consensus Loop
                self.consensus_engine.evaluate(symbol, price)

            elif event_type == "quote":
                # Cache bid/ask status for current imbalance computation
                self.last_bid_ask[symbol] = {
                    "bid": data["bid"],
                    "ask": data["ask"],
                    "bid_sz": data["bid_size"],
                    "ask_sz": data["ask_size"]
                }
                
                # Alert Check: Order Book Imbalance (Bid/Ask volume skew)
                bid_sz = data["bid_size"]
                ask_sz = data["ask_size"]
                total = bid_sz + ask_sz
                if total > 20:
                    imbalance = (bid_sz - ask_sz) / total
                    if abs(imbalance) >= 0.85: # 85%+ book imbalance
                        bias = "BULLISH" if imbalance > 0 else "BEARISH"
                        action = "Bid Support" if imbalance > 0 else "Ask Resistance"
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type=f"BOOK_IMBALANCE_{bias}",
                            price=(data["bid"] + data["ask"]) / 2,
                            message=f"Severe Order Book Imbalance ({abs(imbalance)*100:.1f}%): Strong institutional {action} skew at {data['bid']} / {data['ask']}.",
                            cvd=self.cvd_states[symbol],
                            imbalance=imbalance
                        )

    def _trigger_alert(self, ticker, alert_type, price, message, cvd, imbalance):
        """
        Sends alerts to the Next.js database and UI stream clients.
        """
        payload = {
            "ticker": ticker,
            "type": alert_type,
            "message": message,
            "price": float(price),
            "cvd": float(cvd),
            "imbalance": float(imbalance) if imbalance is not None else None
        }
        self._send_post("/api/futures/alerts", payload)

    # ── TIMER LOOP FOR 1-MINUTE CANDLE AGGREGATION ────────────────────────────
    def _run_candle_timer(self):
        while self.running:
            # Sync with the top of the minute boundary
            now = time.time()
            sleep_time = 60 - (now % 60)
            time.sleep(sleep_time)
            
            if not self.running:
                break
                
            timestamp_ms = int(time.time() * 1000)
            
            with self.lock:
                for symbol in self.symbols:
                    # Resolve candle metrics
                    fallback = self.mock_prices.get(symbol, 0.0) if self.mock_mode else 0.0
                    if not self.mock_mode and symbol in self.last_bid_ask:
                        fallback = self.last_bid_ask[symbol]["bid"]
                        
                    builder = self.candles[symbol]
                    bar = builder.get_bar(fallback_price=fallback)
                    
                    # Update Market Structure Agent
                    self.structure_agents[symbol].add_candle(bar)
                    
                    # Accumulate for 5-minute candle aggregation
                    self.candles_1m_buffer[symbol].append(bar)
                    if len(self.candles_1m_buffer[symbol]) == 5:
                        buf = self.candles_1m_buffer[symbol]
                        m5_bar = {
                            "open": buf[0]["open"],
                            "high": max(x["high"] for x in buf),
                            "low": min(x["low"] for x in buf),
                            "close": buf[-1]["close"],
                            "volume": sum(x["volume"] for x in buf)
                        }
                        self.structure_agents_5m[symbol].add_candle(m5_bar)
                        self.candles_1m_buffer[symbol] = [] # clear buffer
                    
                    # Update Microstructure Agent
                    self.microstructure_agents[symbol].add_candle_state(bar["close"], self.cvd_states[symbol])
                    
                    # Update Session & Risk Agent
                    self.session_risk_agents[symbol].add_candle(bar)

                    # E. Alert Check: Diagonal Footprint Imbalance
                    cfg = self.configs.get(symbol, {"tick_size": 0.01})
                    tick_sz = cfg.get("tick_size", 0.01)
                    buys, sells = self.microstructure_agents[symbol].calculate_diagonal_imbalances(
                        self.footprints[symbol], tick_sz
                    )
                    
                    if buys:
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type="FOOTPRINT_BUY_IMBALANCE",
                            price=max(buys),
                            message=f"Diagonal Footprint BUY Imbalance at {len(buys)} price levels. Max imbalance at {max(buys):.4f}.",
                            cvd=self.cvd_states[symbol],
                            imbalance=1.0
                        )
                    if sells:
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type="FOOTPRINT_SELL_IMBALANCE",
                            price=min(sells),
                            message=f"Diagonal Footprint SELL Imbalance at {len(sells)} price levels. Min imbalance at {min(sells):.4f}.",
                            cvd=self.cvd_states[symbol],
                            imbalance=-1.0
                        )
                    
                    # Reset Footprint for next 1m window
                    self.footprints[symbol] = {}
                    
                    # Resolve Session Profile boundaries
                    profile = self.profiles[symbol]
                    poc, vah, val = profile.calculate_value_area()

                    # F. Volume Profile LVN & Rejection Alerts
                    lvns = profile.get_lvns(pct=0.15)
                    near_lvn = [lvn for lvn in lvns if abs(bar["close"] - lvn) <= tick_sz]
                    if near_lvn:
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type="PROFILE_LVN_BREAKOUT",
                            price=near_lvn[0],
                            message=f"Price near Session Low Volume Node (LVN) at {near_lvn[0]:.4f}. High breakout potential.",
                            cvd=self.cvd_states[symbol],
                            imbalance=None
                        )
                    
                    # VAH/VAL Rejections
                    if bar["low"] <= val + tick_sz and bar["close"] > val:
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type="VALUE_AREA_VAL_REJECTION",
                            price=val,
                            message=f"Value Area Support Rejection: Price rejected Value Area Low (VAL) at {val:.4f}.",
                            cvd=self.cvd_states[symbol],
                            imbalance=1.0
                        )
                    elif bar["high"] >= vah - tick_sz and bar["close"] < vah:
                        self._trigger_alert(
                            ticker=symbol,
                            alert_type="VALUE_AREA_VAH_REJECTION",
                            price=vah,
                            message=f"Value Area Resistance Rejection: Price rejected Value Area High (VAH) at {vah:.4f}.",
                            cvd=self.cvd_states[symbol],
                            imbalance=-1.0
                        )
                    
                    # Resolve Imbalance skew
                    ba = self.last_bid_ask[symbol]
                    tot = ba["bid_sz"] + ba["ask_sz"]
                    imbalance = (ba["bid_sz"] - ba["ask_sz"]) / tot if tot > 0 else 0.0
                    
                    payload = {
                        "ticker": symbol,
                        "timestamp": timestamp_ms,
                        "open": float(bar["open"]),
                        "high": float(bar["high"]),
                        "low": float(bar["low"]),
                        "close": float(bar["close"]),
                        "volume": float(bar["volume"]),
                        "cvd": float(self.cvd_states[symbol]),
                        "poc": float(poc),
                        "vah": float(vah),
                        "val": float(val),
                        "imbalance": float(imbalance)
                    }
                    
                    # POST aggregated candle to DB history
                    self._send_post("/api/futures/order-flow", payload)
                    
                    # Reset Candle Builder for the next minute interval
                    self.candles[symbol] = CandleBuilder()

    # ── MOCK GENERATION REPLAY ENGINE ─────────────────────────────────────────
    def _run_mock_loop(self, symbol):
        cfg = self.configs.get(symbol, {"tick_size": 0.01, "spread": 0.02, "base_price": 100.0})
        last_price = cfg["base_price"]
        
        bid_size = random.randint(10, 50)
        ask_size = random.randint(10, 50)
        
        while self.running:
            time.sleep(random.uniform(0.15, 0.9))
            
            is_trade = random.random() > 0.4
            
            direction = random.choice([-1, 0, 1])
            price_change = direction * cfg["tick_size"]
            last_price = round(last_price + price_change, 5)
            
            bid_price = round(last_price - (cfg["spread"] / 2), 5)
            ask_price = round(last_price + (cfg["spread"] / 2), 5)
            
            # Form extreme imbalance scenarios occasionally for test triggers
            if random.random() > 0.95:
                # Force buy or sell imbalance size setups
                if random.random() > 0.5:
                    bid_size = random.randint(80, 150)
                    ask_size = random.randint(1, 5)
                else:
                    bid_size = random.randint(1, 5)
                    ask_size = random.randint(80, 150)
            else:
                bid_size = max(1, bid_size + random.choice([-5, -2, 0, 2, 5]))
                ask_size = max(1, ask_size + random.choice([-5, -2, 0, 2, 5]))
                
            if is_trade:
                # Force huge block execution sizes occasionally for alert test checks
                size = random.choice([random.randint(1, 4), random.randint(1, 4), random.randint(8, 18)])
                
                tot = bid_size + ask_size
                imbalance = (bid_size - ask_size) / tot if tot > 0 else 0
                buy_prob = 0.5 + (imbalance * 0.3)
                side = "B" if random.random() < buy_prob else "A"
                trade_price = ask_price if side == "B" else bid_price
                
                data = {"price": float(trade_price), "size": int(size), "side": side}
                self.process_tick(symbol, "trade", data)
                self.mock_prices[symbol] = float(trade_price)
            else:
                data = {
                    "bid": float(bid_price),
                    "ask": float(ask_price),
                    "bid_size": int(bid_size),
                    "ask_size": int(ask_size)
                }
                self.process_tick(symbol, "quote", data)

    # ── DATABENTO LIVE EVENT LOOP ────────────────────────────────────────────
    def _run_live_loop(self):
        try:
            client = db.Live(key=self.api_key)
            
            def on_record(record):
                if not self.running:
                    return
                
                rtype = getattr(record, "rtype", None)
                action = getattr(record, "action", None)
                
                # Resolve mapping symbol
                symbol = str(record.instrument_id)
                for sym in self.symbols:
                    if sym in str(record):
                        symbol = sym
                        break

                if action == "T" or rtype == 0:  # TRADE EVENT
                    price = float(record.price) * 1e-9
                    size = int(record.size)
                    side = str(record.side) if hasattr(record, "side") else "N"
                    
                    data = {"price": price, "size": size, "side": side}
                    self.process_tick(symbol, "trade", data)
                    
                elif rtype == 1:  # MBP-1 BOOK UPDATE
                    level = record.levels[0]
                    bid_px = float(level.bid_px) * 1e-9
                    ask_px = float(level.ask_px) * 1e-9
                    bid_sz = int(level.bid_sz)
                    ask_sz = int(level.ask_sz)
                    
                    if bid_px > 0 and ask_px > 0:
                        data = {
                            "bid": bid_px,
                            "ask": ask_px,
                            "bid_size": bid_sz,
                            "ask_size": ask_sz
                        }
                        self.process_tick(symbol, "quote", data)

            client.subscribe(
                dataset="GLBX.MDP3",
                schema="mbp-1",
                stype_in="continuous",
                symbols=self.symbols
            )
            
            client.add_callback(on_record)
            client.start()
            
            while self.running:
                time.sleep(0.5)
                
            client.stop()
            
        except Exception as e:
            print(f"[Ingestion Engine] Live loop connection error: {e}", file=sys.stderr)
            print("[Ingestion Engine] Falling back to MOCK MODE after 5 seconds...")
            time.sleep(5)
            self.mock_mode = True
            self.start()


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Asset Vector CME Futures Stream Processor")
    parser.add_argument("--symbol", type=str, default="GC.v.0,6E.v.0", help="Comma-separated continuous symbols")
    parser.add_argument("--mock", action="store_true", help="Force mock replay mode")
    parser.add_argument("--key", type=str, default=None, help="Databento API key")
    parser.add_argument("--url", type=str, default=None, help="Next.js API server base url")
    args = parser.parse_args()
    
    streamer = DatabentoStreamer(symbols=args.symbol, mock_mode=args.mock, api_key=args.key, api_url=args.url)
    
    try:
        streamer.start()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        streamer.stop()
        sys.exit(0)
