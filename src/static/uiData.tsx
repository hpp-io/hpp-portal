import React from 'react';
import {
  BitGO,
  ARB,
  Eigen,
  Orbiter,
  Aergo,
  Aqt,
  Booost,
  W3DB,
  ArenAI,
  Noosphere,
  Conduit,
  TwitterIcon,
  MediumIcon,
  TelegramIcon,
  MobileTwitterIcon,
  MobileMediumIcon,
  MobileTelegramIcon,
} from '@/assets/icons';

// Home Page Data
export const homeData = {
  quickActions: [
    {
      title: 'Migration',
      description: 'Swap your legacy AERGO tokens to HPP and join the new AI-native ecosystem.',
    },
    {
      title: 'Bridge',
      description: 'Move assets seamlessly between Ethereum and HPP Mainnet.',
    },
    {
      title: 'Start Building',
      description: 'Access tools, docs, and SDKs to launch AI-integrated smart contracts and autonomous agents on HPP.',
    },
  ],
  ecosystemProjects: [
    {
      name: 'Aergo',
      description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
      icon: Aergo,
    },
    {
      name: 'AQT(Alpha Quark)',
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
      name: 'Noösphere',
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
      name: 'AQT(Alpha Quark)',
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
      name: 'Noösphere',
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
    {
      name: 'Conduit',
      description:
        'Conduit is a Rollups-as-a-Service platform that lets teams launch and scale fully managed, high-performance custom chains with powerful infrastructure and enterprise-grade security.',
      icon: Conduit,
    },
  ],
  benefits: [
    'Low transaction costs and fast finality',
    'EVM compatibility for easy migration',
    'Growing user base and liquidity',
    'Developer grants and support program',
  ],
};

// Bridge Page Data
export const bridgeData = {
  faq: [
    {
      id: 1,
      question: 'What bridges does HPP support?',
      answer: 'HPP provides access to the Arbitrum Official Bridge and Orbiter Bridge for seamless asset transfers',
    },
    {
      id: 2,
      question: 'What is the difference between these bridges?',
      answer:
        '1) Arbitrum Official Bridge – The canonical bridge for transferring assets between Ethereum and Arbitrum with full Ethereum-level security.\n2) Orbiter Bridge – A fast, low-cost cross-rollup bridge for moving assets.',
    },
    {
      id: 3,
      question: 'Are these bridges operated by HPP?',
      answer:
        'No. The Arbitrum Official Bridge and Orbiter Bridge are independent third-party services. HPP links to them for your convenience but does not operate, control, or guarantee their performance.',
    },
    {
      id: 4,
      question: 'Is HPP responsible if I lose funds using a third-party bridge?',
      answer:
        'No. HPP is not responsible for the operations, security, or any losses resulting from the use of third-party services. Always use caution and verify details before transferring assets.',
    },
    {
      id: 5,
      question: 'Are there fees for using these bridges?',
      answer:
        'Yes. Each bridge charges network gas fees and, in some cases, additional service fees. Fees vary depending on the network and bridge provider.',
    },
    {
      id: 6,
      question: 'How long do transfers take?',
      answer:
        '1) Arbitrum Official Bridge: Instant deposits, but withdrawals to Ethereum can take up to 7 days due to fraud-proof windows.',
    },
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

// Social Links (used in Sidebar and elsewhere)
export const socialLinks = [
  {
    label: 'Twitter',
    href: 'https://x.com/aergo_io',
    Icon: TwitterIcon,
    MobileIcon: MobileTwitterIcon,
  },
  {
    label: 'Medium',
    href: 'https://medium.com/aergo',
    Icon: MediumIcon,
    MobileIcon: MobileMediumIcon,
  },
  {
    label: 'Telegram',
    href: 'https://t.me/aergoofficial',
    Icon: TelegramIcon,
    MobileIcon: MobileTelegramIcon,
  },
];
