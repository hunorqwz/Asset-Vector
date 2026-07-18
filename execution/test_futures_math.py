#!/usr/bin/env python3
"""
Asset Vector - Session Volume Profile and Aggregation Math Verification
Runs localized test assertions to verify order flow calculation accuracy.
"""

import sys
from databento_stream import SessionVolumeProfile, CandleBuilder, MarketStructureAgent, MicrostructureAgent, SessionRiskAgent, ConsensusEngine

def test_session_volume_profile():
    print("[Test Math] Running SessionVolumeProfile tests...")
    
    # Tick size of 0.10
    vp = SessionVolumeProfile(tick_size=0.10)
    
    # Feed trades at different prices
    # Price 200.0 gets total volume 50 (Expected POC)
    vp.add_trade(200.0, 10)
    vp.add_trade(200.0, 40)
    
    # Price 199.9 gets volume 20
    vp.add_trade(199.9, 20)
    
    # Price 200.1 gets volume 15
    vp.add_trade(200.1, 15)
    
    # Price 199.8 gets volume 10
    vp.add_trade(199.8, 10)
    
    # Price 200.2 gets volume 5
    vp.add_trade(200.2, 5)
    
    # Total volume: 50 + 20 + 15 + 10 + 5 = 100
    assert vp.total_volume == 100, f"Expected 100, got {vp.total_volume}"
    
    poc = vp.get_poc()
    assert poc == 200.0, f"Expected POC 200.0, got {poc}"
    print(f"[Test Math] POC check passed: {poc}")

    # Value Area Calculation (70% of 100 = 70 contracts)
    # POC (200.0) volume = 50. Remaining target = 20.
    # Adjacent check: 199.9 (vol 20) vs 200.1 (vol 15).
    # Since 20 is larger, it expands to 199.9 first. Accumulated = 50 + 20 = 70.
    # 70 matches the target exactly. Value Area is [199.9, 200.0].
    # So VAL should be 199.9, VAH should be 200.0.
    poc_calc, vah, val = vp.calculate_value_area(value_area_pct=0.70)
    
    assert val == 199.9, f"Expected VAL 199.9, got {val}"
    assert vah == 200.0, f"Expected VAH 200.0, got {vah}"
    print(f"[Test Math] Value Area check passed: POC={poc_calc}, VAH={vah}, VAL={val}")


def test_candle_builder():
    print("[Test Math] Running CandleBuilder tests...")
    cb = CandleBuilder()
    
    cb.add_tick(100.0, 5)
    cb.add_tick(102.5, 10)
    cb.add_tick(99.0, 2)
    cb.add_tick(101.0, 8)
    
    bar = cb.get_bar()
    
    assert bar["open"] == 100.0, f"Expected Open 100.0, got {bar['open']}"
    assert bar["high"] == 102.5, f"Expected High 102.5, got {bar['high']}"
    assert bar["low"] == 99.0, f"Expected Low 99.0, got {bar['low']}"
    assert bar["close"] == 101.0, f"Expected Close 101.0, got {bar['close']}"
    assert bar["volume"] == 25, f"Expected Volume 25, got {bar['volume']}"
    print("[Test Math] CandleBuilder check passed.")


