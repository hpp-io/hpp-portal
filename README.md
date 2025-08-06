# HPP Portal

Interact with the HPP Layer2 network — from bridging assets to participating in governance. Experience fast, secure, and cost-effective transactions on our cutting-edge blockchain infrastructure.

## Features

- **Asset Bridging**: Transfer tokens between Ethereum and HPP Layer2 with minimal fees
- **Governance Participation**: Vote on proposals and shape the future of the HPP network
- **Token Migration**: Seamless migration from AERGO to HPP tokens
- **Web3 Integration**: Built with Reown AppKit for seamless wallet connectivity

## Web3 Wallet Setup

This project uses [Reown AppKit](https://docs.reown.com/appkit/next/core/installation) for Web3 wallet integration.

### Prerequisites

1. Install required dependencies:

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

2. Create a `.env.local` file in the root directory:

```bash
# Reown AppKit Project ID
# Get your project ID from https://dashboard.reown.com
NEXT_PUBLIC_APP_KIT_PROJECT_ID=your_appkit_project_id_here
```

3. Get your Project ID:
   - Visit [Reown Dashboard](https://dashboard.reown.com)
   - Create a new project
   - Copy the Project ID and add it to your `.env.local` file

### Supported Networks

- Ethereum Mainnet
- Arbitrum
- HPP Layer2 (custom network)

### Wallet Features

- **Multi-wallet Support**: Connect with MetaMask, WalletConnect, Coinbase Wallet, and more
- **Smart Account Support**: Enhanced security with smart accounts
- **Cross-chain Transactions**: Seamless bridging between networks
- **Transaction History**: Track all your migration and bridging activities

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Migration Process

1. **AERGO (Mainnet) → HPP (ETH)**: Use the official Aergo Bridge
2. **AERGO (ETH) → HPP (ETH)**: Use HPP's migration bridge
3. **HPP (ETH) → HPP Native**: Use Arbitrum Canonical Bridge

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Reown AppKit**: Web3 wallet integration
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum
