import React from 'react';

export const quickActions = [
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export const ecosystemProjects = [
  {
    name: 'Aergo',
    description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'AQT (Alpha Quark)',
    description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'BOOOST',
    description: 'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'W3DB',
    description:
      'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'ArenAI',
    description:
      'A crypto asset management portal that combines AI agents, CEX/DEX integration, and natural language strategy execution across DeFi.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'Noosphere',
    description:
      'A verifiable intelligence layer that enables smart contracts to delegate AI tasks — from inference to simulation — with secure off-chain computation and result verification.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
];
