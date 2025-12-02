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
  Goldsky,
  Thirdweb,
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
      title: 'Pre-Registration',
      description: 'Pre-register now to secure up to 20% APR',
      href: '/staking/pre-registration',
    },
    {
      title: 'Migration',
      description: 'Swap your legacy AERGO tokens to HPP and join the new AI-native ecosystem.',
      href: '/migration',
    },
    {
      title: 'Bridge',
      description: 'Move assets seamlessly between Ethereum and HPP Mainnet.',
      href: '/bridge',
    },
    {
      title: 'Start Building',
      description: 'Access tools and SDKs to launch AI-powered contracts and agents on HPP.',
      href: 'https://docs.hpp.io',
    },
  ],
  ecosystemProjects: [
    {
      name: 'Aergo',
      description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
      link: 'https://www.aergo.io',
      icon: Aergo,
    },
    {
      name: 'AQT(Alpha Quark)',
      description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
      link: 'https://lending.alphaquark.io',
      icon: Aqt,
    },
    {
      name: 'BOOOST',
      description:
        'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
      link: 'https://www.booost.live',
      icon: Booost,
    },
    {
      name: 'W3DB(VaaSBlock)',
      description:
        'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
      link: 'https://www.vaasblock.com',
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
      link: 'https://www.aergo.io',
      icon: Aergo,
    },
    {
      name: 'AQT(Alpha Quark)',
      description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
      link: 'https://lending.alphaquark.io',
      icon: Aqt,
    },
    {
      name: 'BOOOST',
      description:
        'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
      link: 'https://www.booost.live',
      icon: Booost,
    },
    {
      name: 'W3DB(VaaSBlock)',
      description:
        'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
      link: 'https://www.vaasblock.com',
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
      link: 'https://www.bitgo.com',
      icon: BitGO,
    },
    {
      name: 'Arbitrum',
      description:
        "A high-performance Layer 2 rollup that powers HPP's scalable and low-cost infrastructure, built for verifiable AI and smart contract execution.",
      link: 'https://arbitrum.io',
      icon: ARB,
    },
    {
      name: 'EigenDA',
      description:
        'A decentralized data availability layer integrated via EigenLayer, providing HPP with scalable, secure, and cost-efficient data storage for AI.',
      link: 'https://www.eigenda.xyz',
      icon: Eigen,
    },
    {
      name: 'Orbiter Finance',
      description: 'Cross-chain bridge for HPP enabling low-fee, fast asset transfers to major blockchains.',
      link: 'https://orbiter.finance/trade/Arbitrum/Arbitrum?to=0x0000000000000000000000000000000000000000',
      icon: Orbiter,
    },
    {
      name: 'Conduit',
      description: 'Conduit is a Rollups-as-a-Service platform for scalable, secure custom chains.',
      link: 'https://www.conduit.xyz',
      icon: Conduit,
    },
    {
      name: 'Goldsky',
      description: 'Goldsky delivers real-time blockchain data with ultra-low latency access for developers.',
      link: 'https://goldsky.com',
      icon: Goldsky,
    },
    {
      name: 'Thirdweb',
      description: 'Thirdweb is an all-in-one Web3 platform for building, deploying, and scaling blockchain apps.',
      link: 'https://thirdweb.com/hpp',
      icon: Thirdweb,
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
        '1) Arbitrum Official Bridge: Instant deposits, but withdrawals to Ethereum can take up to 7 days due to fraud-proof windows.\n2) Orbiter Bridge: Typically completes in few minutes, depending on network conditions.',
    },
  ],
};

