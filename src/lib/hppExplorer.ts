export function getHppExplorerBaseUrl(): string {
  const selectedChainEnv = (process.env.NEXT_PUBLIC_CHAIN || 'mainnet').toLowerCase();
  return selectedChainEnv === 'sepolia' ? 'https://sepolia-explorer.hpp.io' : 'https://explorer.hpp.io';
}

export function getHppExplorerTxUrl(txHash: string): string {
  return `${getHppExplorerBaseUrl()}/tx/${txHash}`;
}

