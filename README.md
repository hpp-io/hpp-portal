# HPP Portal

Interact with the HPP Mainnet network — migrate assets, bridge to the native network, stake HPP, discover and claim airdrops, follow governance, and explore the ecosystem. Built for fast, secure, and cost‑effective transactions on AI‑native infrastructure.

## Features

- **Asset Bridging (to HPP Mainnet)**: Links to trusted bridges
  - Arbitrum Official Bridge → HPP Mainnet
  - Orbiter Bridge → fast L2 transfers (URL override via env)
- **Token Migration (AERGO / AQT → HPP on Ethereum)**: In‑app migration
- **Staking (HPP on HPP chain)**: Stake / Unstake / Claim, reward contract when configured, wallet APR / dashboard, activity history (Blockscout proxy)
- **Staking pre‑registration**: Time‑boxed campaign UI when enabled
- **Governance**: Unified feed — Agora proposals, Discourse forum topics, Ghost blog posts (filters, pagination)
- **Ecosystem**: Explore partners and integrations
- **Airdrop**: Discover, join, and claim HPP airdrop events (HPP / DApp / Collaboration). Eligibility, vesting overview, and claim on the HPP chain
- **Web3 Integration**: Reown AppKit + Wagmi + Viem + TanStack Query

### Supported Networks

- **Ethereum Mainnet**
- Dev for ETH uses **Sepolia**
- **HPP Mainnet** (Arbitrum Orbit; chain id **190415**)
- Dev: **HPP Sepolia** (chain id **181228**)

### Routes

- `/` Home
- `/migration` AERGO / AQT (ETH) → HPP (ETH) in‑app migration
- `/bridge` Bridges to HPP Mainnet — external links and optional bridge tracking API
- `/staking` HPP staking (stake / unstake / claim)
- `/staking/pre-registration` Pre‑registration campaign (when deployed)
- `/governance` Governance feed (proposals, discussions, updates)
- `/airdrop` Airdrop event list (tabs: HPP, DApp, Collaboration)
- `/airdrop/[id]` Airdrop detail — eligibility, vesting, claim
- `/ecosystem` HPP ecosystem overview

### External Links

- **Agora** (proposals / voting UI): `https://agora.hpp.io` (Sepolia: `https://agora-sepolia.hpp.io`)
- **Discourse** (forum): `https://forum.hpp.io`
- **HPP Report** (Ghost): `https://hppio.ghost.io`
- **Snapshot** (legacy / additional): `https://snapshot.box/%5C#/s:hpp.eth`
- **Docs**: `https://docs.hpp.io/`
- **Staking guide**: `https://docs.hpp.io/community/staking-guide`
- **Block explorer**
  - Mainnet: `https://explorer.hpp.io`
  - Sepolia: `https://sepolia-explorer.hpp.io`

## Quick Start

1. Install dependencies

```bash
yarn install
```

2. Create `.env.local` (copy from `.env.example`) and set at least the variables you need for the pages you run. Common entries:

```bash
# Wallet modal chain selection (AppKit / Wagmi): mainnet | sepolia
NEXT_PUBLIC_CHAIN=mainnet

# Reown AppKit project id — https://dashboard.reown.com
NEXT_PUBLIC_APP_KIT_PROJECT_ID=

# Site URL for metadata (Open Graph, sitemap, robots)
NEXT_PUBLIC_SITE_URL=https://localhost:3000

# Ethereum (L1) — migration / bridge
NEXT_PUBLIC_ETH_HPP_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_ETH_AERGO_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_ETH_AERGO_HPP_MIGRATION_CONTRACT=0x...
NEXT_PUBLIC_ETH_AQT_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_ETH_AQT_HPP_MIGRATION_CONTRACT=0x...

# HPP chain — staking, airdrop claims, explorer links
NEXT_PUBLIC_HPP_CHAIN_ID=190415
NEXT_PUBLIC_HPP_RPC_URL=https://...
NEXT_PUBLIC_HPP_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_HPP_STAKING_CONTRACT=0x...
# Optional: reward contract (claim flow / activity)
NEXT_PUBLIC_HPP_STAKING_REWARD_CONTRACT=0x...

# Staking stats API (APR, airdrop list, pre-registration, etc.)
NEXT_PUBLIC_HPP_STAKING_API_URL=https://...

# Blockscout API v2 proxy — staking / airdrop activity & history
NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL=https://...

# Governance — Agora Workers API + public web base (defaults by chain if unset)
# NEXT_PUBLIC_HPP_AGORA_API_URL=https://agora-api.hpp.io
# NEXT_PUBLIC_HPP_AGORA_WEB_URL=https://agora.hpp.io

# Governance — Discourse (optional proxy for static export CORS)
# NEXT_PUBLIC_HPP_DISCOURSE_BASE_URL=https://forum.hpp.io
# NEXT_PUBLIC_HPP_DISCOURSE_PROXY_URL=https://...

# Governance — Ghost Content API (required for “Update” posts in the feed)
NEXT_PUBLIC_GHOST_CONTENT_API_KEY=
# NEXT_PUBLIC_BLOG_API_URL=https://hppio.ghost.io

# Bridge — optional tracking API and overrides
# NEXT_PUBLIC_BRIDGE_TRACKING_API_BASE=https://...
# NEXT_PUBLIC_ORBITER_BRIDGE_URL=https://...
# NEXT_PUBLIC_BRIDGE_L1_RPC_URL=https://...

# Optional staking APR fallback for display
# NEXT_PUBLIC_STAKING_APR=
```