// Migration Page Data
export const migrationData = {
  faq: [
    {
      id: 1,
      question: 'Why do I need to migrate my tokens?',
      answer:
        'With the launch of the HPP Public Mainnet, AERGO and AQT tokens are being unified into the new HPP token economy. Migration ensures your tokens are fully functional across governance, listings, and the broader ecosystem.',
    },
    {
      id: 2,
      question: 'Which tokens can be migrated?',
      answer: '• AERGO Native\n• AERGO ERC-20\n• AQT ERC-20\n\nAll of these will be migrated into the HPP tokens.',
    },
    {
      id: 3,
      question: 'What are the steps of migration?',
      answer:
        'Step 1: Initiate Swap\n• Convert your AERGO(Native/ERC-20) and AQT(ERC-20 only) into HPP(Ethereum).\n• This step consolidates all legacy assets under a single format for security and consistency.\n\nStep 2: Complete Swap\n• Convert your HPP(Ethereum) tokens into HPP(Mainnet).\n• The HPP(Mainnet) token is the primary currency for exchange listings, DAO governance, and ecosystem participation.\n\nOnly after this step are your tokens fully usable within the HPP Public Mainnet.',
    },
    {
      id: 4,
      question: 'Why is a two-step process required?',
      answer:
        'The two-step structure ensures maximum security and integrity of the migration. By unifying all legacy tokens into HPP(Ethereum) first, the process prevents fragmentation and enables a controlled, transparent final migration into the HPP Public Mainnet.',
    },
    {
      id: 5,
      question: 'What happens if I only complete Step 1?',
      answer:
        'If you stop at Step 1, you will hold HPP(Ethereum), which is valid but not the primary utility token. To participate in governance, exchange listings, or ecosystem dApps, you must complete Step 2 to obtain HPP(Mainnet).',
    },
    {
      id: 6,
      question: 'Will there be a deadline for migration?',
      answer:
        'Migration will remain open for a sufficient period to ensure all users can complete it safely. Deadlines, if any, will be announced well in advance through official channels.',
    },
    {
      id: 7,
      question: 'Where can I find the migration portal?',
      answer:
        'The official migration portal link will be published on the official HPP website and social channels. Always ensure to use the official link to avoid phishing risks.',
    },
  ],
};

// Staking Page Data
export const stakingData = {
  preRegistration: {
    faq: [
      {
        id: 1,
        question: 'What are the benefits of pre-registration?',
        answer:
          'Pre-registering gives you access to the final boosted APR, early launch notifications, and priority access when staking opens.\nSince APR increases as more users register, joining early is always beneficial.',
      },
      {
        id: 2,
        question: 'How is the APR determined?',
        answer:
          'APR increases based on the total number of pre-registered wallets.\n\nAPR Tiers:\n• Base APR: 10%\n• 201~400 Wallets: 12% APR\n• 401~600 Wallets: 14% APR\n• 601~800 Wallets: 16% APR\n• 801~1000 Wallets: 18% APR\n• 1,000+ Wallets: 20% APR (Max)\n\nThe final APR is fixed at the end of the pre-registration period.',
      },
      {
        id: 3,
        question: 'What do I need to pre-register?',
        answer: 'Only your ETH wallet address. No deposit or staking is required during pre-registration.',
      },
      {
        id: 4,
        question: 'When does actual staking begin?',
        answer:
          'TBD. You will receive a notification once staking opens. Stake using the same wallet you pre-registered with to receive the final APR.',
      },
      {
        id: 5,
        question: 'Do I need to complete staking after pre-registering to receive the APR?',
        answer:
          'Yes. Pre-registration alone does not grant the APR. You must complete the actual staking process with the same wallet you pre-registered once staking opens. Only wallets that stake during the official staking period will receive the final APR.',
      },
      {
        id: 6,
        question: 'Why does inviting friends increase the APR?',
        answer:
          'This campaign uses a community-driven APR model. The more wallets that register, the higher the APR for everyone. “The more you bring, the more everyone earns.”',
      },
      {
        id: 7,
        question: 'Can I register multiple wallets?',
        answer: 'Yes, but duplicate or suspicious wallets may be excluded during verification.',
      },
      {
        id: 8,
        question: 'Is my wallet information safe?',
        answer:
          'We only collect public wallet addresses. No private keys are ever requested, and all data is handled securely.',
      },
      {
        id: 9,
        question: 'If the APR changes after I pre-register, which APR do I get?',
        answer:
          'All participants receive the same final APR, determined by the total number of wallets at the end of the pre-registration period.',
      },
      {
        id: 10,
        question: 'Does pre-registration cost anything?',
        answer: 'No. Pre-registration is completely free. You only need tokens once staking begins.',
      },
      {
        id: 11,
        question: 'When does pre-registration end?',
        answer:
          'The end date is shown on the campaign page. Only wallets registered before the deadline will qualify for the APR bonus.',
      },
      {
        id: 12,
        question: 'How long does the pre-registration bonus last?',
        answer:
          'The bonus APR will continue to be offered until the allocated 1,000,000 HPP pool is fully distributed.',
      },
    ],
  },
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
