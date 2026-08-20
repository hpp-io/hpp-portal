const isSepoliaChain = () => (process.env.NEXT_PUBLIC_CHAIN || "mainnet").toLowerCase() === "sepolia";

/**
 * Every staking reward ("claim") contract ever deployed, oldest season first, by network.
 * Contract addresses are public — tracked in source (not env vars) so a new season is a
 * reviewable code change, not an out-of-band deploy-env edit.
 *
 * Every season here stays independently claimable (summed in the UI) and its `claim` txs
 * show up in activity history. Opening a new season is just appending one address below.
 */
const STAKING_REWARD_CONTRACTS: Record<"sepolia" | "mainnet", `0x${string}`[]> = {
  sepolia: [
    "0x3b57a025fC3AB48a4A4d485De77629f23e0dc26f", // Season 1
    "0x224AC8448CFEa96eB3a0996B7b8444CBc4BE119C", // Season 2
  ],
  mainnet: [
    "0xa861CBe398C5b8235EFF0c749DcA630F555b25eF", // Season 1
    "0x29cb09a804F9Ac6C82519b032b174f5309702a29", // Season 2
  ],
};

export type StakingRewardContract = { address: `0x${string}`; season: number };

export function getStakingRewardContracts(): StakingRewardContract[] {
  const list = isSepoliaChain() ? STAKING_REWARD_CONTRACTS.sepolia : STAKING_REWARD_CONTRACTS.mainnet;
  return list.map((address, i) => ({ address, season: i + 1 }));
}
