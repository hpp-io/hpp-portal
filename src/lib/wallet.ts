'use client';

import { useSwitchChain, useWalletClient } from 'wagmi';

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface EnsureChainOptions {
  chainName: string;
  rpcUrls: string[];
  nativeCurrency?: NativeCurrency;
}

export interface WatchAssetErc20Options {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  image?: string;
}

/**
 * Hook that ensures the connected wallet is on the specified chain.
 * - Prefers wagmi's switchChain (works with WalletConnect/AppKit mobile).
 * - Falls back to wallet_addEthereumChain via the connected wallet client transport.
 * - As a last resort, tries window.ethereum (desktop injected) if available.
 */
export function useEnsureChain() {
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  return async (chainId: number, options: EnsureChainOptions) => {
    const hexId = '0x' + Number(chainId).toString(16);
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId });
        return;
      }
      throw Object.assign(new Error('switchChain not available'), { code: 'NO_SWITCH' });
    } catch (err: any) {
      const params = {
        chainId: hexId,
        chainName: options.chainName,
        nativeCurrency: options.nativeCurrency || { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: options.rpcUrls,
      };

      // Try via connected wallet client (WalletConnect/AppKit friendly)
      const transportRequest = (walletClient as any)?.transport?.request as
        | ((args: { method: string; params?: any[] }) => Promise<any>)
        | undefined;
      if (transportRequest) {
        try {
          // Add chain (idempotent in many wallets)
          await transportRequest({ method: 'wallet_addEthereumChain', params: [params] });
          // Try switch via wagmi first; if still not configured there, switch via transport directly
          try {
            if (switchChainAsync) {
              await switchChainAsync({ chainId });
              return;
            }
          } catch {
            // Direct switch using wallet transport as a fallback for "Chain not configured" in wagmi
            await transportRequest({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: hexId }],
            });
            return;
          }
        } catch (addErr) {
          // If adding/switching via transport failed, continue to injected fallback
        }
      }

      // Injected provider fallback (MetaMask, etc.)
      const injected = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
      const injectedRequest: undefined | ((args: { method: string; params?: any[] }) => Promise<any>) =
        injected?.request?.bind(injected);
      if (injectedRequest) {
        try {
          await injectedRequest({ method: 'wallet_addEthereumChain', params: [params] });
        } catch {
          // ignore add error (already added)
        }
        try {
          await injectedRequest({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexId }],
          });
          return;
        } catch {
          // fall through
        }
      }

      // If all attempts failed, rethrow the original error
      throw err;
    }
  };
}

/**
 * Hook that requests adding an ERC-20 token to the connected wallet UI.
 * Uses wallet transport first (WalletConnect/AppKit friendly), then injected provider fallback.
 */
export function useWatchAsset() {
  const { data: walletClient } = useWalletClient();

  return async (token: WatchAssetErc20Options): Promise<boolean> => {
    const params = {
      type: 'ERC20',
      options: {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        ...(token.image ? { image: token.image } : {}),
      },
    };

    const transportRequest = (walletClient as any)?.transport?.request as
      | ((args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>)
      | undefined;
    if (transportRequest) {
      try {
        const res = await transportRequest({ method: 'wallet_watchAsset', params });
        return !!res;
      } catch {
        // fall through to injected fallback
      }
    }

    const injected = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
    const injectedRequest: undefined | ((args: { method: string; params?: any }) => Promise<any>) =
      injected?.request?.bind(injected);
    if (injectedRequest) {
      const res = await injectedRequest({ method: 'wallet_watchAsset', params });
      return !!res;
    }

    return false;
  };
}

/**
 * Best-effort, "prompt once" token add UX helper.
 * - Skips if already prompted recently.
 * - Marks as prompted on success OR user rejection to avoid nagging.
 */
export function useAutoWatchAssetOnce() {
  const watchAsset = useWatchAsset();

  return async (args: { chainId: number; token: WatchAssetErc20Options; keyPrefix?: string; force?: boolean }) => {
    if (typeof window === 'undefined') return false;
    const keyPrefix = args.keyPrefix || 'hpp:watchAsset';
    const tokenKey = `${keyPrefix}:${args.chainId}:${String(args.token.address).toLowerCase()}`;

    if (!args.force) {
      try {
        const last = window.localStorage.getItem(tokenKey);
        if (last) return false;
      } catch {
        // ignore storage errors (private mode, etc.)
      }
    }

    try {
      const added = await watchAsset(args.token);
      try {
        window.localStorage.setItem(tokenKey, String(Date.now()));
      } catch {}
      return added;
    } catch (e: any) {
      // If user rejected the request, avoid prompting again automatically.
      const code = e?.code;
      if (code === 4001) {
        try {
          window.localStorage.setItem(tokenKey, String(Date.now()));
        } catch {}
      }
      return false;
    }
  };
}
