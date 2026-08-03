// HPP Vesting Contract ABI (Genesis airdrop)
export const hppVestingABI = [
  {
    inputs: [{ name: '_beneficiary', type: 'address' }],
    name: 'getVestingSchedule',
    outputs: [
      {
        components: [
          { name: 'beneficiary', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'claimedAmount', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_beneficiary', type: 'address' }],
    name: 'getClaimableAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimAndStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/** Party Knights one-shot claim (`HPP_PartyKnightsReward`) — not vesting. */
export const hppPartyKnightsRewardABI = [
  {
    inputs: [{ name: '_beneficiary', type: 'address' }],
    name: 'getReward',
    outputs: [
      {
        components: [
          { name: 'beneficiary', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
          { name: 'isActive', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_beneficiary', type: 'address' }],
    name: 'getClaimableAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isClaimPeriodActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
