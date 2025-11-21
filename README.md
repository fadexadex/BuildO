# Zero Knowledge Proof Playground

> An immersive, game-led environment for learning, building, and verifying zero-knowledge proofs on Hedera.

[![GitHub](https://img.shields.io/badge/GitHub-BuildO-blue?logo=github)](https://github.com/fadexadex/Zero-Knowlegdge-Proof-Playground.git)
[![TypeScript](https://img.shields.io/badge/TypeScript-96.7%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-purple)](https://hedera.com/)

## 🚀 Live Demo

**Live URL:** [Click Here!](https://zk-playground.vercel.app/)

**Demo Video:** [Click Here!](https://youtu.be/cVV9ZzwM-zo?si=IboCFyC8q_BMhs_1)

---

## 📋 Problem Statement

Zero-knowledge proofs (ZKPs) demand hands-on practice: developers need to reason about circuits, understand constraints, and see proofs land on a live network. Traditional tutorials force context switching between editors, docs, and blockchain tooling.

**Zero Knowledge Proof Playground solves these problems by providing:**
- 🎮 **Story-driven Questing** that turns ZKP fundamentals into levels, XP, achievements, and leaderboard races.
- 🧪 **Circuit Build Lab** for editing, compiling, and visualizing Circom circuits in the browser.
- 📈 **Proof Execution + Telemetry** so you can run witness generation, inspect signals, and optionally verify on Hedera.
- 🔐 **Wallet-aware Verification** with Hedera account linking for when you’re ready to push proof artifacts on-chain.

---

## ✨ Key Features

### 🎯 **ZK Quest Worlds**
- Three worlds, nine levels covering visual intuition, constraint writing, and advanced privacy scenarios.
- 3D world map with unlock logic, completion stats, XP ranks, and achievements stored locally.
- Contextual navigation, narratives, quizzes, and demo tools to guide each challenge.

### 🧰 **Circuit Build Playground**
- Monaco-powered Circom editor with local persistence, file import/export, and proving system selector (Groth16/Plonk/FFLONK).
- 3D circuit visualization that animates data flow, highlights inputs/outputs, and exposes node-level diagnostics.
- Compile, witness, and proof generation flows with streaming logs plus optional Hedera verification.

### 🔐 **Hedera Verification Hooks**
- Manual wallet connect + AppKit integration for Hedera testnet accounts.
- Proof submission endpoint that returns explorer links, transaction IDs, and contract IDs for trusted validation.

### 📊 **Feedback & Performance Layers**
- Audio/haptics toggles, confetti, and in-game HUDs to keep sessions lively.
- Built-in performance overlay for FPS/memory plus demo mode controls for live presentations.

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework for production
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - VS Code-powered code editing
- **Shadcn/UI** - Modern UI components

### Backend
- **Node.js + Express** - REST endpoints for circuit compilation, proof generation, and Hedera verification
- **snarkjs/circom toolchain** - Compiles circuits and packages artifacts for the frontend
- **Hedera SDK** - Submits verification transactions when requested

### Blockchain
- **Hedera Testnet** - Decentralized network for testing
- **Hedera Agent Kit** - Specialized tools for Hedera operations

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Hedera Testnet Account** (Get free testnet HBAR from [Hedera Portal](https://portal.hedera.com/))
- **Groq API Key** (Get from [Groq Console](https://console.groq.com/))

### 1. Clone the Repository
```bash
git clone https://github.com/fadexadex/Zero-Knowlegdge-Proof-Playground.git
cd Zero-Knowlegdge-Proof-Playground
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

**Backend Environment Variables (.env):**
```env
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration (for frontend)
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file (if needed)
cp .env.local.example .env.local

# Edit environment file
nano .env.local
```

**Frontend Environment Variables (.env.local):**
```env
# Backend API URL
NEXT_PUBLIC_API_URL=https://api.example.com

# Optional: Analytics or other frontend configs
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application
- **Frontend (Development):** http://localhost:3000
- **Backend API (Development):** http://localhost:3001
- **Production Frontend:** [https://zk-playground.vercel.app/](https://zk-playground.vercel.app/)
- **Production Backend API:** https://api.example.com

---

## 🔑 Getting Started

### 1. **Set Up Your Hedera Account**
- Visit [Hedera Portal](https://portal.hedera.com/) to create a testnet account
- Get free testnet HBAR for testing
- Note down your Account ID and Private Key

### 2. **Connect to the Playground**
- Open the Zero Knowledge Proof Playground in your browser
- (Optional) Link your Hedera testnet account if you plan to verify proofs on-chain

### 3. **Play Through ZK Quest**
- Start with Level 1’s visual intuition games and progress through constraint-heavy scenarios
- Track XP, achievements, and completion stats from the world map overlay

### 4. **Experiment in the Circuit Lab**
- Edit or import Circom circuits, compile them, and inspect 3D visualizations
- Generate proofs with custom inputs, review logs, and submit to Hedera when ready

