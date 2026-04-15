import { JsonRpcProvider } from '@ethersproject/providers';
import type { TransactionReceipt } from '@ethersproject/abstract-provider';
import {
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
  getArbitrumNetworkInformationFromRollup,
  registerCustomArbitrumNetwork,
} from '@arbitrum/sdk';
import { hppCore, type HppCoreConfig } from '@/config/hppCore';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let registeredL2ChainId: number | null = null;

const mapTokenBridge = (core: HppCoreConfig) =>
  ({
    parentGatewayRouter: core.tokenBridgeContracts.l2Contracts.router,
    childGatewayRouter: core.tokenBridgeContracts.l3Contracts.router,
    parentErc20Gateway: core.tokenBridgeContracts.l2Contracts.standardGateway,
    childErc20Gateway: core.tokenBridgeContracts.l3Contracts.standardGateway,
    parentCustomGateway: core.tokenBridgeContracts.l2Contracts.customGateway,
    childCustomGateway: core.tokenBridgeContracts.l3Contracts.customGateway,
    parentWethGateway: core.tokenBridgeContracts.l2Contracts.wethGateway,
    childWethGateway: core.tokenBridgeContracts.l3Contracts.wethGateway,
    parentWeth: core.tokenBridgeContracts.l2Contracts.weth,
    childWeth: core.tokenBridgeContracts.l3Contracts.weth,
    parentProxyAdmin: core.tokenBridgeContracts.l2Contracts.proxyAdmin,
    childProxyAdmin: core.tokenBridgeContracts.l3Contracts.proxyAdmin,
    parentMultiCall: core.tokenBridgeContracts.l2Contracts.multicall,
    childMultiCall: core.tokenBridgeContracts.l3Contracts.multicall,
  }) as const;

const pickCoreByRuntime = (l2ChainId: number, isTestnet: boolean) => {
  const preferred = isTestnet ? hppCore.sepolia : hppCore.mainnet;
  if (preferred && preferred.chainInfo.chainId === l2ChainId) return preferred;
  if (hppCore.sepolia.chainInfo.chainId === l2ChainId) return hppCore.sepolia;
  if (hppCore.mainnet && hppCore.mainnet.chainInfo.chainId === l2ChainId) return hppCore.mainnet;
  return null;
};

export async function ensureHppRollupRegistered(params: {
  l1RpcUrl: string;
  rollupAddress: `0x${string}`;
  l2ChainId: number;
  networkName: string;
  isTestnet: boolean;
}): Promise<void> {
  const { l1RpcUrl, rollupAddress, l2ChainId, networkName, isTestnet } = params;
  if (registeredL2ChainId === l2ChainId) return;

  const selectedCore = pickCoreByRuntime(l2ChainId, isTestnet);
  const l1Provider = new JsonRpcProvider(l1RpcUrl);
  const info = await getArbitrumNetworkInformationFromRollup(rollupAddress, l1Provider);

  registerCustomArbitrumNetwork(
    {
      chainId: l2ChainId,
      name: networkName,
      parentChainId: info.parentChainId,
      ethBridge: {
        ...info.ethBridge,
        rollup: rollupAddress,
      },
      confirmPeriodBlocks: info.confirmPeriodBlocks,
      nativeToken: info.nativeToken,
      tokenBridge: selectedCore ? mapTokenBridge(selectedCore) : undefined,
      isCustom: true,
      isTestnet,
    },
    { throwIfAlreadyRegistered: false },
  );

  registeredL2ChainId = l2ChainId;
}

/**
 * Resolves the L2 execution tx hash for an L1 bridge tx (retryable) using @arbitrum/sdk.
 */
export async function pollL2TxHashFromBridgeL1Tx(params: {
  l1TxHash: `0x${string}`;
  l1RpcUrl: string;
  l2RpcUrl: string;
  l2ChainId: number;
  rollupAddress: `0x${string}`;
  networkName: string;
  isTestnet: boolean;
  pollIntervalMs: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}): Promise<`0x${string}` | null> {
  await ensureHppRollupRegistered({
    l1RpcUrl: params.l1RpcUrl,
    rollupAddress: params.rollupAddress,
    l2ChainId: params.l2ChainId,
    networkName: params.networkName,
    isTestnet: params.isTestnet,
  });

  const l1Provider = new JsonRpcProvider(params.l1RpcUrl);
  const l2Provider = new JsonRpcProvider(params.l2RpcUrl, {
    chainId: params.l2ChainId,
    name: params.networkName,
  });

  for (let attempt = 0; ; attempt += 1) {
    if (params.signal?.aborted) return null;
    if (params.maxAttempts !== undefined && attempt >= params.maxAttempts) return null;

    try {
      const receipt = (await l1Provider.getTransactionReceipt(params.l1TxHash)) as TransactionReceipt | null;
      if (!receipt) {
        await sleep(params.pollIntervalMs);
        continue;
      }

      const parentReceipt = new ParentTransactionReceipt(receipt);
      const messages = await parentReceipt.getParentToChildMessages(l2Provider);
      if (messages.length === 0) {
        await sleep(params.pollIntervalMs);
        continue;
      }

      for (const message of messages) {
        const redeem = await message.getSuccessfulRedeem();
        if (
          redeem.status === ParentToChildMessageStatus.REDEEMED &&
          'childTxReceipt' in redeem &&
          redeem.childTxReceipt?.transactionHash
        ) {
          return redeem.childTxReceipt.transactionHash as `0x${string}`;
        }
      }
    } catch {
      // Transient RPC / parsing errors — retry.
    }
    await sleep(params.pollIntervalMs);
  }
}

