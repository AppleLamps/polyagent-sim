# PolyAgent Sim

An AI-powered prediction market simulator that analyzes Polymarket opportunities using Grok-4 with live web search.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)

## Overview

PolyAgent Sim combines real-time market data from Polymarket with AI-driven analysis to identify value betting opportunities. Trade with $100,000 in virtual USDC to test strategies without risk.

### Key Features

- **Real-Time Market Data** — Live prices from Polymarket Gamma API
- **AI-Powered Analysis** — Grok-4 with agentic web + X search for probability estimation
- **Edge Detection** — Automatically calculate edge between AI estimates and market prices
- **Paper Trading** — Simulate trades with virtual balance tracking
- **Portfolio Management** — Track positions, P&L, and trade history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | React 18, Vite, Tailwind CSS |
| AI | xAI Grok-4 with Live Search |
| Data | Polymarket Gamma API |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- xAI API Key ([Get one here](https://x.ai))

### Installation

**1. Clone and setup backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**2. Configure environment:**

```bash
cp .env.example .env
# Add your XAI_API_KEY to .env
```

**3. Start the backend:**

```bash
uvicorn app.main:app --reload --port 8000
```

**4. Setup and start frontend:**

```bash
cd frontend
npm install
npm run dev
```

**5. Open the app:** [http://localhost:5173](http://localhost:5173)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/markets` | Fetch active markets (cached 60s) |
| `POST` | `/analyze` | AI analysis with probability estimate |
| `POST` | `/simulate-trade` | Execute a paper trade |
| `GET` | `/portfolio` | Current balance and positions |
| `POST` | `/update-prices` | Refresh prices for active trades |
| `POST` | `/reset-portfolio` | Reset to $100,000 balance |

## Project Structure

```text
polyagent-sim/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── config.py        # Settings & validation
│   │   └── services/        # xAI & Polymarket integrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api.js           # API client
│   │   └── App.jsx          # Main application
│   └── package.json
└── README.md
```

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI API key for Grok-4 | ✅ |
| `DATABASE_URL` | SQLite database path | Default: `./polyagent.db` |
| `INITIAL_BALANCE` | Starting virtual balance | Default: `100000` |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | Default: `http://localhost:8000` |

## License

MIT License — see [LICENSE](LICENSE) for details.