def test_market_structure_agent():
    print("[Test Math] Running MarketStructureAgent tests...")
    
    agent = MarketStructureAgent(fvg_min_pct=0.001)
    
    # 1. Test FVG Detection (Bullish FVG)
    # Candle 1: High 10.0
    agent.add_candle({"open": 9.0, "high": 10.0, "low": 8.5, "close": 9.8, "volume": 10})
    # Candle 2: Big upward candle (moves from 9.8 to 12.0)
    agent.add_candle({"open": 9.8, "high": 12.0, "low": 9.8, "close": 11.8, "volume": 20})
    # Candle 3: Low of candle 3 is 10.5 (which is higher than Candle 1 High of 10.0)
    agent.add_candle({"open": 11.8, "high": 13.0, "low": 10.5, "close": 12.5, "volume": 15})
    
    assert len(agent.unmitigated_fvgs) == 1, f"Expected 1 FVG, got {len(agent.unmitigated_fvgs)}"
    fvg = agent.unmitigated_fvgs[0]
    assert fvg["type"] == "BULLISH", "Expected BULLISH FVG"
    assert fvg["top"] == 10.5, f"Expected FVG Top 10.5, got {fvg['top']}"
    assert fvg["bottom"] == 10.0, f"Expected FVG Bottom 10.0, got {fvg['bottom']}"
    print("[Test Math] FVG Detection passed.")

    # 2. Test FVG Mitigation (Price falls to 9.5, filling the gap)
    agent.add_candle({"open": 12.5, "high": 12.5, "low": 9.5, "close": 9.7, "volume": 30})
    assert len(agent.unmitigated_fvgs) == 0, f"Expected FVG to be mitigated, but got {len(agent.unmitigated_fvgs)}"
    print("[Test Math] FVG Mitigation passed.")

    # 3. Test Swing Points (5-candle pattern)
    # Reset agent
    agent = MarketStructureAgent()
    # Highs: 10, 11, 15, 12, 10 -> Middle candle (15) is a swing high
    agent.add_candle({"open": 9, "high": 10, "low": 8, "close": 9, "volume": 5})
    agent.add_candle({"open": 9, "high": 11, "low": 8, "close": 10, "volume": 5})
    agent.add_candle({"open": 10, "high": 15, "low": 9, "close": 14, "volume": 5})
    agent.add_candle({"open": 14, "high": 12, "low": 11, "close": 11.5, "volume": 5})
    agent.add_candle({"open": 11.5, "high": 10, "low": 9, "close": 9.5, "volume": 5})
    
    assert len(agent.swing_highs) == 1, f"Expected 1 swing high, got {len(agent.swing_highs)}"
    assert agent.swing_highs[0] == 15.0, f"Expected swing high of 15.0, got {agent.swing_highs[0]}"
    print("[Test Math] Swing Point detection passed.")


def test_microstructure_agent():
    print("[Test Math] Running MicrostructureAgent tests...")
    
    agent = MicrostructureAgent()
    
    # 1. Test CVD Divergence
    # Bullish Divergence: Price goes down, CVD goes up
    # Add 4 steady candles
    agent.add_candle_state(100.0, 1000)
    agent.add_candle_state(99.8, 1050)
    agent.add_candle_state(99.6, 1100)
    agent.add_candle_state(99.4, 1150)
    # 5th candle: price falls to 99.0 but CVD leaps to 1200 (+200 diff)
    agent.add_candle_state(99.0, 1200)
    
    div = agent.detect_cvd_divergence()
    assert div == "BULLISH_DIVERGENCE", f"Expected BULLISH_DIVERGENCE, got {div}"
    print("[Test Math] CVD Divergence passed.")

    # 2. Test Imbalance
    imb = agent.detect_imbalance(5, 95)
    assert imb == "STRONG_ASK", f"Expected STRONG_ASK, got {imb}"
    
    imb2 = agent.detect_imbalance(95, 2)
    assert imb2 == "STRONG_BID", f"Expected STRONG_BID, got {imb2}"
    print("[Test Math] Order Book Imbalance checks passed.")


def test_risk_and_consensus_agents():
    print("[Test Math] Running SessionRiskAgent tests...")
    
    agent = SessionRiskAgent(fallback_atr=1.5)
    
    # Buy scenario
    is_safe, sl, tp, rr = agent.check_trade_risk(
        direction="BUY", 
        price=100.0, 
        swing_low=99.0, 
        swing_high=102.0, 
        tick_size=0.1
    )
    
    assert is_safe is True, "Expected safe trade risk validation"
    assert sl == 98.85, f"Expected SL 98.85, got {sl}"
    assert tp == 101.7, f"Expected TP 101.7, got {tp}"
    assert rr == 1.48, f"Expected R:R 1.48, got {rr}"
    print("[Test Math] Fallback Risk calculations passed.")


def test_atr_volatility_risk():
    print("[Test Math] Running ATR Volatility Risk tests...")
    agent = SessionRiskAgent(atr_period=14)
    
    # Feed 14 candles with High-Low range of exactly 2.0
    for i in range(15):
        agent.add_candle({"high": 102.0, "low": 100.0, "close": 101.0})
        
    atr = agent.get_atr()
    assert atr == 2.0, f"Expected ATR 2.0, got {atr}"
    
    is_safe, sl, tp, rr = agent.check_trade_risk(
        direction="BUY", 
        price=100.0, 
        swing_low=99.0, 
        swing_high=102.0, 
        tick_size=0.1
    )
    
    # For ATR = 2.0:
    # tp_offset = max(0.2, 0.4) = 0.4. tp_level = 102.0 - 0.4 = 101.6
    # sl_offset = max(0.1, 0.2) = 0.2. sl_level = 99.0 - 0.2 = 98.8
    # sl = max(98.8, 97.0) = 98.8
    # tp = min(101.6, 106.0) = 101.6
    # risk = 1.2, reward = 1.6, rr = 1.33
    assert is_safe is True
    assert sl == 98.8, f"Expected SL 98.8, got {sl}"
    assert tp == 101.6, f"Expected TP 101.6, got {tp}"
    assert rr == 1.33, f"Expected R:R 1.33, got {rr}"
    print("[Test Math] ATR Volatility Risk checks passed.")


def test_mtf_trend_bias():
    print("[Test Math] Running MarketStructureAgent get_trend_bias tests...")
    agent = MarketStructureAgent(fvg_min_pct=0.001)
    
    # 1. Neutral bias at start
    assert agent.get_trend_bias(100.0) == "NEUTRAL"
    
    # 2. Bullish FVG bias check
    agent.add_candle({"open": 9.0, "high": 10.0, "low": 8.5, "close": 9.8, "volume": 10})
    agent.add_candle({"open": 9.8, "high": 12.0, "low": 9.8, "close": 11.8, "volume": 20})
    agent.add_candle({"open": 11.8, "high": 13.0, "low": 10.5, "close": 12.5, "volume": 15})
    
    bias = agent.get_trend_bias(12.0)
    assert bias == "BULLISH", f"Expected BULLISH FVG bias, got {bias}"
    print("[Test Math] MTF Trend Bias check passed.")


def test_diagonal_footprint_imbalance():
    print("[Test Math] Running Footprint diagonal imbalance tests...")
    agent = MicrostructureAgent()
    
    # Setup footprint dictionary
    footprint = {
        100.0: {"buy_vol": 30, "sell_vol": 10},
        99.9: {"buy_vol": 5, "sell_vol": 10},
        99.8: {"buy_vol": 10, "sell_vol": 50},
        99.7: {"buy_vol": 2, "sell_vol": 2}
    }
    
    buys, sells = agent.calculate_diagonal_imbalances(footprint, tick_size=0.1, min_volume=5, ratio=3.0)
    
    # Assertions
    assert 100.0 in buys, f"Expected 100.0 in buying imbalances, got {buys}"
    assert 99.8 in sells, f"Expected 99.8 in selling imbalances, got {sells}"
    print("[Test Math] Footprint diagonal imbalances passed.")


def test_lvn_and_rejections():
    print("[Test Math] Running Volume Profile LVN tests...")
    
    vp = SessionVolumeProfile(tick_size=0.1)
    
    # POC at 100.0 (vol 100)
    vp.add_trade(100.0, 100)
    # Vol 80 at 100.1
    vp.add_trade(100.1, 80)
    # Vol 5 at 100.2 (LVN since 5 < 15% of 100)
    vp.add_trade(100.2, 5)
    # Vol 60 at 100.3
    vp.add_trade(100.3, 60)
    
    lvns = vp.get_lvns(pct=0.15)
    assert 100.2 in lvns, f"Expected 100.2 in LVN list, got {lvns}"
    print("[Test Math] Volume Profile LVN checks passed.")


if __name__ == "__main__":
    try:
        test_session_volume_profile()
        test_candle_builder()
        test_market_structure_agent()
        test_microstructure_agent()
        test_risk_and_consensus_agents()
        test_atr_volatility_risk()
        test_mtf_trend_bias()
        test_diagonal_footprint_imbalance()
        test_lvn_and_rejections()
        print("[Test Math] ALL MATHEMATICAL TESTS COMPLETED SUCCESSFULLY.")
        sys.exit(0)
    except AssertionError as e:
        print(f"[Test Math] ASSERTION ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[Test Math] SYSTEM ERROR: {e}", file=sys.stderr)
        sys.exit(1)
