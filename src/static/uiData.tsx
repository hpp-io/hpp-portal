import React from 'react';
import { BitGO, ARB, Eigen, Orbiter, Aergo, Aqt, Booost, W3DB, ArenAI, Noosphere } from '@/assets/icons';

// Home Page Data
export const homeData = {
  quickActions: [
    {
      title: 'Migration',
      description: 'Swap your legacy AERGO tokens to HPP and join the new AI-native ecosystem',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      title: 'Bridge',
      description: 'Move assets seamlessly between Ethereum and HPP Mainnet',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      title: 'Start Building',
      description: 'Access tools, docs, and SDKs to launch AI-integrated smart contracts and autonomous agents on HPP.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
  ],
  ecosystemProjects: [
    {
      name: 'Aergo',
      description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
      icon: Aergo,
    },
    {
      name: 'AQT (Alpha Quark)',
      description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
      icon: Aqt,
    },
    {
      name: 'BOOOST',
      description:
        'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
      icon: Booost,
    },
    {
      name: 'W3DB',
      description:
        'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
      icon: W3DB,
    },
    {
      name: 'ArenAI',
      description:
        'A crypto asset management portal that combines AI agents, CEX/DEX integration, and natural language strategy execution across DeFi.',
      icon: ArenAI,
    },
    {
      name: 'Noosphere',
      description:
        'A verifiable intelligence layer that enables smart contracts to delegate AI tasks — from inference to simulation — with secure off-chain computation and result verification.',
      icon: Noosphere,
    },
  ],
};

// Ecosystem Page Data
export const ecosystemData = {
  featuredPartners: [
    {
      name: 'Aergo',
      description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
      icon: Aergo,
    },
    {
      name: 'AQT (Alpha Quark)',
      description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
      icon: Aqt,
    },
    {
      name: 'BOOOST',
      description:
        'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
      icon: Booost,
    },
    {
      name: 'W3DB',
      description:
        'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
      icon: W3DB,
    },
    {
      name: 'ArenAI',
      description:
        'A crypto asset management portal that combines AI agents, CEX/DEX integration, and natural language strategy execution across DeFi.',
      icon: ArenAI,
    },
    {
      name: 'Noosphere',
      description:
        'A verifiable intelligence layer that enables smart contracts to delegate AI tasks — from inference to simulation — with secure off-chain computation and result verification.',
      icon: Noosphere,
    },
    {
      name: 'BitGo',
      description:
        'Institutional-grade custody provider securing HPP treasury and reserves with multi-sig control, insured protection, and regulatory compliance.',
      icon: BitGO,
    },
    {
      name: 'Arbitrum',
      description:
        "A high-performance Layer 2 rollup that powers HPP's scalable and low-cost infrastructure, built for verifiable AI and smart contract execution.",
      icon: ARB,
    },
    {
      name: 'EigenDA',
      description:
        'A decentralized data availability layer integrated via EigenLayer, providing HPP with scalable, secure, and cost-efficient data storage for AI.',
      icon: Eigen,
    },
    {
      name: 'Orbiter Finance',
      description: 'Cross-chain bridge for HPP enabling low-fee, fast asset transfers to major blockchains.',
      icon: Orbiter,
    },
  ],
  benefits: [
    'Low transaction costs and fast finality',
    'EVM compatibility for easy migration',
    'Growing user base and liquidity',
    'Developer grants and support program',
  ],
};

// Migration Page Data (if needed in the future)
export const migrationData = {
  // Migration specific data can be added here
};

// Common UI Data
export const commonData = {
  // Shared data across pages can be added here
};
