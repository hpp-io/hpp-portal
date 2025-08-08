'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';
import WalletButton from '@/components/ui/WalletButton';
import MobileHeader from '@/components/ui/MobileHeader';
import { useToast } from '@/hooks/useToast';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { navItems, communityLinks } from '@/config/navigation';
import Big from 'big.js';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

// Constants
const AERGO_DECIMAL = 18;

export default function MigrationClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [migrationHash, setMigrationHash] = useState<`0x${string}` | null>(null);
  const [inputError, setInputError] = useState('');
  const [hppBalance, setHppBalance] = useState<string>('0');
  const [aergoBalance, setAergoBalance] = useState<string>('0');
  const { showToast, hideToast } = useToast();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  // Token Contract Addresses
  const HPP_TOKEN_ADDRESS = (
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? process.env.NEXT_PUBLIC_MAINNET_ETH_HPP_TOKEN_CONTRACT!
      : process.env.NEXT_PUBLIC_SEPOLIA_ETH_HPP_TOKEN_CONTRACT!
  ) as `0x${string}`;

  const AERGO_TOKEN_ADDRESS = (
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? process.env.NEXT_PUBLIC_MAINNET_ETH_AERGO_TOKEN_CONTRACT!
      : process.env.NEXT_PUBLIC_SEPOLIA_ETH_AERGO_TOKEN_CONTRACT!
  ) as `0x${string}`;

  // Contract hooks
  const { writeContractAsync: approveTokens } = useWriteContract();
  const { writeContractAsync: swapTokens } = useWriteContract();

  // HPP Balance query
  const {
    data: hppBalanceData,
    refetch: refetchHppBalance,
    isLoading: isHppBalanceLoading,
  } = useReadContract({
    address: HPP_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // AERGO Balance query
  const {
    data: aergoBalanceData,
    refetch: refetchAergoBalance,
    isLoading: isAergoBalanceLoading,
  } = useReadContract({
    address: AERGO_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Wait for approval transaction
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash as `0x${string}` | undefined,
  });

  // Wait for migration transaction
  const { isSuccess: isMigrationSuccess } = useWaitForTransactionReceipt({
    hash: migrationHash as `0x${string}` | undefined,
  });

  // Update HPP balance when data changes
  useEffect(() => {
    console.log('HPP Balance Data:', hppBalanceData);
    console.log('Address:', address);
    console.log('Is Connected:', isConnected);

    if (hppBalanceData) {
      const balance = formatUnits(hppBalanceData, AERGO_DECIMAL);
      const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      console.log('Formatted HPP Balance:', formattedBalance);
      setHppBalance(formattedBalance);
    }
  }, [hppBalanceData, address, isConnected]);

  // Update AERGO balance when data changes
  useEffect(() => {
    console.log('AERGO Balance Data:', aergoBalanceData);

    if (aergoBalanceData) {
      const balance = formatUnits(aergoBalanceData, AERGO_DECIMAL);
      const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      console.log('Formatted AERGO Balance:', formattedBalance);
      setAergoBalance(formattedBalance);
    }
  }, [aergoBalanceData]);

  // Refetch balance after successful migration
  useEffect(() => {
    if (isMigrationSuccess) {
      refetchHppBalance();
      refetchAergoBalance();
    }
  }, [isMigrationSuccess, refetchHppBalance, refetchAergoBalance]);

  // Utility function to create Etherscan link
  const createEtherscanLink = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet') => {
    const baseUrl = network === 'mainnet' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  // Utility function to handle successful migration
  const handleMigrationSuccess = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet') => {
    const etherscanUrl = createEtherscanLink(txHash, network);

    showToast('Migration completed', 'Your tokens have been successfully migrated to HPP network.', 'success', {
      text: 'View on Etherscan',
      url: etherscanUrl,
    });

    // Refetch balance after successful migration
    refetchHppBalance();
  };

  // Utility function to handle migration error
  const handleMigrationError = (error: string) => {
    showToast('Migration failed', error, 'error');
  };

  const handleFromAmountChange = (value: string) => {
    // Prevent negative values
    if (value.startsWith('-')) {
      return;
    }

    setFromAmount(value);
    setInputError(''); // Clear previous errors

    // Calculate to amount based on selectedToValue and exchange rate
    if (value === '' || isNaN(parseFloat(value))) {
      setToAmount('');
      return;
    }

    const numericValue = parseFloat(value);

    // Validate input
    if (numericValue <= 0) {
      setInputError('Amount must be greater than 0');
      setToAmount('');
      return;
    }

    if (numericValue > 1000000) {
      setInputError('Amount cannot exceed 1,000,000');
      setToAmount('');
      return;
    }

    try {
      const fromAmountBig = new Big(value);

      // Only HPP conversion: 1 AERGO = 2.45 HPP
      const exchangeRate = new Big('2.45');
      const calculatedValue = fromAmountBig.times(exchangeRate);

      // Format the result - remove trailing zeros after decimal point
      const formattedValue = calculatedValue.toString();
      setToAmount(formattedValue.replace(/\.?0+$/, ''));
    } catch (error) {
      console.error('Error calculating amount:', error);
      setToAmount('');
      setInputError('Invalid amount format');
    }
  };

  const handleMaxClick = () => {
    setFromAmount('1234.56');
    setToAmount('3025.67');
  };

  const handleMigrationClick = async () => {
    if (!isConnected || !address) {
      showToast('Error', 'Please connect your wallet first', 'error');
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setInputError('Please enter a valid amount');
      return;
    }

    if (inputError) {
      return; // Don't proceed if there's an input error
    }

    try {
      setIsApproving(true);
      setIsSwapping(false);

      const aergoTokenContract =
        process.env.NEXT_PUBLIC_ENV === 'production'
          ? MAINNET_ETH_AERGO_TOKEN_CONTRACT
          : SEPOLIA_ETH_AERGO_TOKEN_CONTRACT;

      const hppMigrationContract =
        process.env.NEXT_PUBLIC_ENV === 'production'
          ? MAINNET_ETH_HPP_MIGRATION_CONTRACT
          : SEPOLIA_ETH_HPP_MIGRATION_CONTRACT;

      const amountInWei = parseUnits(fromAmount, 18); // AERGO has 18 decimals

      // First, approve the migration contract to spend AERGO tokens
      showToast('Approving...', 'Please wait while we approve the transaction...', 'loading');

      const approveHash = await approveTokens({
        address: aergoTokenContract as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [hppMigrationContract as `0x${string}`, amountInWei],
      });

      setApproveHash(approveHash);
      showToast('Approval sent', 'Waiting for approval confirmation...', 'loading');
    } catch (error: any) {
      console.error('Error approving tokens:', error);
      showToast('Approval failed', error.message || 'Failed to approve tokens', 'error');
      setIsApproving(false);
    }
  };

  // Handle approval success and start migration
  useEffect(() => {
    if (isApproveSuccess && isApproving) {
      setIsApproving(false);
      setIsSwapping(true);
      handleSwapAergoForHpp();
    }
  }, [isApproveSuccess, isApproving]);

  const handleSwapAergoForHpp = async () => {
    try {
      const hppMigrationContract =
        process.env.NEXT_PUBLIC_ENV === 'production'
          ? MAINNET_ETH_HPP_MIGRATION_CONTRACT
          : SEPOLIA_ETH_HPP_MIGRATION_CONTRACT;

      const amountInWei = parseUnits(fromAmount, 18);

      showToast('Migrating...', 'Starting HPP migration. Please wait...', 'loading');

      const migrationHash = await swapTokens({
        address: hppMigrationContract as `0x${string}`,
        abi: hppMigrationABI,
        functionName: 'swapAergoForHPP',
        args: [amountInWei],
      });

      setMigrationHash(migrationHash);
      showToast('Migration sent', 'Waiting for migration confirmation...', 'loading');
    } catch (error: any) {
      console.error('Error migrating tokens:', error);
      showToast('Migration failed', error.message || 'Failed to migrate tokens', 'error');
      setIsSwapping(false);
    }
  };

  // Handle migration success
  useEffect(() => {
    if (isMigrationSuccess && migrationHash) {
      setIsSwapping(false);
      handleMigrationSuccess(migrationHash, chainId === 11155111 ? 'sepolia' : 'mainnet');
      // Reset form
      setFromAmount('');
      setToAmount('');
      setApproveHash(null);
      setMigrationHash(null);
    }
  }, [isMigrationSuccess, migrationHash, chainId]);

  const transactionHistory = [
    {
      id: 1,
      type: 'Migration AERGO → HPP',
      date: '2025-01-13 16:45:28',
      amount: '200 AERGO → 490 HPP',
      status: 'Pending',
      icon: (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 2,
      type: 'Migration AERGO → HPP',
      date: '2025-01-15 14:32:15',
      amount: '100 AERGO → 245 HPP',
      status: 'Completed',
      icon: (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      id: 3,
      type: 'Migration AERGO → HPP',
      date: '2025-01-14 09:15:42',
      amount: '50 AERGO → 122.5 HPP',
      status: 'Completed',
      icon: (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-white overflow-x-hidden" style={{ width: '100vw', maxWidth: '100vw' }}>
      <Sidebar
        navItems={navItems}
        communityLinks={communityLinks}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? 'opacity-50 lg:opacity-100' : ''
        }`}
      >
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="p-4 lg:p-8 max-w-6xl mx-auto" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="lg:max-w-full 2xl:max-w-[80%] mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-medium text-gray-900 mb-3">Migrate to HPP</h1>
              <p className="text-gray-700 text-lg">
                Move your AERGO tokens to the HPP Layer2 network using the <br />
                appropriate migration path based on your source chain.
              </p>
              <p className="text-[#FF2600] text-lg">Migration Page will be activated soon.</p>
            </div>

            {/* Migration Cards */}
            <div className="space-y-8">
              {/* Step 1 Card */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex items-start mb-6">
                    <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white font-semibold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-medium text-gray-900 mb-3">AERGO (Mainnet) → HPP (ETH)</h2>
                      <p className="text-gray-700">
                        If you hold AERGO on the <strong>AERGO mainnet</strong>, use the official Aergo Bridge to
                        migrate to HPP via Ethereum.
                      </p>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center space-x-8">
                      {/* AERGO Mainnet */}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-16 bg-[#374151] rounded-lg flex items-center justify-center mb-3">
                          <span className="text-white text-base font-medium">AERGO</span>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">AERGO Mainnet</span>
                      </div>

                      {/* Aergo Bridge */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-3">
                          <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                          <svg
                            className="w-4 sm:w-5 md:w-6 h-3 sm:h-4 text-gray-400 mx-0.5 sm:mx-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M2 12h16M12 6l6 6-6 6"
                            />
                          </svg>
                          <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">Aergo Bridge</span>
                      </div>

                      {/* HPP (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center mb-3">
                          <span className="text-white text-base font-medium">HPP</span>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">HPP (ETH)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <Button
                      variant="primary"
                      size="md"
                      href="https://bridge.aergo.io/"
                      external={true}
                      className="flex items-center justify-center space-x-2 whitespace-nowrap"
                    >
                      Go to Aergo Bridge
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      className="flex items-center justify-center space-x-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <span>View Step-by-Step Guide</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex items-start mb-6">
                    <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white font-semibold text-sm">2</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-medium text-gray-900 mb-3">AERGO (ETH) → HPP (ETH)</h2>
                      <p className="text-gray-700">
                        If your AERGO tokens are already on Ethereum, use HPP's migration bridge to move them directly
                        to the HPP network.
                      </p>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center space-x-8">
                      {/* AERGO (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-16 bg-[#374151] rounded-lg flex items-center justify-center mb-3">
                          <span className="text-white text-base font-medium">AERGO</span>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">AERGO (ETH)</span>
                      </div>

                      {/* HPP Bridge */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-3">
                          <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                          <svg
                            className="w-4 sm:w-5 md:w-6 h-3 sm:h-4 text-gray-400 mx-0.5 sm:mx-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M2 12h16M12 6l6 6-6 6"
                            />
                          </svg>
                          <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">HPP Bridge</span>
                      </div>

                      {/* HPP (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center mb-3">
                          <span className="text-white text-base font-medium">HPP</span>
                        </div>
                        <span className="text-sm text-gray-700 text-center whitespace-nowrap">HPP (ETH)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center space-x-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>View Step-by-Step Guide</span>
                    </Button>

                    {isConnected ? (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <svg
                                className="w-5 h-5 text-gray-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span className="text-gray-700">Wallet Connected</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 font-mono">{address}</div>
                          </div>
                          <WalletButton />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <svg
                              className="w-5 h-5 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                              />
                            </svg>
                            <span className="text-gray-700">Connect your wallet to start migration</span>
                          </div>
                          <WalletButton />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Token Migration Form */}
                  {isConnected && (
                    <div className="mt-8">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        {/* From Section */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-600">From</label>
                            <span className="text-sm text-gray-500">
                              Balance: {isAergoBalanceLoading ? 'Loading...' : `${aergoBalance || '0'} AERGO`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="number"
                                min="0"
                                value={fromAmount === '' ? '' : fromAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || parseFloat(value) >= 0) {
                                    handleFromAmountChange(value);
                                  }
                                }}
                                className={`w-full py-3 border-0 rounded-lg focus:outline-none focus:ring-0 text-lg bg-transparent pl-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  inputError ? 'border-red-500' : ''
                                }`}
                                placeholder="0.0"
                              />
                              {inputError && <div className="mt-1 text-sm text-red-600">{inputError}</div>}
                            </div>
                            <button className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">A</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">AERGO</span>
                            </button>
                          </div>
                        </div>

                        {/* Direction Indicator */}
                        <div className="flex justify-center mb-4">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* To Section */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-600">To</label>
                            <span className="text-sm text-gray-500">
                              Balance: {isHppBalanceLoading ? 'Loading...' : `${hppBalance || '0'} HPP`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              value={toAmount === '' ? '' : toAmount}
                              readOnly
                              className="flex-1 py-3 border-0 rounded-lg bg-transparent text-lg pl-0 cursor-default pointer-events-none"
                              placeholder="0.0"
                              style={{ cursor: 'default' }}
                            />
                            <div className="flex flex-col space-y-1">
                              <button className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">H</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">HPP</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Details */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Exchange Rate:</span>
                              <span className="text-gray-900">1 AERGO = 2.45 HPP</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Price Impact:</span>
                              <span className="text-gray-900">0.05%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Network Fee:</span>
                              <span className="text-gray-900">~$2.50</span>
                            </div>
                          </div>
                        </div>

                        {/* Migrate Button */}
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-6 rounded-lg"
                          onClick={handleMigrationClick}
                          disabled={isApproving || isSwapping}
                        >
                          {isApproving ? 'Approving...' : isSwapping ? 'Migrating...' : 'Migrate Tokens'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  {isConnected && (
                    <div className="mt-8">
                      <div className="bg-white border border-gray-100 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
                        <div className="space-y-2">
                          {transactionHistory.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  {tx.icon}
                                </div>
                                <div>
                                  <div className="text-sm font-normal text-gray-900">{tx.type}</div>
                                  <div className="text-xs text-gray-500">{tx.date}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-normal text-gray-900">{tx.amount}</div>
                                <div
                                  className={`text-xs font-medium ${
                                    tx.status === 'Completed' ? 'text-gray-600' : 'text-gray-500'
                                  }`}
                                >
                                  {tx.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-center">
                          <a href="#" className="text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                            View All Transactions
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Your Migration Section */}
              <div className="bg-[#F3F4F6] -mx-4 lg:-mx-8 xl:-mx-32 2xl:-mx-64 px-4 lg:px-8 py-8 mt-12">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-medium text-gray-900 mb-3">Complete Your Migration</h2>
                  <p className="text-gray-700">
                    Once you have HPP tokens on Ethereum, bridge them to the native HPP <br />
                    network for full ecosystem access and benefits.
                  </p>
                </div>

                <div className="max-w-4xl mx-auto">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-center">
                      <h3 className="text-xl font-normal text-gray-900 mb-4">HPP (ETH) → HPP Native</h3>
                      <p className="text-gray-700 mb-6">
                        Use the Arbitrum Canonical Bridge to move your tokens to the native HPP network.
                      </p>
                    </div>

                    {/* Flow Diagram */}
                    <div className="flex items-center justify-center mb-6">
                      <div className="flex items-center space-x-8">
                        {/* HPP (ETH) */}
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-16 bg-[#374151] rounded-lg flex items-center justify-center mb-3">
                            <span className="text-white text-base font-medium">HPP</span>
                          </div>
                          <span className="text-sm text-gray-700 text-center whitespace-nowrap">Ethereum</span>
                        </div>

                        {/* Arbitrum Bridge */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center mb-3">
                            <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                            <svg
                              className="w-4 sm:w-5 md:w-6 h-3 sm:h-4 text-gray-400 mx-0.5 sm:mx-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M2 12h16M12 6l6 6-6 6"
                              />
                            </svg>
                            <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-gray-300"></div>
                          </div>
                        </div>

                        {/* HPP Native */}
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center mb-3">
                            <span className="text-white text-base font-medium">HPP</span>
                          </div>
                          <span className="text-sm text-gray-700 text-center whitespace-nowrap">Native</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="text-center">
                      <Button
                        variant="primary"
                        size="lg"
                        href="https://bridge.arbitrum.io/?sourceChain=ethereum&destinationChain=hpp-mainnet&tab=bridge"
                        external={true}
                        className="flex items-center justify-center space-x-2 mx-auto"
                      >
                        Go to Bridge
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Need Help Section */}
              <NeedHelp />
            </div>
          </div>
        </div>
      </main>

      {/* Toast Component */}
      {/* The Toast component is now managed by the useToast hook */}
    </div>
  );
}

// Contract addresses and ABIs
const MAINNET_ETH_AERGO_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_MAINNET_ETH_AERGO_TOKEN_CONTRACT!;
const SEPOLIA_ETH_AERGO_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_SEPOLIA_ETH_AERGO_TOKEN_CONTRACT!;
const MAINNET_ETH_HPP_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_MAINNET_ETH_HPP_TOKEN_CONTRACT!;
const SEPOLIA_ETH_HPP_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_SEPOLIA_ETH_HPP_TOKEN_CONTRACT!;
const MAINNET_ETH_HPP_MIGRATION_CONTRACT = process.env.NEXT_PUBLIC_MAINNET_ETH_HPP_MIGRATION_CONTRACT!;
const SEPOLIA_ETH_HPP_MIGRATION_CONTRACT = process.env.NEXT_PUBLIC_SEPOLIA_ETH_HPP_MIGRATION_CONTRACT!;

// HPP Migration Contract ABI
const hppMigrationABI = [
  {
    name: 'swapAergoForHPP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    modifiers: ['nonReentrant', 'whenNotPaused'],
  },
] as const;
