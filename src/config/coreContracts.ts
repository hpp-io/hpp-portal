const isSepoliaChain = () => (process.env.NEXT_PUBLIC_CHAIN || "mainnet").toLowerCase() === "sepolia";

/**
 * Public, rarely-changing contract addresses — tracked in source (not env vars) since
 * they're not secret and `.env*` files here are gitignored (no PR/review trail).
 */

type EthContracts = {
  /** HPP token bridged to Ethereum L1. */
  hppToken: `0x${string}`;
  aergoToken: `0x${string}`;
  aqtToken: `0x${string}`;
  aergoMigration: `0x${string}`;
  aqtMigration: `0x${string}`;
};

type HppChainContracts = {
  hppToken: `0x${string}`;
  staking: `0x${string}`;
};

const ETH_CONTRACTS: Record<"sepolia" | "mainnet", EthContracts> = {
  sepolia: {
    hppToken: "0xB34e0d1fee60e078D611D4218AFB004b639C7b76",
    aergoToken: "0xd5bcbF50c8DD54fbE034dd8fCb0dBC8569d21062",
    aqtToken: "0x3Bb10958ca236d5bcC1Bb28C28f10fD5260f42F8",
    aergoMigration: "0xc2bD34206eF45E9114Eb2aC78EAd0A7ef7622208",
    aqtMigration: "0x556c95d28C5D91712d343D418A55ef930343EBFe",
  },
  mainnet: {
    hppToken: "0xe33fbe7584eb79e2673abe576b7ac8c0de62565c",
    aergoToken: "0x91Af0fBB28ABA7E31403Cb457106Ce79397FD4E6",
    aqtToken: "0x2a9bDCFF37aB68B95A53435ADFd8892e86084F93",
    aergoMigration: "0x01F8f5a3836896F4098d705619cBc68d766f8270",
    aqtMigration: "0x9C602673FfA3760e5993b3A83504674fBDb71ead",
  },
};

const HPP_CHAIN_CONTRACTS: Record<"sepolia" | "mainnet", HppChainContracts> = {
  sepolia: {
    hppToken: "0x8ebCaf48D2D91b8CEcF1668A4519823881Bf8fc3",
    staking: "0x5EE0eC62A90216bd278e0315363cA324c148DE3b",
  },
  mainnet: {
    hppToken: "0xB48334E7938367bC24Fe1F19000D6f06C622E6c7",
    staking: "0x2B8C91561EaEbCa494Cb8867020B447459eeB65E",
  },
};

/** Ethereum L1 contracts (migration source tokens + migration contracts, bridged HPP). */
export function getEthContracts(): EthContracts {
  return isSepoliaChain() ? ETH_CONTRACTS.sepolia : ETH_CONTRACTS.mainnet;
}

/** HPP chain contracts (HPP token, staking). */
export function getHppChainContracts(): HppChainContracts {
  return isSepoliaChain() ? HPP_CHAIN_CONTRACTS.sepolia : HPP_CHAIN_CONTRACTS.mainnet;
}
