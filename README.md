# Trader Role-Play Analyzer

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

Intelligent analysis platform for learning trading strategies by role-playing as top traders.

## ✨ Core Features

### 1. Role-Play Learning
- Guess the trader's next move based on market conditions without knowing their actual operations
- Real-time scoring system to record your judgment accuracy
- Provide trader's thought process hints to help understand decision logic
- Auto-play mode with adjustable speed

### 2. AI Action Prediction
- Intelligent prediction based on trader's historical patterns
- Display similar historical situations and their outcomes
- Pattern statistical analysis, including operation distribution and average PnL
- Prediction confidence and detailed reasons

### 3. Trader Profile Analysis
- Risk preference assessment (Aggressive/Steady/Conservative)
- Trading frequency type (Scalping/Intraday/Swing/Trend)
- Trading discipline and patience score
- Matching suitable learning groups
- Core strengths and areas for improvement

### 4. Complete Data Visualization
- 📊 Multi-period K-line charts (1m ~ 1w)
- 🎯 Trade markers displayed in real-time on the chart
- 📈 Position history tracking
- 💰 Equity curve and monthly PnL analysis

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Charts**: Lightweight Charts, Recharts
- **Backend**: Python FastAPI (Independent Service)
- **Exchange**: Bitmex API (using ccxt)

## 🚀 Quick Start

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Start Backend Service

```bash
cd ../backend
pip install -r requirements.txt
python main.py
# Backend runs on http://localhost:8000
```

### 3. Start Frontend Development Server

```bash
cd ../frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Configure Environment Variables (Optional)

Create a `.env.local` file:

```
BACKEND_URL=http://localhost:8000
```

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── backend/          # Backend API Proxy
│   │   │   ├── test/         # Connection Test
│   │   │   ├── predict/      # AI Prediction
│   │   │   └── profile/      # Profile Analysis
│   │   ├── trades/           # Trade Data
│   │   └── ohlcv/            # OHLCV Data
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx         # Main Dashboard
│   ├── TraderRolePlay.tsx    # Role-Play Learning Mode
│   ├── AIPrediction.tsx      # AI Prediction Panel
│   ├── TraderProfile.tsx     # Trader Profile
│   ├── TVChart.tsx           # K-line Chart
│   ├── StatsOverview.tsx     # Stats Overview
│   ├── EquityCurve.tsx       # Equity Curve
│   ├── MonthlyPnLChart.tsx   # Monthly PnL
│   └── ...
└── lib/
    ├── types.ts              # Type Definitions
    └── data_loader.ts        # Data Loader
```

## Data Files

> **Note**: This project requires trading data to run.

### Required Data Files

#### 1. Trade Data (Root Directory)

```
frontend/
├── bitmex_executions.csv      # Execution Records (Required)
├── bitmex_trades.csv          # Trade Records
├── bitmex_orders.csv          # Order History
├── bitmex_wallet_history.csv  # Wallet History
└── bitmex_account_summary.json # Account Summary
```

#### 2. OHLCV Data (data/ohlcv Directory)

```
frontend/data/ohlcv/
├── XBTUSD_1m.csv      # BTC 1-minute K-line
├── XBTUSD_5m.csv      # BTC 5-minute K-line
├── XBTUSD_1h.csv      # BTC 1-hour K-line
├── XBTUSD_1d.csv      # BTC Daily K-line
├── ETHUSD_1m.csv      # ETH 1-minute K-line
└── ...
```

## License

MIT License
