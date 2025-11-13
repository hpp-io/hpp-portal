'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { WalletIcon, HPPLogoIcon } from '@/assets/icons';
import { useAccount, useDisconnect } from 'wagmi';
import { formatUnits, parseUnits, createWalletClient, custom } from 'viem';
import Big from 'big.js';
import { navItems, communityLinks } from '@/config/navigation';
import { standardArbErc20Abi, hppStakingAbi } from './abi';
import { formatDisplayAmount, PERCENTS, computePercentAmount } from './helpers';
import { useHppPublicClient } from './hppClient';
import { useToast } from '@/hooks/useToast';

type StakingTab = 'stake' | 'unstake' | 'claim';

export default function StakingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StakingTab>('stake');
  const [amount, setAmount] = useState<string>('');
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [hppBalance, setHppBalance] = useState<string>('0');
  const [isHppBalanceLoading, setIsHppBalanceLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');
  const HPP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT as `0x${string}`;
  const HPP_STAKING_ADDRESS = process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT as `0x${string}`;
  const DECIMALS = 18;

  // HPP network public client (Sepolia in dev, Mainnet in prod)
  const publicClient = useHppPublicClient();
  const { showToast } = useToast();

  const handleAmountChange = (raw: string) => {
    const value = raw.replace(/,/g, '');
    // allow digits with optional single decimal point, or empty
    if (/^\d*(\.)?\d*$/.test(value) || value === '') {
      setAmount(value);
      // validate against available balance
      try {
        const cleanBal = (hppBalance || '0').replace(/,/g, '') || '0';
        const v = new Big(value === '' || value === '.' ? '0' : value);
        const b = new Big(cleanBal);
        if (v.gt(b)) {
          setInputError('Insufficient HPP balance');
        } else {
          setInputError('');
        }
      } catch {
        setInputError('');
      }
    }
  };

  const setPercent = (p: number) => {
    handleAmountChange(computePercentAmount(hppBalance, p, DECIMALS));
  };

  React.useEffect(() => {
    let cancelled = false;
    async function readBalance() {
      if (!isConnected || !address || !HPP_TOKEN_ADDRESS) {
        setHppBalance('0');
        setIsHppBalanceLoading(false);
        return;
      }
      try {
        setIsHppBalanceLoading(true);
        const result = (await publicClient.readContract({
          address: HPP_TOKEN_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;
        if (cancelled) return;
        const value = formatUnits(result, DECIMALS);
        const formatted = parseFloat(value).toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        setHppBalance(formatted);
        setIsHppBalanceLoading(false);
      } catch (_e) {
        if (!cancelled) {
          setHppBalance('0');
          setIsHppBalanceLoading(false);
        }
      }
    }
    readBalance();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, isConnected, HPP_TOKEN_ADDRESS]);

  // Writes are handled via viem wallet client
  const [isSubmitting, setIsSubmitting] = useState(false);
  const HPP_CHAIN_ID = (process.env.NEXT_PUBLIC_ENV || 'development').toLowerCase() === 'production' ? 190415 : 181228;

  // Ensure wallet is connected to HPP network for writes
  const ensureHppChain = async () => {
    const provider = (window as any).ethereum;
    if (!provider?.request) return;
    const hexId = '0x' + HPP_CHAIN_ID.toString(16);
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
    } catch (switchErr: any) {
      // 4902: chain not added
      if (switchErr?.code === 4902) {
        const isMainnet = HPP_CHAIN_ID === 190415;
        const chainName = isMainnet ? 'HPP Mainnet' : 'HPP Sepolia';
        const rpcUrl = process.env.NEXT_PUBLIC_HPP_RPC_URL as string;
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hexId,
              chainName,
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [rpcUrl],
            },
          ],
        });
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
      } else {
        throw switchErr;
      }
    }
  };

  // Balance refresh helper
  const fetchHppBalance = React.useCallback(async () => {
    if (!isConnected || !address || !HPP_TOKEN_ADDRESS) {
      setHppBalance('0');
      setIsHppBalanceLoading(false);
      return;
    }
    try {
      setIsHppBalanceLoading(true);
      const result = (await publicClient.readContract({
        address: HPP_TOKEN_ADDRESS,
        abi: standardArbErc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint;
      const value = formatUnits(result, DECIMALS);
      const formatted = parseFloat(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      setHppBalance(formatted);
    } catch (_e) {
      setHppBalance('0');
    } finally {
      setIsHppBalanceLoading(false);
    }
  }, [publicClient, address, isConnected, HPP_TOKEN_ADDRESS]);

  const onStake = async () => {
    try {
      if (!address || !isConnected) return;
      // basic guards
      if (!amount || amount === '.' || Number(amount) <= 0) return;
      const clean = amount.replace(/,/g, '');
      const amountWei = parseUnits(clean as `${number}`, DECIMALS);

      // Make sure wallet is on HPP network
      await ensureHppChain();
      const walletClient = createWalletClient({
        chain: {
          id: HPP_CHAIN_ID,
          name: HPP_CHAIN_ID === 190415 ? 'HPP Mainnet' : 'HPP Sepolia',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_HPP_RPC_URL as string] } },
        } as const,
        transport: custom((window as any).ethereum),
      });

      setIsSubmitting(true);
      // 1) Check allowance
      const currentAllowance = (await publicClient.readContract({
        address: HPP_TOKEN_ADDRESS,
        abi: standardArbErc20Abi,
        functionName: 'allowance',
        args: [address, HPP_STAKING_ADDRESS],
      })) as bigint;

      // 2) Approve if needed
      let stakeToastDelay = 0;
      if (currentAllowance < amountWei) {
        showToast('Waiting for approval...', 'Please approve in your wallet.', 'loading');
        const approveHash = await walletClient.writeContract({
          address: HPP_TOKEN_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'approve',
          args: [HPP_STAKING_ADDRESS, amountWei],
          account: address as `0x${string}`,
        });
        // Wait for approve confirmation
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        stakeToastDelay = 800; // small pause before showing stake prompt
      }
      // Prompt stake toast (single path)
      setTimeout(() => {
        showToast('Waiting for stake...', 'Please confirm in your wallet.', 'loading');
      }, stakeToastDelay);

      // 3) Stake
      const stakeHash = await walletClient.writeContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'stake',
        args: [amountWei],
        account: address as `0x${string}`,
      });
      // Wait for stake confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash as `0x${string}` });
      if (receipt.status === 'success') {
        // Build explorer URL and show persistent success toast with link
        const explorerBase = HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
        const txUrl = `${explorerBase}/tx/${stakeHash}`;
        showToast('Stake confirmed', 'Your HPP has been staked successfully.', 'success', {
          text: 'View on Explorer',
          url: txUrl,
        });
        // Refresh balance and reset input (do not auto-close toast)
        await fetchHppBalance();
        setAmount('');
        setInputError('');
      } else {
        showToast('Stake failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch (_e) {
      showToast('Error', 'Failed to process staking request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial balance fetch and on deps change
  React.useEffect(() => {
    fetchHppBalance();
  }, [fetchHppBalance]);

  const TabButton = ({ id, label }: { id: StakingTab; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={[
        'w-full px-5 py-3 rounded-[5px] text-base font-semibold transition-colors',
        activeTab === id ? '!bg-white !text-black' : 'bg-[#121212] text-white hover:bg-[#1a1a1a]',
        'cursor-pointer',
      ].join(' ')}
      aria-pressed={activeTab === id}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        isSidebarOpen={sidebarOpen}
        onBackClick={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          communityLinks={communityLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Wrap content to push footer to bottom on mobile */}
          <div className="min-h-[calc(100vh-66px)] min-[1200px]:min-h-[calc(100vh-85px)] flex flex-col">
            {/* Hero Section */}
            <div className="py-10">
              <div className="px-4 max-w-6xl mx-auto">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center">
                    <HPPLogoIcon className="w-auto h-12 mr-3.75" />
                    <p className="text-[40px] leading-[1.5] tracking-[0.8px] font-semibold text-white">Staking</p>
                  </div>
                  <p className="text-xl text-[#bfbfbf] leading-[1.5] font-normal">
                    Stake your HPP to earn rewards and participate in HPP ecosystem
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 max-w-6xl mx-auto w-full">
              <div className="max-w-[680px] mx-auto w-full">
                {/* Connected wallet banner */}
                {isConnected && (
                  <div className="my-5 rounded-lg p-4 border border-dashed border-white/50">
                    <div className="flex flex-col items-center text-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:text-left">
                      <div className="flex flex-col items-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:space-x-4 mb-4 min-[810px]:mb-0">
                        <WalletIcon className="w-12 h-12 text-white mb-3 min-[810px]:mb-0" />
                        <div className="flex flex-col items-center min-[810px]:items-start">
                          <span className="text-white font-semibold text-xl tracking-[0.8px] leading-[1.5em] min-[810px]:mb-0">
                            Wallet Connected
                          </span>
                          <div
                            className="text-base text-white font-normal tracking-[0.8px] leading-[1.5em] max-w-full text-center min-[810px]:text-left"
                            style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'normal' }}
                          >
                            {address}
                          </div>
                        </div>
                      </div>
                      <Button variant="white" size="md" onClick={() => disconnect?.()} className="cursor-pointer">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2.5 bg-black w-full">
                  <TabButton id="stake" label="Stake" />
                  <TabButton id="unstake" label="Unstake" />
                  <TabButton id="claim" label="Claim" />
                </div>

                {/* Panel */}
                <div
                  className={`mt-2.5 w-full ${
                    isConnected && activeTab === 'claim' ? '' : 'rounded-[5px] p-6 min-[1200px]:p-8 bg-primary'
                  }`}
                >
                  {!isConnected ? (
                    <div className="text-center">
                      <p className="text-white text-base leading-[1.2] tracking-[0.8px] mb-5">
                        No wallet has been connected.
                      </p>
                      <WalletButton size="lg" />
                    </div>
                  ) : (
                    <div>
                      {activeTab === 'stake' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              Staking Available:
                            </h3>
                            <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {isHppBalanceLoading ? 'Loading...' : `${hppBalance} HPP`}
                            </div>
                          </div>

                          <div className="rounded-[5px] bg-white flex items-center justify-between px-4 py-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="\\d*\\.?\\d*"
                              min="0"
                              className={`bg-transparent outline-none ${
                                inputError ? 'text-[#FF1312] bg-[#FF1312]/10' : 'text-black'
                              } text-base leading-[1.2] tracking-[0.8px] font-normal w-full ${
                                inputError ? 'outline-red-500' : ''
                              }`}
                              value={formatDisplayAmount(amount)}
                              placeholder="0.0"
                              onChange={(e) => handleAmountChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              onWheel={(e) => {
                                (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <span className="ml-3 text-black text-sm font-semibold cursor-default select-none">
                              HPP
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3">
                            {PERCENTS.map((p) => (
                              <button
                                key={p}
                                onClick={() => setPercent(p)}
                                className="bg-white text-black rounded-[5px] py-2 font-semibold cursor-pointer"
                              >
                                {Math.round(p * 100)}%
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-base text-white leading-[1.2] tracking-[0.8px] font-normal">
                              <span>Total:</span>
                              <span>0 HPP</span>
                            </div>
                            <div className="text-base text-[#5DF23F] leading-[1.2] tracking-[0.8px] font-normal mt-2.5">
                              HPP will be available to withdraw 7 days after unstaking.
                            </div>
                          </div>

                          <div className="mt-5">
                            <Button
                              variant="white"
                              size="lg"
                              disabled={
                                isSubmitting ||
                                isHppBalanceLoading ||
                                !!inputError ||
                                !amount ||
                                amount === '.' ||
                                Number(amount) <= 0
                              }
                              fullWidth
                              className={`${
                                isSubmitting ||
                                isHppBalanceLoading ||
                                !!inputError ||
                                !amount ||
                                amount === '.' ||
                                Number(amount) <= 0
                                  ? '!bg-[#bfbfbf] !text-black'
                                  : ''
                              } !rounded-[5px]`}
                              onClick={onStake}
                            >
                              {isSubmitting
                                ? 'Processing...'
                                : isHppBalanceLoading
                                ? 'Loading...'
                                : inputError
                                ? inputError
                                : 'Stake'}
                            </Button>
                          </div>
                        </>
                      )}

                      {activeTab === 'unstake' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              Unstaking Available:
                            </h3>
                            <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {isHppBalanceLoading ? 'Loading...' : `${hppBalance} HPP`}
                            </div>
                          </div>

                          <div className="rounded-[5px] bg-white flex items-center justify-between px-4 py-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="\\d*\\.?\\d*"
                              min="0"
                              className={`bg-transparent outline-none ${
                                inputError ? 'text-[#FF1312] bg-[#FF1312]/10' : 'text-black'
                              } text-base leading-[1.2] tracking-[0.8px] font-normal w-full`}
                              value={formatDisplayAmount(amount)}
                              placeholder="0.0"
                              onChange={(e) => handleAmountChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              onWheel={(e) => {
                                (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <span className="ml-3 text-black text-sm font-semibold cursor-default select-none">
                              HPP
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3">
                            {PERCENTS.map((p) => (
                              <button
                                key={p}
                                onClick={() => setPercent(p)}
                                className="bg-white text-black rounded-[5px] py-2 font-semibold cursor-pointer"
                              >
                                {Math.round(p * 100)}%
                              </button>
                            ))}
                          </div>

                          <div className="mt-5">
                            <div className="text-base text-[#5DF23F] leading-[1.2] tracking-[0.8px] font-normal mt-2.5">
                              HPP will be available to withdraw 7 days after unstaking.
                            </div>
                          </div>

                          <div className="mt-5">
                            <Button
                              variant="white"
                              size="lg"
                              disabled={
                                isHppBalanceLoading || !!inputError || !amount || amount === '.' || Number(amount) <= 0
                              }
                              fullWidth
                              className={`${
                                isHppBalanceLoading || !!inputError || !amount || amount === '.' || Number(amount) <= 0
                                  ? '!bg-[#bfbfbf] !text-black !rounded-[5px]'
                                  : '!rounded-[5px]'
                              }`}
                            >
                              {isHppBalanceLoading ? 'Loading...' : inputError ? inputError : 'Unstake'}
                            </Button>
                          </div>
                        </>
                      )}

                      {activeTab === 'claim' && (
                        <>
                          {/* Available Claim Balance - Card 1 */}
                          <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-primary">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-white text-base font-semibold">Available Claim Balance</h3>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-5 h-5 text-white/80"
                                fill="currentColor"
                                aria-hidden
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-.75 6.75a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0v-6zm0 8.25a.75.75 0 101.5 0 .75.75 0 00-1.5 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>

                            <div className="rounded-[5px] bg-white flex items-center justify-between px-4 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="bg-transparent outline-none text-black text-base w-full"
                                defaultValue="6,000"
                              />
                              <span className="ml-3 text-black text-sm font-semibold">HPP</span>
                            </div>

                            <div className="mt-4">
                              <Button variant="black" size="lg" fullWidth>
                                Claim
                              </Button>
                            </div>
                          </div>

                          {/* Transactions - Card 2 */}
                          <div className="mt-2.5 rounded-[5px] p-6 min-[1200px]:p-8 bg-primary">
                            <div className="space-y-2.5">
                              {[
                                {
                                  date: '2025-01-18 16:34',
                                  note: 'Cooldown in 06:23:46:21',
                                  amount: '1,000,000 HPP',
                                  cooling: true,
                                },
                                {
                                  date: '2025-01-16 19:52',
                                  note: 'Cooldown in 06:23:46:21',
                                  amount: '20,000 HPP',
                                  cooling: true,
                                },
                                {
                                  date: '2025-01-14 7:19',
                                  note: 'You are able to claim.',
                                  amount: '1,000 HPP',
                                  cooling: false,
                                },
                                {
                                  date: '2025-01-13 13:48',
                                  note: 'You are able to claim.',
                                  amount: '5,000 HPP',
                                  cooling: false,
                                },
                              ].map((tx, idx) => (
                                <div key={idx} className="rounded-[5px] bg-[#3f43aa]/60 px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-white/90 text-[13px]">{tx.date}</div>
                                      <div
                                        className={
                                          tx.cooling ? 'text-green-400 text-[13px]' : 'text-white/80 text-[13px]'
                                        }
                                      >
                                        {tx.note}
                                      </div>
                                    </div>
                                    <div className="text-white text-sm font-semibold">{tx.amount}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
