# HPP Portal

Interact with the HPP Mainnet network — migrate assets, bridge to the native network, and explore the ecosystem. Built for fast, secure, and cost‑effective transactions on AI‑native infrastructure.

## Features

- **Asset Bridging (to HPP Mainnet)**: Links to trusted bridges
  - Arbitrum Official Bridge → HPP Mainnet
  - Orbiter Bridge → fast L2 transfers
- **Token Migration (AERGO → HPP on Ethereum)**: In‑app migration
- **Staking (HPP on HPP chain)**: Stake/Unstake and Claim
- **Ecosystem**: Explore partners and integrations
- **Airdrop**: Information page for upcoming drops
- **Web3 Integration**: Reown AppKit + Wagmi + Viem

### Supported Networks

- **Ethereum Mainnet**
- Dev for ETH uses **Sepolia**
- **HPP Mainnet** (Arbitrum Orbit; chain id 190415)
- Dev: **HPP Sepolia** (chain id 181228)

### Routes

- `/` Home
- `/migration` AERGO (ETH) → HPP (ETH) in‑app migration
- `/bridge` Bridges to HPP Mainnet — external links to Arbitrum Official Bridge and Orbiter
- `/staking` HPP staking (stake / unstake / claim)
- `/airdrop` Airdrop info
- `/ecosystem` HPP ecosystem overview

### External Links

- Governance: AIP proposals and voting
  - `https://snapshot.box/%5C#/s:hpp.eth`
- Build: Developer docs and tools
  - `https://docs.hpp.io/`
- Block Explorer: HPP Mainnet and HPP Sepolia
  - Mainnet: `https://explorer.hpp.io`
  - Sepolia: `https://sepolia-explorer.hpp.io`

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

# HPP chain (Mainnet / Sepolia)
NEXT_PUBLIC_HPP_CHAIN_ID=190415               # 190415 (Mainnet) or 181228 (Sepolia)
NEXT_PUBLIC_HPP_RPC_URL=https://...           # HPP RPC for selected chain
NEXT_PUBLIC_HPP_TOKEN_CONTRACT=0x...           # HPP token on HPP chain
NEXT_PUBLIC_HPP_STAKING_CONTRACT=0x...         # Staking contract on HPP chain

# Ethereum network for AppKit (Mainnet / Sepolia)
NEXT_PUBLIC_CHAIN=mainnet                      # or sepolia
```

3. Run the app (HTTPS dev server enabled)

```bash
npm run dev
```

Open `https://localhost:3000`.

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

## Migration to HPP Mainnet

1. **AERGO (Mainnet) → HPP (ETH)**: Use the official Aergo Bridge
2. **AERGO (ETH) → HPP (ETH)**: Use the in‑app migration page (`/migration`)
3. **HPP (ETH) → HPP Mainnet**: Use the Arbitrum Canonical Bridge

## Staking Details

- Claimable: derived from cooldowns; latest first; auto‑updates when ready.
- Countdown: 1s tick; local timezone; no refetch flicker.
- Precision: raw amounts; floored display via `formatTokenBalance`; clean percent inputs.
- Chain: `useHppChain` + `useEnsureChain` for switching; explorer links on success.
- Toasts: unified loading/success/error/info with optional link actions.

## Architecture Notes

- `src/app/staking/StakingClient.tsx` — staking UI and on‑chain interactions
- `src/app/staking/abi.ts` — minimal ABIs incl. `cooldownDuration`, `getCooldownArrayInfo`, `getCooldown`
- `src/app/staking/hppClient.ts` — `useHppChain()`, `useHppPublicClient()`; single source of HPP chain truth
- `src/lib/wallet.ts` — `useEnsureChain()` to reliably switch/add chains across desktop & mobile wallets
- `src/lib/helpers.ts` — `formatTokenBalance`, `formatDisplayAmount`, percent helpers using Big.js (no floating point drift)
- `src/lib/dayjs.ts` — dayjs init + duration plugin (single registration)
- `src/hooks/useToast.tsx` — unified toasts with link actions
