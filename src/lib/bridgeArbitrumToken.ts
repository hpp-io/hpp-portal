/** Ethereum mainnet USDC — L1 side of USDC → USDC.e on HPP (Arbitrum portal `token` / `destinationToken`). */
export const L1_USDC_MAINNET = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;

export type BridgeUrlToken = 'hpp' | 'usdc' | 'eth';

const USDC_PARAM_ALIASES = new Set(['usdc', 'usdc.e', 'usdce', 'usdc_usdce', 'usdc-usdce']);

/**
 * `?token=` on `/bridge` — which asset to pre-select in the Arbitrum bridge widget.
 * USDC.e on HPP is reached via L1 USDC (`token` / `destinationToken` on the portal).
 */
export function parseBridgeUrlTokenParam(value: string | null | undefined): BridgeUrlToken {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'hpp') return 'hpp';
  if (USDC_PARAM_ALIASES.has(normalized)) return 'usdc';
  if (normalized === 'eth' || normalized === 'ethereum') return 'eth';
  return 'hpp';
}

/** L1 ERC-20 address for Arbitrum portal query params; `null` = native ETH (omit token params). */
export function resolveArbitrumBridgeL1Token(
  token: BridgeUrlToken,
  options: { l1HppAddress?: string; isSepolia: boolean },
): string | null {
  if (token === 'eth') return null;

  if (token === 'usdc') {
    const fromEnv =
      typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_ETH_USDC_TOKEN_CONTRACT?.trim().toLowerCase()
        : undefined;
    if (fromEnv) return fromEnv;
    if (options.isSepolia) return null;
    return L1_USDC_MAINNET.toLowerCase();
  }

  return options.l1HppAddress?.trim().toLowerCase() ?? null;
}

export function buildArbitrumBridgeTokenQuery(l1TokenLower: string | null | undefined): string {
  if (!l1TokenLower) return '';
  const enc = encodeURIComponent(l1TokenLower);
  return `&token=${enc}&destinationToken=${enc}`;
}
