# OpenStream 🎥⚡

> **A Semi-Decentralized Web3 Video Streaming & Creator Monetization Platform**  
> Powered by **Algorand Blockchain**, **IPFS Decentralized Storage**, **FastAPI**, and **React 19**.

[![Algorand](https://img.shields.io/badge/Blockchain-Algorand-black?logo=algorand)](https://algorand.co/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-TailwindCSS%20v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Language-Python%203.12+-3776AB?logo=python&logoColor=white)](https://python.org/)

---

## 🌟 Overview

**OpenStream** reimagines online video streaming by bridging traditional Web2 media user experience with Web3 decentralization. Traditional platforms monopolize monetization policies, algorithmic distribution, and creator revenue. 

OpenStream implements a **semi-decentralized architecture** where:
* **High-Speed Infrastructure**: Frontend and metadata APIs use responsive, modern technologies (React, FastAPI, PostgreSQL).
* **Decentralized Media**: Video files and thumbnails are pinned and addressed via **IPFS** content hashes (CIDs).
* **Sovereign Monetization**: Creator payouts, tips, and settlement ledgers are verified and transacted on the **Algorand Blockchain** using **Pera Wallet**.

---

## 🚀 Key Features

* **Decentralized Video Hosting**: IPFS content addressable storage prevents unauthorized takedowns and single-point data loss.
* **Algorand Micro-Payouts & Tipping**: Instant, low-fee, on-chain crypto rewards sent directly to creator wallets.
* **Pera Wallet & Cryptographic Auth**: Seamless Web3 wallet connection alongside secure JWT/OAuth session management.
* **Creator Studio Suite**: Full studio dashboard for managing videos, inspecting on-chain earnings, tracking view metrics, and updating metadata.
* **On-Chain Transparency Explorer**: Built-in verification view for auditing transaction IDs and smart contract reward distribution on Algorand.
* **Premium Dark Mode UI**: Built with React 19, Tailwind CSS v4, Lucide icons, and micro-animations.

---

## 🏗️ Architecture

```text
                     +-----------------------------------+
                     |            OPENSTREAM             |
                     +-----------------------------------+
                                       |
        +------------------------------+------------------------------+
        |                              |                              |
        v                              v                              v
+---------------+              +---------------+              +---------------+
|   FRONTEND    |              |    BACKEND    |              |     WEB3      |
|  (React 19)   | <----------> |   (FastAPI)   | <----------> |  (Algorand &  |
|  Tailwind CSS |   REST API   |  PostgreSQL   |   On-Chain   |     IPFS)     |
|  Pera Wallet  |              |  SQLAlchemy   |  Settlement  |  Pera Connect |
+---------------+              +---------------+              +---------------+
```

---

## 📁 Repository Structure

```text
openstream/
├── backend/                  # FastAPI REST API & Data Engine
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── api/              # REST API route controllers & dependencies
│   │   ├── core/             # Security, JWT, bcrypt hashing
│   │   ├── db/               # PostgreSQL / SQLAlchemy session setup
│   │   ├── models/           # ORM entities (Users, Videos, Views, Rewards)
│   │   ├── schemas/          # Pydantic request / response schemas
│   │   └── services/         # Algorand & IPFS integrations
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # Pytest automated test suites
├── frontend/                 # React 19 + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/       # UI components (Studio, Navigation, Video Player)
│   │   ├── context/          # Auth, Wallet, and Global State
│   │   ├── pages/            # Watch, Studio, Explore, Wallet & Transparency Pages
│   │   └── services/         # API clients & Algorand SDK wrappers
│   └── package.json          # Frontend dependencies
├── screenshots/              # UI previews & product walkthrough captures
├── PROJECT_CONTEXT.md        # Comprehensive technical specification
└── UX_UI_DESIGN_PLAN.md      # Design system & user experience plan
```

---

## 🛠️ Getting Started

### Prerequisites

* **Node.js** (v18+)
* **Python** (v3.12+)
* **PostgreSQL** (v15+) or SQLite for local sandbox
* **Algorand Testnet Account** & **Pera Wallet** mobile / browser extension

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, JWT secret, and Algorand credentials

# Run database migrations
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend API interactive docs will be available at: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend client will be available at: `http://localhost:5173`

---

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
pytest -v
```

---

## 🛡️ Security & Privacy Note

All API secrets, Algorand private keys, database passwords, and `.env` files are strictly excluded from version control via `.gitignore`. Always use `.env.example` as a template for local environment variables.

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