3. Run the app (HTTPS dev server, Turbopack)

```bash
yarn dev
```

Open `https://localhost:3000`.

## Scripts

- `yarn clean` — remove `out/` before a fresh export build
- `yarn dev` — `next dev` with `--experimental-https` and `--turbopack`
- `yarn build` — `yarn clean` then `next build` (static export)
- `yarn start` — `next start` (when not serving static `out/` only)
- `yarn lint` — Next.js ESLint

## Build & Deploy

- `next.config.ts` uses `output: 'export'` and `trailingSlash: true`.
- `images.unoptimized: true` with broad `remotePatterns` suits static hosting and remote proposal/blog images.
- Build output is the `out/` directory — suitable for static hosting (CDN, object storage, etc.).

## Tech Stack

- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Redux Toolkit** + **React Redux** (global UI / staking-related state)
- **Reown AppKit** + **Wagmi** + **Viem** + **TanStack React Query**
- **Lottie** (`@lottiefiles/dotlottie-react`), **Recharts** (where used)

## Migration to HPP Mainnet

1. **AERGO (Mainnet) → HPP (ETH)**: Use the official Aergo Bridge
2. **AERGO / AQT (ETH) → HPP (ETH)**: Use the in‑app migration page (`/migration`)
3. **HPP (ETH) → HPP Mainnet**: Use the Arbitrum Canonical Bridge

## Airdrop

- **List** (`/airdrop`): Events by type; data from `NEXT_PUBLIC_HPP_STAKING_API_URL` (e.g. `/airdrop/type/{type}`).
- **Detail** (`/airdrop/[id]`): Eligibility, vesting, claim on HPP chain; optional history via Blockscout proxy.
- **Env**: Staking API base, HPP token / staking addresses, Blockscout proxy as needed.

## Staking

- **Chain**: `useHppChain` / `useEnsureChain` for switching; explorer links via `src/lib/hppExplorer.ts`.
- **Activity**: `NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL` for transaction / token transfer history.
- **Reward contract**: Set `NEXT_PUBLIC_HPP_STAKING_REWARD_CONTRACT` when the reward `claim` flow is live.

## Governance

- **Page**: `src/app/governance/GovernanceClient.tsx` — merges Agora proposals, Discourse topics, and Ghost posts; proposal cards use the first markdown image in the proposal body, or an SVG fallback (`makeHipFallbackImageDataUrl` in `src/lib/agora.ts`).
- **Libs**: `src/lib/agora.ts`, `src/lib/discourse.ts`, `src/lib/ghost.ts`.

## Architecture Notes

| Area | Main entry |
|------|----------------|
| Airdrop list | `src/app/airdrop/AirdropClient.tsx` |
| Airdrop detail | `src/app/airdrop/[id]/AirdropDetailClient.tsx` |
| Staking | `src/app/staking/StakingClient.tsx`, `DashboardSection.tsx`, … |
| Staking ABIs | `src/app/staking/abi.ts` |
| HPP chain helpers | `src/app/staking/hppClient.ts` |
| Wallet / chain switch | `src/lib/wallet.ts`, `src/config/walletConfig.tsx` |
| Redux store | `src/context/index.tsx`, `src/store/slices/*` |
| Numbers / display | `src/lib/helpers.ts` (Big.js) |
| Dates | `src/lib/dayjs.ts` |
| Toasts | `src/hooks/useToast.tsx` |
