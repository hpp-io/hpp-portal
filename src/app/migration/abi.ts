// HPP Migration Contract ABI
export const hppMigrationABI = [
  {
    name: 'swapAergoForHPP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    modifiers: ['nonReentrant', 'whenNotPaused'],
  },
  {
    name: 'migrateAQTtoHPP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    modifiers: ['nonReentrant', 'whenNotPaused'],
  },
] as const;
