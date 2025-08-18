# HPP Portal

Interact with the HPP Mainnet network — migrate assets, bridge to the native network, and explore the ecosystem. Built for fast, secure, and cost‑effective transactions on AI‑native infrastructure.

## Features

- **Asset Bridging (to HPP Mainnet)**: Links to trusted bridges
  - Arbitrum Official Bridge → HPP Mainnet
  - Orbiter Bridge → fast L2 transfers
- **Token Migration (AERGO → HPP on Ethereum)**: In‑app migration
- **Ecosystem**: Explore partners and integrations
- **Airdrop**: Information page for upcoming drops
- **Web3 Integration**: Reown AppKit + Wagmi + Viem

### Supported Networks

- **Ethereum Mainnet**
- **HPP Mainnet** (Arbitrum Orbit; chain id 190415)
- Development uses **Sepolia**

### Routes

- `/` Home
- `/migration` AERGO (ETH) → HPP (ETH) in‑app migration
- `/bridge` Bridges to HPP Mainnet (Arbitrum Official Bridge, Orbiter)
- `/airdrop` Airdrop info
- `/ecosystem` HPP ecosystem overview

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` and set the variables below

```bash
# Reown AppKit
NEXT_PUBLIC_APP_KIT_PROJECT_ID=

# App environment and site URL
NEXT_PUBLIC_ENV=development   # or production
NEXT_PUBLIC_SITE_URL=https://localhost:3000

# Etherscan (for history lookup)
NEXT_PUBLIC_ETHERSCAN_API_KEY=

# Ethereum Mainnet contracts (production)
NEXT_PUBLIC_MAINNET_ETH_HPP_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_MAINNET_ETH_AERGO_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_MAINNET_ETH_HPP_MIGRATION_CONTRACT=0x...

# Sepolia test contracts (development)
NEXT_PUBLIC_SEPOLIA_ETH_HPP_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_SEPOLIA_ETH_AERGO_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_SEPOLIA_ETH_HPP_MIGRATION_CONTRACT=0x...
```

3. Run the app (HTTPS dev server enabled)

```bash
npm run dev
```

Open `https://localhost:3000`.

## Migration to HPP Mainnet

1. **AERGO (Mainnet) → HPP (ETH)**: Use the official Aergo Bridge
2. **AERGO (ETH) → HPP (ETH)**: Use the in‑app migration page (`/migration`)
3. **HPP (ETH) → HPP Mainnet**: Use the Arbitrum Canonical Bridge

## Scripts

- `npm run dev` — start dev server with HTTPS
- `npm run build` — build for static export
- `npm start` — start production server (if applicable)

## Build & Deploy

- `next.config.ts` is configured with `output: 'export'` and `trailingSlash: true`.
- Build output is a static site suitable for static hosting providers.

## Tech Stack

- **Next.js v15** (App Router), **TypeScript**
- **Tailwind CSS v4** (utility‑first styling)
- **Reown AppKit** (wallet UX) + **Wagmi** + **Viem**
