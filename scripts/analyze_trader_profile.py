#!/usr/bin/env python3
"""
Trader Profile Analysis - Based on Real BitMEX Trading Data
"""

import csv
import json
from datetime import datetime, timedelta
from collections import defaultdict
import os

def load_orders(filepath):
    """Load order history from CSV"""
    orders = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            orders.append(row)
    return orders

def load_wallet_history(filepath):
    """Load wallet history from CSV"""
    history = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            history.append(row)
    return history

def load_executions(filepath):
    """Load execution history from CSV"""
    executions = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            executions.append(row)
    return executions

def analyze_trader_profile(orders, wallet_history, executions):
    """
    Analyze trader profile based on trading data
    Returns comprehensive trader profile analysis results
    """

    profile = {
        "basic_stats": {},
        "risk_preference": {},
        "trading_frequency": {},
        "discipline_scores": {},
        "trading_patterns": {},
        "summary": {}
    }

    # ========== Basic Statistics ==========
    total_orders = len(orders)
    filled_orders = [o for o in orders if o.get('ordStatus') == 'Filled']
    canceled_orders = [o for o in orders if o.get('ordStatus') == 'Canceled']

    # Order type statistics
    order_types = defaultdict(int)
    for o in orders:
        order_types[o.get('ordType', 'Unknown')] += 1

    profile["basic_stats"] = {
        "total_orders": total_orders,
        "filled_orders": len(filled_orders),
        "canceled_orders": len(canceled_orders),
        "fill_rate": round(len(filled_orders) / total_orders * 100, 2) if total_orders > 0 else 0,
        "order_types": dict(order_types)
    }

    # ========== Trading Time Analysis ==========
    if filled_orders:
        timestamps = []
        for o in filled_orders:
            try:
                ts = datetime.fromisoformat(o.get('timestamp', '').replace('Z', '+00:00'))
                timestamps.append(ts)
            except:
                pass

        if timestamps:
            # Hourly distribution
            hour_distribution = defaultdict(int)
            for ts in timestamps:
                hour_distribution[ts.hour] += 1

            # Weekly distribution
            weekday_distribution = defaultdict(int)
            for ts in timestamps:
                weekday_distribution[ts.weekday()] += 1

            # Find most active periods
            most_active_hour = max(hour_distribution, key=hour_distribution.get)
            most_active_day = max(weekday_distribution, key=weekday_distribution.get)

            profile["trading_patterns"]["hour_distribution"] = dict(hour_distribution)
            profile["trading_patterns"]["weekday_distribution"] = dict(weekday_distribution)
            profile["trading_patterns"]["most_active_hour"] = most_active_hour
            profile["trading_patterns"]["most_active_day"] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][most_active_day]

    # ========== Risk Preference Analysis ==========
    # Analyze order sizes
    order_sizes = []
    for o in filled_orders:
        try:
            size = abs(float(o.get('orderQty', 0)))
            if size > 0:
                order_sizes.append(size)
        except:
            pass

    if order_sizes:
        avg_order_size = sum(order_sizes) / len(order_sizes)
        max_order_size = max(order_sizes)
        min_order_size = min(order_sizes)

        # Large order ratio (>10000)
        large_orders = [s for s in order_sizes if s > 10000]
        large_order_ratio = len(large_orders) / len(order_sizes) * 100

        # Risk score (1-10)
        # Based on large order ratio and order size volatility
        risk_score = min(10, max(1, int(large_order_ratio / 5 + 3)))

        profile["risk_preference"] = {
            "avg_order_size": round(avg_order_size, 2),
            "max_order_size": max_order_size,
            "min_order_size": min_order_size,
            "large_order_ratio": round(large_order_ratio, 2),
            "risk_score": risk_score,
            "risk_level": "High Risk" if risk_score >= 7 else "Medium Risk" if risk_score >= 4 else "Low Risk"
        }

    # ========== Trading Frequency Analysis ==========
    if timestamps and len(timestamps) >= 2:
        # Calculate trading span
        first_trade = min(timestamps)
        last_trade = max(timestamps)
        trading_days = (last_trade - first_trade).days or 1

        # Daily average trades
        daily_trades = len(filled_orders) / trading_days

        # Calculate trade intervals
        sorted_ts = sorted(timestamps)
        intervals = []
        for i in range(1, len(sorted_ts)):
            interval = (sorted_ts[i] - sorted_ts[i-1]).total_seconds() / 60  # minutes
            if interval > 0 and interval < 60 * 24 * 7:  # exclude outliers
                intervals.append(interval)

        avg_interval = sum(intervals) / len(intervals) if intervals else 0

        # Frequency score
        frequency_score = min(10, max(1, int(daily_trades / 5)))

        profile["trading_frequency"] = {
            "total_trading_days": trading_days,
            "daily_avg_trades": round(daily_trades, 2),
            "avg_trade_interval_minutes": round(avg_interval, 2),
            "frequency_score": frequency_score,
            "frequency_level": "High Frequency" if frequency_score >= 7 else "Medium Frequency" if frequency_score >= 4 else "Low Frequency"
        }

    # ========== Discipline Score ==========
    # Based on limit/market order ratio
    limit_orders = order_types.get('Limit', 0)
    market_orders = order_types.get('Market', 0)
    total_lm = limit_orders + market_orders

    limit_ratio = limit_orders / total_lm * 100 if total_lm > 0 else 0

    # Discipline score - higher limit order ratio = more disciplined
    discipline_score = min(10, max(1, int(limit_ratio / 10)))

    # Patience score - based on cancel order ratio (fewer cancels = more patient)
    cancel_ratio = len(canceled_orders) / total_orders * 100 if total_orders > 0 else 0
    patience_score = min(10, max(1, int(10 - cancel_ratio / 5)))

    profile["discipline_scores"] = {
        "limit_order_ratio": round(limit_ratio, 2),
        "cancel_ratio": round(cancel_ratio, 2),
        "discipline_score": discipline_score,
        "patience_score": patience_score,
        "discipline_level": "Highly Disciplined" if discipline_score >= 7 else "Moderately Disciplined" if discipline_score >= 4 else "Needs Improvement",
        "patience_level": "Very Patient" if patience_score >= 7 else "Moderately Patient" if patience_score >= 4 else "Impulsive"
    }

    # ========== PnL Analysis (from wallet history) ==========
    pnl_entries = [w for w in wallet_history if w.get('transactType') == 'RealisedPNL']

    if pnl_entries:
        pnl_amounts = []
        for entry in pnl_entries:
            try:
                amount = float(entry.get('amount', 0)) / 100000000  # Convert satoshis to BTC
                pnl_amounts.append(amount)
            except:
                pass

        if pnl_amounts:
            total_pnl = sum(pnl_amounts)
            winning_trades = [p for p in pnl_amounts if p > 0]
            losing_trades = [p for p in pnl_amounts if p < 0]

            win_rate = len(winning_trades) / len(pnl_amounts) * 100 if pnl_amounts else 0
            avg_win = sum(winning_trades) / len(winning_trades) if winning_trades else 0
            avg_loss = abs(sum(losing_trades) / len(losing_trades)) if losing_trades else 0

            # Profit factor
            profit_factor = avg_win / avg_loss if avg_loss > 0 else float('inf')

            profile["pnl_analysis"] = {
                "total_pnl_btc": round(total_pnl, 8),
                "total_trades": len(pnl_amounts),
                "winning_trades": len(winning_trades),
                "losing_trades": len(losing_trades),
                "win_rate": round(win_rate, 2),
                "avg_win_btc": round(avg_win, 8),
                "avg_loss_btc": round(avg_loss, 8),
                "profit_factor": round(profit_factor, 2) if profit_factor != float('inf') else "∞"
            }

    # ========== Summary ==========
    risk_level = profile.get("risk_preference", {}).get("risk_level", "Unknown")
    freq_level = profile.get("trading_frequency", {}).get("frequency_level", "Unknown")
    discipline_level = profile.get("discipline_scores", {}).get("discipline_level", "Unknown")

    trader_type = "Unknown"
    if "High" in freq_level and "High" in risk_level:
        trader_type = "Aggressive Day Trader"
    elif "High" in freq_level and "Low" in risk_level:
        trader_type = "Conservative Day Trader"
    elif "Low" in freq_level and "High" in risk_level:
        trader_type = "Bold Swing Trader"
    elif "Low" in freq_level and "Low" in risk_level:
        trader_type = "Conservative Value Investor"
    elif "Medium" in freq_level:
        trader_type = "Balanced Short-term Trader"
    else:
        trader_type = "Comprehensive Trader"

    profile["summary"] = {
        "trader_type": trader_type,
        "risk_level": risk_level,
        "frequency_level": freq_level,
        "discipline_level": discipline_level,
        "overall_score": round(
            (profile.get("risk_preference", {}).get("risk_score", 5) +
             profile.get("trading_frequency", {}).get("frequency_score", 5) +
             profile.get("discipline_scores", {}).get("discipline_score", 5) +
             profile.get("discipline_scores", {}).get("patience_score", 5)) / 4,
            1
        ),
        "advice": [
            "Continue maintaining limit order trading habits to improve execution efficiency" if limit_ratio > 70 else "Consider increasing limit order usage to reduce slippage costs",
            "Trading rhythm is stable, maintain current strategy" if daily_trades < 50 else "Consider reducing trading frequency to improve quality per trade",
            "Risk control is good" if profile.get("risk_preference", {}).get("risk_score", 5) < 5 else "Pay attention to controlling position sizes and diversifying risk"
        ]
    }

    return profile

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print("═" * 60)
    print("        Trader Profile Analysis")
    print("═" * 60)
    print()

    # Load data
    orders_file = os.path.join(base_dir, 'bitmex_orders.csv')
    wallet_file = os.path.join(base_dir, 'bitmex_wallet_history.csv')
    executions_file = os.path.join(base_dir, 'bitmex_executions.csv')

    print("Loading data...")
    orders = load_orders(orders_file) if os.path.exists(orders_file) else []
    wallet_history = load_wallet_history(wallet_file) if os.path.exists(wallet_file) else []
    executions = load_executions(executions_file) if os.path.exists(executions_file) else []

    print(f"  Orders: {len(orders)}")
    print(f"  Wallet History: {len(wallet_history)}")
    print(f"  Executions: {len(executions)}")
    print()

    # Analyze
    print("Analyzing trader profile...")
    profile = analyze_trader_profile(orders, wallet_history, executions)

    # Print results
    print()
    print("═" * 60)
    print("                 Analysis Results")
    print("═" * 60)

    print("\n📊 Basic Statistics")
    print("─" * 40)
    bs = profile["basic_stats"]
    print(f"  Total Orders: {bs['total_orders']}")
    print(f"  Filled Orders: {bs['filled_orders']}")
    print(f"  Canceled Orders: {bs['canceled_orders']}")
    print(f"  Fill Rate: {bs['fill_rate']}%")
    print(f"  Order Types: {bs['order_types']}")

    print("\n🎯 Risk Preference")
    print("─" * 40)
    rp = profile.get("risk_preference", {})
    print(f"  Average Order Size: {rp.get('avg_order_size', 'N/A')} USD")
    print(f"  Maximum Order: {rp.get('max_order_size', 'N/A')} USD")
    print(f"  Large Order Ratio: {rp.get('large_order_ratio', 'N/A')}%")
    print(f"  Risk Score: {rp.get('risk_score', 'N/A')}/10")
    print(f"  Risk Level: {rp.get('risk_level', 'N/A')}")

    print("\n⏱️ Trading Frequency")
    print("─" * 40)
    tf = profile.get("trading_frequency", {})
    print(f"  Trading Days: {tf.get('total_trading_days', 'N/A')} days")
    print(f"  Daily Average Trades: {tf.get('daily_avg_trades', 'N/A')}")
    print(f"  Average Interval: {tf.get('avg_trade_interval_minutes', 'N/A')} minutes")
    print(f"  Frequency Score: {tf.get('frequency_score', 'N/A')}/10")
    print(f"  Frequency Level: {tf.get('frequency_level', 'N/A')}")

    print("\n🧠 Discipline Assessment")
    print("─" * 40)
    ds = profile.get("discipline_scores", {})
    print(f"  Limit Order Ratio: {ds.get('limit_order_ratio', 'N/A')}%")
    print(f"  Cancel Ratio: {ds.get('cancel_ratio', 'N/A')}%")
    print(f"  Discipline Score: {ds.get('discipline_score', 'N/A')}/10")
    print(f"  Patience Score: {ds.get('patience_score', 'N/A')}/10")
    print(f"  Discipline Level: {ds.get('discipline_level', 'N/A')}")
    print(f"  Patience Level: {ds.get('patience_level', 'N/A')}")

    if "pnl_analysis" in profile:
        print("\n💰 PnL Analysis")
        print("─" * 40)
        pnl = profile["pnl_analysis"]
        print(f"  Total PnL: {pnl['total_pnl_btc']} BTC")
        print(f"  Total Trades: {pnl['total_trades']}")
        print(f"  Winning Trades: {pnl['winning_trades']}")
        print(f"  Losing Trades: {pnl['losing_trades']}")
        print(f"  Win Rate: {pnl['win_rate']}%")
        print(f"  Average Win: {pnl['avg_win_btc']} BTC")
        print(f"  Average Loss: {pnl['avg_loss_btc']} BTC")
        print(f"  Profit Factor: {pnl['profit_factor']}")

    print("\n📋 Trading Patterns")
    print("─" * 40)
    tp = profile.get("trading_patterns", {})
    print(f"  Most Active Hour: {tp.get('most_active_hour', 'N/A')}:00 UTC")
    print(f"  Most Active Day: {tp.get('most_active_day', 'N/A')}")

    print("\n🏆 Summary")
    print("─" * 40)
    summary = profile["summary"]
    print(f"  Trader Type: {summary['trader_type']}")
    print(f"  Overall Score: {summary['overall_score']}/10")
    print(f"  Risk Level: {summary['risk_level']}")
    print(f"  Frequency Level: {summary['frequency_level']}")
    print(f"  Discipline Level: {summary['discipline_level']}")

    print("\n💡 Advice")
    print("─" * 40)
    for i, advice in enumerate(summary['advice'], 1):
        print(f"  {i}. {advice}")

    print()
    print("═" * 60)

    # Save to JSON
    output_file = os.path.join(base_dir, 'trader_profile_analysis.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Analysis results saved to: {output_file}")

if __name__ == '__main__':
    main()
