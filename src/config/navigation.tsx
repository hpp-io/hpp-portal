import {
  HomeIcon,
  MigrationIcon,
  AirdropIcon,
  BridgeIcon,
  EcosystemIcon,
  GovernanceIcon,
  BlockExplorerIcon,
  BuildIcon,
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
    label: 'Airdrop',
    icon: <AirdropIcon />,
  },
  {
    label: 'Bridge',
    icon: <BridgeIcon />,
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

export const communityLinks = [
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Privacy Policy', href: '#' },
];
