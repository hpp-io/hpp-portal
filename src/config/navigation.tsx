import {
  HomeIcon,
  MigrationIcon,
  AirdropIcon,
  BridgeIcon,
  EcosystemIcon,
  GovernanceIcon,
  BlockExplorerIcon,
  BuildIcon,
  StakingIcon,
} from '@/assets/icons';

export const navItems = [
  {
    label: 'Home',
    icon: <HomeIcon />,
  },
  {
    label: 'Migration',
    icon: <MigrationIcon />,
  },
  {
    label: 'Bridge',
    icon: <BridgeIcon />,
  },
  {
    label: 'Staking',
    href: '/staking/pre-registration',
    icon: <StakingIcon />,
  },
  {
    label: 'Airdrop',
    icon: <AirdropIcon />,
  },
  {
    label: 'Ecosystem',
    icon: <EcosystemIcon />,
  },
  {
    label: 'Governance',
    href: 'https://snapshot.box/%5C#/s:hpp.eth',
    external: true,
    icon: <GovernanceIcon />,
  },
  {
    label: 'Build',
    href: 'https://docs.hpp.io',
    external: true,
    icon: <BuildIcon />,
  },
  {
    label: 'Block Explorer',
    href: 'https://explorer.hpp.io',
    external: true,
    icon: <BlockExplorerIcon />,
  },
];

export const legalLinks = [
  { label: 'Terms & Conditions', href: 'https://paper.hpp.io/HPP_TermsConditions_v1.7.pdf' },
  { label: 'Privacy Policy', href: 'https://paper.hpp.io/HPP_Privacy_Policy_v1.5.pdf' },
];
