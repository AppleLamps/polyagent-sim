# PolyAgent Sim

A full-stack Polymarket Value-Betting AI Simulator. Uses AI (Grok-4 with live search) to analyze prediction markets and simulate trades with virtual USDC.

## Tech Stack

- **Backend:** FastAPI + SQLite + SQLAlchemy
- **Frontend:** React (Vite) + Tailwind CSS
- **AI:** xAI SDK v1.3.1+ (Grok-4-1-fast with Agentic Search)
- **Market Data:** Polymarket Gamma API (Read Only)

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your XAI_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at <http://localhost:5173>

## Features

- **Market Scanner:** Browse active Polymarket markets sorted by volume
- **AI Analysis:** Use Grok-4-1-fast with agentic web + X search to estimate probabilities
- **Edge Detection:** Compare AI estimates vs market prices to find value
- **Virtual Trading:** Simulate trades with $100,000 virtual USDC
- **Trade Log:** Track your simulated positions and P&L

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /markets | Fetch active Polymarket markets |
| POST | /analyze | Analyze a market with Grok-4 |
| POST | /simulate-trade | Place a simulated trade |
| GET | /portfolio | Get virtual balance and positions |
| POST | /reset-portfolio | Reset to initial $10,000 balance |

## Design System

- **Theme:** Strict Light Mode
- **Colors:** White/Light Gray backgrounds, Black text, Black accents
- **Style:** Professional, financial terminal, minimalist, flat design
