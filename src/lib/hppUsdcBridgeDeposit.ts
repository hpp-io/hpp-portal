import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { Erc20Bridger } from '@arbitrum/sdk';
import { ensureHppRollupRegistered } from '@/lib/hppArbitrumL2Tx';

export type HppUsdcDepositTxRequest = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

export async function getHppUsdcDepositTxRequest(params: {
  l1RpcUrl: string;
  l2RpcUrl: string;
  l2ChainId: number;
  rollupAddress: `0x${string}`;
  networkName: string;
  isTestnet: boolean;
  from: `0x${string}`;
  l1TokenAddress: `0x${string}`;
  amount: bigint;
}): Promise<HppUsdcDepositTxRequest> {
  const l2ChainId =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_HPP_CHAIN_ID &&
    Number(process.env.NEXT_PUBLIC_HPP_CHAIN_ID) > 0
      ? Number(process.env.NEXT_PUBLIC_HPP_CHAIN_ID)
      : params.l2ChainId;

  await ensureHppRollupRegistered({
    l1RpcUrl: params.l1RpcUrl,
    rollupAddress: params.rollupAddress,
    l2ChainId,
    networkName: params.networkName,
    isTestnet: params.isTestnet,
  });

  const parentProvider = new JsonRpcProvider(params.l1RpcUrl);
  const childProvider = new JsonRpcProvider(params.l2RpcUrl, {
    chainId: l2ChainId,
    name: params.networkName,
  });

  const bridger = await Erc20Bridger.fromProvider(childProvider);
  const depositReq = await bridger.getDepositRequest({
    parentProvider,
    childProvider,
    from: params.from,
    erc20ParentAddress: params.l1TokenAddress,
    amount: BigNumber.from(params.amount.toString()),
  });

  const rawValue = depositReq.txRequest.value;
  const valueWei = typeof rawValue === 'bigint' ? rawValue : BigInt(BigNumber.from(rawValue).toString());

  return {
    to: depositReq.txRequest.to as `0x${string}`,
    data: depositReq.txRequest.data as `0x${string}`,
    value: valueWei,
  };
}

