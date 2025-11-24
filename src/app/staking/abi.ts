// Minimal StandardArbERC20 ABI (reads + approve/allowance)
export const standardArbErc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

// Minimal Staking contract ABI
export const hppStakingAbi = [
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getMaxGlobalCooldownEntries',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'cooldownCount',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'stakedBalance',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getCooldownArrayInfo',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalLength', type: 'uint256' },
      { name: 'firstValidIndex', type: 'uint256' },
      { name: 'validCount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'cooldownDuration',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getCooldown',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'relativeIndex', type: 'uint256' },
    ],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'unlockTime', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const;
