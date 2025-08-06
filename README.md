# BuildO - Hedera Blockchain Development Copilot

> An intelligent AI-powered playground and workspace for building on the Hedera blockchain network with real-time tool execution capabilities.

[![GitHub](https://img.shields.io/badge/GitHub-BuildO-blue?logo=github)](https://github.com/fadexadex/BuildO.git)
[![TypeScript](https://img.shields.io/badge/TypeScript-96.7%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-purple)](https://hedera.com/)

## 🚀 Live Demo

**Live URL:** [https://buildo-production-8398.up.railway.app/](https://buildo-production-8398.up.railway.app/)

**Demo Video:** [Demo Video Link - Will be added here]

---

## 📋 Problem Statement

Building on blockchain networks, especially Hedera, can be challenging for developers due to:

- **Complex SDK Integration**: Understanding and implementing Hedera SDK operations requires extensive documentation reading
- **Testing Friction**: Setting up test environments and managing testnet accounts is time-consuming
- **Code Experimentation**: Lack of interactive playgrounds for rapid prototyping and testing
- **Learning Curve**: New developers struggle with blockchain concepts and Hedera-specific implementations
- **Workflow Inefficiency**: Switching between documentation, code editors, and testing environments breaks development flow

**BuildO solves these problems by providing:**
- 🤖 **AI-Powered Assistant** with access to real Hedera tools for instant blockchain operations
- 🛠️ **Interactive Workspace** for writing, testing, and executing Hedera code in real-time
- 📚 **Intelligent Code Generation** that understands Hedera best practices and generates production-ready code
- 🔄 **Seamless Code Merging** that intelligently integrates AI suggestions into your existing codebase
- ⚡ **Live Execution Environment** connected directly to Hedera Testnet

---

## ✨ Key Features

### 🤖 **Intelligent Agent Mode**
- Real-time execution of Hedera operations (HTS tokens, consensus topics, transfers)
- AI assistant with deep knowledge of Hedera SDK and best practices
- Automatic transaction confirmation and HashScan integration
- Smart error handling and debugging assistance

### 🛠️ **Interactive Workspace**
- Monaco code editor with syntax highlighting and error detection
- One-click code execution on Hedera Testnet
- Intelligent code merging from AI suggestions
- Account management with secure credential handling

### 🔧 **Supported Operations**
- **HTS (Token Service)**: Create fungible/non-fungible tokens, minting, airdrops
- **Account Operations**: HBAR transfers, balance queries, account information
- **Consensus Service**: Topic creation, message submission and querying
- **Smart Contract Integration**: [Coming Soon]

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework for production
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - VS Code-powered code editing
- **Shadcn/UI** - Modern UI components

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **LangChain** - AI agent orchestration
- **Groq** - Fast LLM inference
- **Hedera SDK** - Blockchain integration

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
git clone https://github.com/fadexadex/BuildO.git
cd BuildO
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
NEXT_PUBLIC_API_URL=https://buildo-production-8398.up.railway.app

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
- **Production Frontend:** [https://buildo-production-8398.up.railway.app/](https://buildo-production-8398.up.railway.app/)
- **Production Backend API:** https://buildo-production-8398.up.railway.app

---

## 🔑 Getting Started

### 1. **Set Up Your Hedera Account**
- Visit [Hedera Portal](https://portal.hedera.com/) to create a testnet account
- Get free testnet HBAR for testing
- Note down your Account ID and Private Key

### 2. **Connect to BuildO**
- Open BuildO in your browser
- Enter your Hedera testnet credentials
- Click "Connect" to authenticate

### 3. **Try Agent Mode**
- Ask the AI to perform Hedera operations like:
  - "Create a fungible token called 'MyToken'"
  - "Transfer 10 HBAR to account 0.0.123456"
  - "Get my account balance"
  - "Create a consensus topic for voting"

### 4. **Use Workspace Mode**
- Write custom Hedera code in the editor
- Use "Add to Workspace" from agent suggestions
- Use AI to automatically generate and apply code changes and fix bugs
- Execute code directly on Hedera Testnet
- View results in real-time




