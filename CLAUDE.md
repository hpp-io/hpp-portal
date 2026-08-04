# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev        # HTTPS dev server with Turbopack (https://localhost:3000)
yarn build      # Static export build → out/ (runs yarn clean first)
yarn lint       # Next.js ESLint
yarn clean      # Remove out/
```

No test suite is configured. Type checking: `npx tsc --noEmit`.

## Architecture

### App Structure

Next.js 15 App Router with **static export** (`output: 'export'`, `trailingSlash: true`). Each route follows the pattern:

- `src/app/<route>/page.tsx` — thin server component (metadata, SSR boundary)
- `src/app/<route>/<Name>Client.tsx` — the actual `'use client'` page component

Routes: `/`, `/migration`, `/migration/AERGO`, `/migration/AQT`, `/bridge`, `/staking`, `/staking/pre-registration`, `/governance`, `/airdrop`, `/airdrop/[id]`, `/ecosystem`.

### Web3 Stack

- **Wallet**: Reown AppKit + Wagmi (`src/context/index.tsx` is the provider tree — `WagmiProvider` → `QueryClientProvider`)
- **Config**: `src/config/walletConfig.tsx` sets up the `WagmiAdapter` with Ethereum mainnet or Sepolia based on `NEXT_PUBLIC_CHAIN`
- **HPP chain**: accessed via viem's `hpp` / `hppSepolia` from `viem/chains`; helpers in `src/app/staking/hppClient.ts` (`useHppChain`, `useHppPublicClient`)
- **Chain switching**: `useEnsureChain()` in `src/hooks/useWallet.ts` — tries wagmi `switchChainAsync`, falls back to `wallet_addEthereumChain` via transport, then `window.ethereum`

### State Management

Redux Toolkit (`src/store/`) manages staking and airdrop UI state. Slices: `ui`, `input`, `apr`, `staking`, `wallet`, `activities`, `balance`, `cooldown`, `overview`, `airdrop`. Typed hooks are in `src/store/hooks.ts`.

### Networks

| Chain | Chain ID | Env |
|-------|----------|-----|
| Ethereum Mainnet | 1 | `NEXT_PUBLIC_CHAIN=mainnet` |
| Sepolia | 11155111 | `NEXT_PUBLIC_CHAIN=sepolia` |
| HPP Mainnet | 190415 | `NEXT_PUBLIC_HPP_CHAIN_ID=190415` |
| HPP Sepolia | 181228 | `NEXT_PUBLIC_HPP_CHAIN_ID=181228` |

`NEXT_PUBLIC_CHAIN` controls both the L1 wallet network (AppKit) and which Agora/explorer defaults are used.

### Key Libraries

- `src/lib/helpers.ts` — all token arithmetic uses **Big.js** (never native JS floats)
- `src/lib/agora.ts` — Agora Workers API client + fallback SVG generation for proposal images
- `src/lib/discourse.ts`, `src/lib/ghost.ts` — Governance feed data sources
- `src/lib/hppExplorer.ts` — block explorer URL builder
- `src/lib/bridgeArbitrumToken.ts` — bridge URL construction; `resolveHppUsdceTokenAddress()` reads env or falls back to built-in default
- `src/lib/bridgeHistory.ts`, `src/lib/hppArbitrumL2Tx.ts`, `src/lib/hppEthBridgeDeposit.ts` — bridge transaction tracking

### Config

- `src/config/walletConfig.tsx` — Wagmi adapter, AppKit project ID
- `src/config/hppCore.ts` — HPP chain info and contract addresses (Arbitrum Orbit rollup, token bridge contracts); mainnet value is `null` until populated
- `src/config/navigation.tsx` — nav links and legal links used by the AppKit modal

### SVGs

SVGs are imported directly as React components (`import Icon from './icon.svg'`). For `<img>` usage, import with `?url` suffix. This is configured in both `next.config.ts` (webpack) and `turbopack` sections.

### Environment

Copy `.env.example` → `.env.local`. The minimum required variables for each feature are documented in the README. Key groupings:

- **L1 contracts**: `NEXT_PUBLIC_ETH_*` (migration, HPP token on ETH)
- **HPP chain**: `NEXT_PUBLIC_HPP_*` (chain id, RPC, staking contract, blockscout proxy)
- **Governance**: Agora API/web URLs, Discourse proxy, Ghost content API key
- **Bridge**: optional tracking API and Orbiter URL override
