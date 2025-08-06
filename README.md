# HPP Portal

Interact with the HPP Layer2 network — from bridging assets to participating in governance. Experience fast, secure, and cost-effective transactions on our cutting-edge blockchain infrastructure.

## Features

- **Asset Bridging**: Transfer tokens between Ethereum and HPP Layer2 with minimal fees
- **Governance Participation**: Vote on proposals and shape the future of the HPP network
- **Token Migration**: Seamless migration from AERGO to HPP tokens

### Prerequisites

1. Create a `.env.local` file in the root directory:

```bash
# Reown AppKit Project ID
# Get your project ID from https://dashboard.reown.com
NEXT_PUBLIC_APP_KIT_PROJECT_ID=your_appkit_project_id_here
```

2. Get your Project ID:
   - Visit [Reown Dashboard](https://dashboard.reown.com)
   - Create a new project
   - Copy the Project ID and add it to your `.env.local` file

### Supported Networks

- Ethereum Mainnet
- HPP Layer2

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
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum
