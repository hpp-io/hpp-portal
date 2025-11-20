'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';
import WalletButton from '@/components/ui/WalletButton';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { useToast } from '@/hooks/useToast';
import {
  useAccount,
  useDisconnect,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { navItems, communityLinks } from '@/config/navigation';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import Big from 'big.js';
import dayjs from 'dayjs';
import Image from 'next/image';
import {
  AergoMainnet,
  HPPEth,
  HPPMainnet,
  AergoEth,
  AqtEth,
  WalletIcon,
  AergoToken,
  AQTToken,
  HPPToken,
  CompleteIcon,
  PendingIcon,
  FailedIcon,
  TransactionsIcon,
} from '@/assets/icons';
import { useRouter } from 'next/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import axios from 'axios';
import { hppMigrationABI } from './abi';
import { useEnsureChain } from '@/lib/wallet';

// Constants
const AERGO_DECIMAL = 18;

// AQT fixed rate: 1 AQT = 7.43026 HPP (no decimals allowed for AQT input)
const AQT_TO_HPP_RATE = new Big('7.43026');
const AERGO_TO_HPP_RATE = new Big('1');

function computeHppFromToken(amount: string, token: MigrationToken): string {
  try {
    let rate: Big;
    if (token === 'AQT') {
      rate = AQT_TO_HPP_RATE;
    } else {
      // AERGO
      rate = AERGO_TO_HPP_RATE;
    }

    const hpp = new Big(amount || '0').times(rate);
    // Keep up to 5 decimals as the rate has 5 dp
    return hpp.toFixed(5);
  } catch {
    return amount;
  }
}

// Transaction interface
interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: string;
  status: 'Pending' | 'Completed' | 'Failed';
  hash: string;
  icon: React.ReactNode;
  network: 'mainnet' | 'sepolia';
}

type MigrationToken = 'AERGO' | 'AQT';

export default function MigrationClient({ token = 'AERGO' }: { token?: MigrationToken }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [migrationHash, setMigrationHash] = useState<`0x${string}` | null>(null);
  const [inputError, setInputError] = useState('');
  const [hppBalance, setHppBalance] = useState<string>('0');
  const [balance, setBalance] = useState<string>('0');
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const approvalInFlightRef = useRef<boolean>(false);
  const migrationInFlightRef = useRef<boolean>(false);

  const { showToast } = useToast();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const router = useRouter();
  const ensureChain = useEnsureChain();

  // Ensure wallet is on Ethereum network (mainnet or sepolia) for migration writes
  const selectedChainEnv = (process.env.NEXT_PUBLIC_CHAIN || 'mainnet').toLowerCase();
  const ETH_CHAIN_ID = selectedChainEnv === 'sepolia' ? 11155111 : 1;

  const ensureEthChain = async () => {
    const isMainnet = ETH_CHAIN_ID === 1;
    const chainName = isMainnet ? 'Ethereum Mainnet' : 'Ethereum Sepolia';
    const rpcUrls = isMainnet ? ['https://eth.llamarpc.com'] : ['https://rpc.sepolia.org'];
    await ensureChain(ETH_CHAIN_ID, {
      chainName,
      rpcUrls,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    });
  };

  // Decide whether to swap to server list or keep current (to preserve local Pending until resolved)
  const updateHistoryWithServer = (incoming: Transaction[]) => {
    // Ensure newest first just in case
    const sortedIncoming = [...incoming].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactionHistory((prev) => {
      const pendingIds = new Set(prev.filter((t) => t.status === 'Pending').map((t) => t.id));
      const pendingResolved = sortedIncoming.some((t) => pendingIds.has(t.id) && t.status !== 'Pending');

      if (pendingResolved) {
        // Swap to server list when any local pending is now resolved on server
        return sortedIncoming;
      }

      // If there are no local pendings, swap whenever server data differs
      if (pendingIds.size === 0) {
        const prevNonPending = prev.filter((t) => t.status !== 'Pending');
        const sameLength = prevNonPending.length === sortedIncoming.length;
        const same =
          sameLength &&
          prevNonPending.every(
            (t, i) =>
              t.id === sortedIncoming[i].id &&
              t.status === sortedIncoming[i].status &&
              t.amount === sortedIncoming[i].amount
          );
        return same ? prev : sortedIncoming;
      }

      // Otherwise keep showing local pending until server confirms it
      return prev;
    });
  };

  // Token Contract Addresses (single source)
  // Build-time provides environment-specific values for these variables.
  const HPP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ETH_HPP_TOKEN_CONTRACT as `0x${string}`;
  const ADDRESSES = {
    AERGO: {
      token: process.env.NEXT_PUBLIC_ETH_AERGO_TOKEN_CONTRACT as `0x${string}`,
      migration: process.env.NEXT_PUBLIC_ETH_AERGO_HPP_MIGRATION_CONTRACT as `0x${string}`,
    },
    AQT: {
      token: process.env.NEXT_PUBLIC_ETH_AQT_TOKEN_CONTRACT as `0x${string}`,
      migration: process.env.NEXT_PUBLIC_ETH_AQT_HPP_MIGRATION_CONTRACT as `0x${string}`,
    },
  } as const;
  const FROM_TOKEN_ADDRESS = ADDRESSES[token].token;
  const MIGRATION_CONTRACT_ADDRESS = ADDRESSES[token].migration;

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

  // From-token Balance query
  const {
    data: balanceData,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: FROM_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Reset balances and refetch when account changes
  useEffect(() => {
    if (!isConnected || !address) {
      setHppBalance('0');
      setBalance('0');
      return;
    }
    // Optimistically clear while fetching new owner's balances
    setHppBalance('0');
    setBalance('0');
    refetchHppBalance();
    refetchBalance();
  }, [address, isConnected, refetchHppBalance, refetchBalance]);

  // Allowance query for migration contract (from token -> migration contract)
  const {
    data: allowanceData,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: FROM_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, MIGRATION_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Wait for approval transaction
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash as `0x${string}` | undefined,
  });

  // Track approval status based on current allowance
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'needs_approval'>('pending');

  // Tracks if user has successfully approved tokens to prevent bypassing approval
  const [localApprovalSuccess, setLocalApprovalSuccess] = useState(false);

  // Wait for migration transaction
  const { isSuccess: isMigrationSuccess, isError: isMigrationError } = useWaitForTransactionReceipt({
    hash: migrationHash as `0x${string}` | undefined,
  });

  // Update HPP balance when data changes
  useEffect(() => {
    if (hppBalanceData) {
      const balance = formatUnits(hppBalanceData, AERGO_DECIMAL);
      const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      setHppBalance(formattedBalance);
    }
  }, [hppBalanceData, address, isConnected]);

  // Update from-token balance when data changes
  useEffect(() => {
    if (balanceData) {
      const balance = formatUnits(balanceData, AERGO_DECIMAL);
      const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      setBalance(formattedBalance);
    }
  }, [balanceData]);

  // Update allowance when address or contract changes
  useEffect(() => {
    if (address && isConnected) {
      refetchAllowance();
    }
  }, [address, isConnected, refetchAllowance]);

  // Update approval status based on current allowance and input amount
  useEffect(() => {
    if (allowanceData && fromAmount && parseFloat(fromAmount) > 0) {
      const amountInWei = parseUnits(fromAmount, 18);
      if (allowanceData >= amountInWei) {
        setApprovalStatus('approved');
      } else {
        setApprovalStatus('needs_approval');
      }
    } else {
      setApprovalStatus('pending');
    }
  }, [allowanceData, fromAmount]);

  // Removed auto-refresh of history after migration success to preserve pending -> completed UX

  // Utility function to create Etherscan link
  const createEtherscanLink = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet') => {
    const baseUrl = network === 'mainnet' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  // No background polling: status changes only on explicit refresh/View All

  // Polling state management
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Start polling for a specific transaction
  const startTransactionPolling = (txHash: string, walletAddress: string) => {
    // Clear any existing polling for this transaction
    if (pollingRefs.current.has(txHash)) {
      clearTimeout(pollingRefs.current.get(txHash)!);
    }

    const pollTransaction = async () => {
      try {
        // Check if transaction is still pending in our local state
        const currentHistory = transactionHistory.find((tx) => tx.id === txHash);

        if (!currentHistory || currentHistory.status !== 'Pending') {
          // Transaction is no longer pending, stop polling
          pollingRefs.current.delete(txHash);
          return;
        }

        // Fetch latest history to check for status updates
        const fetchedTransactions = await fetchTransactionHistory(walletAddress);

        // Check if the specific transaction is now completed in the fetched data
        if (fetchedTransactions && fetchedTransactions.length > 0) {
          const completedTx = fetchedTransactions.find((tx: Transaction) => tx.id === txHash);

          if (completedTx) {
            // Transaction found in server data, it's completed
            pollingRefs.current.delete(txHash);
            return;
          }
        }

        // Transaction still not found in server data, continue polling
        const timeoutId = setTimeout(pollTransaction, 10000); // Poll every 10 seconds
        pollingRefs.current.set(txHash, timeoutId);
      } catch (error) {
        console.error('Error during transaction polling:', error);
        // Continue polling even if there's an error
        const timeoutId = setTimeout(pollTransaction, 15000); // Retry after 15 seconds on error
        pollingRefs.current.set(txHash, timeoutId);
      }
    };

    // Start first poll after 5 seconds
    const initialTimeoutId = setTimeout(pollTransaction, 5000);
    pollingRefs.current.set(txHash, initialTimeoutId);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      pollingRefs.current.clear();
    };
  }, []);

  // Utility function to handle successful migration
  const handleMigrationSuccess = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet') => {
    const etherscanUrl = createEtherscanLink(txHash, network);

    showToast('Migration completed', 'Your tokens have been successfully migrated to HPP network.', 'success', {
      text: 'View on Etherscan',
      url: etherscanUrl,
    });

    // Refetch balance after successful migration
    refetchHppBalance();

    // Start polling for transaction status updates
    if (address && migrationHash) {
      startTransactionPolling(migrationHash, address);
    }
  };

  // Fetch transaction history from Blockscout (Etherscan-compatible API)
  const fetchTransactionHistory = async (walletAddress: string) => {
    if (!walletAddress) return;

    setIsLoadingHistory(true);
    try {
      const network: 'mainnet' | 'sepolia' = chainId === 11155111 ? 'sepolia' : 'mainnet';

      // Use large offset to get maximum results in single request
      const largeOffset = 10000; // Etherscan max is 10000
      // Call Blockscout directly from the client (no proxy)
      const baseUrl =
        network === 'sepolia' ? 'https://eth-sepolia.blockscout.com/api' : 'https://eth.blockscout.com/api';
      const requestParams = `module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&offset=${largeOffset}&sort=desc`;
      const requestUrl = `${baseUrl}?${requestParams}`;
      const tokenTxResponse = await axios.get(requestUrl, { headers: { accept: 'application/json' } });
      const tokenTxData = tokenTxResponse.data;

      if (tokenTxData.status === '1') {
        const walletLc = walletAddress.toLowerCase();
        const contractLc = MIGRATION_CONTRACT_ADDRESS.toLowerCase();

        // Filter for migration-related token transfers
        const relevantTransactions = (tokenTxData.result || [])
          .filter((tx: any) => {
            // Find transfers where user sends tokens TO the migration contract
            return tx.from?.toLowerCase() === walletLc && tx.to?.toLowerCase() === contractLc;
          })
          .map((tx: any) => {
            const type = `Migration: ${token} → HPP`;
            let status: Transaction['status'] = 'Completed';

            // Get actual token amount from the transfer
            const fromAmount = formatUnits(BigInt(tx.value), parseInt(tx.tokenDecimal));
            let toAmount = fromAmount;

            // Calculate HPP amount using the conversion rate
            toAmount = computeHppFromToken(fromAmount, token);

            return {
              id: tx.hash,
              type,
              date: dayjs(parseInt(tx.timeStamp) * 1000).format('YYYY-MM-DD HH:mm:ss'),
              amount: `${parseFloat(fromAmount).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              })} ${token} → ${parseFloat(toAmount).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              })} HPP`,
              status,
              hash: tx.hash,
              network,
              icon: getTransactionIcon(type, status),
            } as Transaction;
          });

        // Sort by date (newest first)
        relevantTransactions.sort(
          (a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        updateHistoryWithServer(relevantTransactions);
        return relevantTransactions;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      showToast('Error', 'Failed to fetch transaction history.', 'error');
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Get appropriate icon for transaction type and status
  const getTransactionIcon = (type: Transaction['type'], status: Transaction['status']) => {
    if (status === 'Pending') {
      return <PendingIcon className="w-8.5 h-8.5 text-white" />;
    } else if (status === 'Completed') {
      return <CompleteIcon className="w-8.5 h-8.5 text-black" />;
    } else {
      return <FailedIcon className="w-8.5 h-8.5 text-white" />;
    }
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

    // Check if amount exceeds balance (using Big.js for precision)
    if (balance) {
      try {
        const balanceBig = new Big(balance.replace(/,/g, ''));
        const amountBig = new Big(value);
        if (amountBig.gt(balanceBig)) {
          setInputError(`Insufficient balance. You have ${balanceBig.toFixed()} ${token}`);
          setToAmount('');
          return;
        }
      } catch (error) {
        // If Big.js fails, fallback to regular comparison
        if (numericValue > parseFloat(balance.replace(/,/g, ''))) {
          setInputError(`Insufficient balance. You have ${parseFloat(balance.replace(/,/g, '')).toFixed(4)} ${token}`);
          setToAmount('');
          return;
        }
      }
    }

    // Check if amount is too small (minimum 0.0001)
    if (numericValue < 0.0001) {
      setInputError('Amount must be at least 0.0001');
      setToAmount('');
      return;
    }

    // Conversion: AERGO 1:1, AQT 1:7.43026 (integer math via big.js)
    if (token === 'AERGO') {
      setToAmount(value);
    } else {
      // AQT: whole tokens only (no decimals)
      if (!/^\d*$/.test(value)) {
        setInputError('AQT supports whole tokens only');
        setToAmount('');
        return;
      }
      const quoted = computeHppFromToken(value || '0', token);
      setToAmount(quoted);
    }
  };

  // Fetch transaction history when wallet connects or chain changes
  useEffect(() => {
    if (isConnected && address) {
      // reset paging state
      setTransactionHistory([]);
      setShowAllHistory(false);
      // Initial history fetch is safe now due to merge logic
      fetchTransactionHistory(address);
    }
  }, [isConnected, address, chainId]);

  // Validation function to check if migration button should be disabled
  const isMigrationDisabled = () => {
    if (!isConnected || !address) return true;
    if (!fromAmount || parseFloat(fromAmount) <= 0) return true;
    if (inputError) return true;
    if (isApproving || isSwapping) return true;
    if (isBalanceLoading) return true; // Disable while balance is loading

    // Check if amount exceeds balance (using Big.js for precision)
    if (balance && fromAmount) {
      try {
        const balanceBig = new Big(balance.replace(/,/g, ''));
        const amountBig = new Big(fromAmount);
        if (amountBig.gt(balanceBig)) return true;
      } catch (error) {
        // If Big.js fails, fallback to regular comparison
        if (parseFloat(fromAmount) > parseFloat(balance.replace(/,/g, ''))) return true;
      }
    }

    // Check if amount is too small
    if (parseFloat(fromAmount) < 0.0001) return true;

    return false;
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
      const amountInWei = parseUnits(fromAmount, 18);

      // First, refresh allowance data to get the latest state
      await refetchAllowance();

      // Wait a bit for the data to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we have sufficient allowance
      if (allowanceData && allowanceData >= amountInWei) {
        // Sufficient allowance exists, proceed directly to migration
        setIsSwapping(true);
        handleSwapAergoForHpp();
      } else {
        // Need to approve first
        setIsApproving(true);
        setIsSwapping(false);

        showToast('Approving...', 'Please wait while we approve the transaction...', 'loading');

        await ensureEthChain();
        const approveHash = await approveTokens({
          address: FROM_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [MIGRATION_CONTRACT_ADDRESS, amountInWei],
        });

        setApproveHash(approveHash);
        showToast('Approval sent', 'Waiting for approval confirmation...', 'loading');
        approvalInFlightRef.current = true;
        setTimeout(() => {
          if (approvalInFlightRef.current) {
            showToast('Approval sent', 'The network may be busy.\nPlease hold on a moment.', 'loading');
          }
        }, 7000);
      }
    } catch (error: any) {
      showToast('Error', error.message || 'Failed to process migration', 'error');
      setIsApproving(false);
      setIsSwapping(false);
      approvalInFlightRef.current = false;
    }
  };

  // Handle approval success and start migration
  useEffect(() => {
    if (isApproveSuccess && isApproving) {
      approvalInFlightRef.current = false;
      setLocalApprovalSuccess(true);
      setIsApproving(false);
      // Refresh allowance data and then proceed to migration
      refetchAllowance().then(() => {
        setIsSwapping(true);
        handleSwapAergoForHpp();
      });
    }
  }, [isApproveSuccess, isApproving, refetchAllowance]);

  // Reset approval success when approval status changes to needs_approval
  useEffect(() => {
    if (approvalStatus === 'needs_approval' && localApprovalSuccess) {
      // Reset local approval success to force re-approval
      setLocalApprovalSuccess(false);
      setApproveHash(null);
    }
  }, [approvalStatus, localApprovalSuccess]);

  const lastSubmittedAmountRef = useRef<string>('');

  const handleSwapAergoForHpp = async () => {
    try {
      const hppMigrationContract = MIGRATION_CONTRACT_ADDRESS;

      const amountInWei = parseUnits(fromAmount, 18);

      showToast('Migrating...', 'Starting HPP migration. Please wait...', 'loading');

      // cache amount for later status updates
      lastSubmittedAmountRef.current = fromAmount;

      await ensureEthChain();
      const migrationHash = await swapTokens({
        address: hppMigrationContract as `0x${string}`,
        abi: hppMigrationABI,
        functionName: token === 'AERGO' ? 'swapAergoForHPP' : 'migrateAQTtoHPP',
        args: [amountInWei],
      });

      setMigrationHash(migrationHash);
      showToast('Migration sent', 'Waiting for migration confirmation...', 'loading');
      migrationInFlightRef.current = true;
      // Insert pending entry immediately
      try {
        const numeric = parseFloat(lastSubmittedAmountRef.current);
        const formatted = isNaN(numeric)
          ? lastSubmittedAmountRef.current
          : numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const network: 'mainnet' | 'sepolia' = chainId === 11155111 ? 'sepolia' : 'mainnet';
        // Calculate HPP amount for migrations
        let hppAmount = formatted;
        if (token === 'AQT') {
          hppAmount = computeHppFromToken(lastSubmittedAmountRef.current, token);
        }

        const pendingTx: Transaction = {
          id: migrationHash,
          type: `Migration: ${token} → HPP`,
          date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          amount: `${formatted} ${token} → ${hppAmount} HPP`,
          status: 'Pending',
          hash: migrationHash,
          network,
          icon: getTransactionIcon('Migration', 'Pending'),
        } as Transaction;
        setTransactionHistory((prev) => [pendingTx, ...prev.filter((t) => t.id !== migrationHash)]);
      } catch {}

      setTimeout(() => {
        if (migrationInFlightRef.current) {
          showToast('Migration sent', 'The network may be busy.\nPlease hold on a moment.', 'loading');
        }
      }, 7000);
    } catch (error: any) {
      console.error('Error migrating tokens:', error);
      showToast('Migration failed', error.message || 'Failed to migrate tokens', 'error');
      setIsSwapping(false);
      migrationInFlightRef.current = false;
    }
  };

  // Handle migration success (do not force-complete locally); no auto history refresh
  useEffect(() => {
    if (!(isMigrationSuccess && migrationHash)) return;

    setIsSwapping(false);
    migrationInFlightRef.current = false;
    handleMigrationSuccess(migrationHash, chainId === 11155111 ? 'sepolia' : 'mainnet');
    // Reset form fields only; keep history pending until explicit refresh/merge
    setFromAmount('');
    setToAmount('');
    setApproveHash(null);
    setMigrationHash(null);
    setLocalApprovalSuccess(false);
    // Keep balances refresh; avoids history overwrite
    refetchHppBalance();
    refetchBalance();
    refetchAllowance();

    // No automatic history refetch; user triggers refresh manually
  }, [isMigrationSuccess, migrationHash, chainId, refetchHppBalance, refetchBalance, refetchAllowance]);

  // Handle migration error (failed) - keep status strictly from server/polling
  useEffect(() => {
    if (isMigrationError && migrationHash) {
      setIsSwapping(false);
      migrationInFlightRef.current = false;
      // Do not force-fail in UI; rely on polling or manual refresh to reflect failure
    }
  }, [isMigrationError, migrationHash, chainId]);

  // no timers to clean up; timeouts check a ref flag instead

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
          {/* Go Back Button */}
          <div className="ml-4 max-w-6xl mx-auto mb-4 mt-3">
            <Button
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-1 cursor-pointer !bg-[#121212] text-white rounded-[5px]"
            >
              <svg className="w-4 h-4 text-[#FFFFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Go Back</span>
            </Button>
          </div>

          <div className="bg-[#121212] border-b border-[#161616] py-7.5">
            <div className="px-4 max-w-6xl mx-auto">
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white">
                Migrate to HPP
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl">
                Move your {token} tokens to the HPP Mainnet using the official migration paths.
                <br />
                Follow the steps carefully to ensure a secure and complete migration.
              </p>
              <div className="mt-5">
                <Button
                  variant="white"
                  size="lg"
                  className="cursor-pointer"
                  onClick={() => {
                    const guideUrl =
                      token === 'AERGO'
                        ? 'https://paper.hpp.io/guide/AERGO_Migration_Guide_ENG_vF.pdf'
                        : 'https://paper.hpp.io/guide/AQT_Migration_Guide_ENG_vF.pdf';
                    window.open(guideUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  View Step-by-Step Guide
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            <h2 className="text-[30px] font-black text-white leading-[1.5em] mb-8 mt-12.5 min-[1400px]:mt-25">
              Step 1: Convert to HPP(ETH)
            </h2>
            {/* Migration Cards */}
            <div className="space-y-8">
              {/* Step 1 Card (AERGO only) */}
              {token === 'AERGO' && (
                <div className="bg-primary border border-[#161616] rounded-[5px]">
                  <div className="p-6">
                    <div className="flex items-start mb-5">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-white mb-3 tracking-[0em] leading-[1]">
                          AERGO(Mainnet) → HPP(ETH)
                        </h2>
                        <p className="text-base font-normal text-white tracking-[0.8px] text-left leading-[1.5]">
                          If you hold AERGO on the AERGO mainnet, use the official Aergo Bridge to migrate to HPP via
                          Ethereum.
                        </p>
                      </div>
                    </div>

                    {/* Flow Diagram */}
                    <div className="w-full h-min flex flex-row justify-center items-center p-5 overflow-hidden rounded-[5px]">
                      <div className="flex items-center gap-6 min-[480px]:gap-8 min-[640px]:gap-12 min-[810px]:gap-15">
                        {/* AERGO Mainnet */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                            <Image src={AergoMainnet} alt="AERGO Mainnet" />
                          </div>
                          <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                            AERGO
                            <br className="block min-[810px]:hidden" />
                            (Mainnet)
                          </span>
                        </div>

                        {/* Migration Arrow */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center mb-3">
                            <DotLottieReact
                              src="/lotties/RightArrow.lottie"
                              autoplay
                              loop
                              className="w-15 h-15 min-[400px]:w-25 min-[400px]:h-25 min-[810px]:w-[150px] min-[810px]:h-[150px]"
                            />
                          </div>
                        </div>

                        {/* HPP (ETH) */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                            <Image src={HPPEth} alt="HPP (ETH)" />
                          </div>
                          <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                            HPP
                            <br className="block min-[810px]:hidden" />
                            (ETH)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center mt-5">
                      <Button
                        variant="black"
                        size="lg"
                        href="https://bridge.aergo.io/"
                        external={true}
                        className="flex items-center justify-center space-x-2 whitespace-nowrap"
                      >
                        Go to Aergo Bridge
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Swap Card */}
              <div className="bg-primary border border-[#161616] rounded-[5px]">
                <div className="p-6">
                  <div className="flex items-start mb-5">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white mb-3 tracking-[0em] leading-[1] whitespace-pre-wrap break-words">
                        {token}(ETH) → HPP(ETH)
                      </h2>
                      <p className="text-base font-normal text-white tracking-[0.8px] text-left leading-[1.5] whitespace-pre-wrap break-words">
                        If your {token} tokens are already on Ethereum, connect your wallet and migrate directly.
                      </p>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="w-full h-min flex flex-row justify-center items-center p-5 overflow-hidden rounded-[5px]">
                    <div className="flex items-center gap-6 min-[480px]:gap-8 min-[640px]:gap-12 min-[810px]:gap-15">
                      {/* From token (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                          <Image src={token === 'AERGO' ? AergoEth : AqtEth} alt={`${token}(ETH)`} />
                        </div>
                        <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                          {token}
                          <br className="block min-[810px]:hidden" />
                          (ETH)
                        </span>
                      </div>

                      {/* Migration Arrow */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-3">
                          <DotLottieReact
                            src="/lotties/RightArrow.lottie"
                            autoplay
                            loop
                            className="w-15 h-15 min-[400px]:w-25 min-[400px]:h-25 min-[810px]:w-[150px] min-[810px]:h-[150px]"
                          />
                        </div>
                      </div>

                      {/* HPP (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                          <Image src={HPPEth} alt="HPP (ETH)" />
                        </div>
                        <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                          HPP
                          <br className="block min-[810px]:hidden" />
                          (ETH)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {isConnected ? (
                      <div className="mt-5 bg-primary rounded-lg p-4 border border-dashed border-white/50">
                        <div className="flex flex-col items-center text-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:text-left">
                          <div className="flex flex-col items-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:space-x-4 mb-4 min-[810px]:mb-0">
                            <WalletIcon className="w-12 h-12 text-white mb-3 min-[810px]:mb-0" />
                            <div className="flex flex-col items-center min-[810px]:items-start">
                              <span className="text-white font-semibold text-xl tracking-[0.8px] leading-[1.5em] min-[810px]:mb-0">
                                Wallet Connected
                              </span>
                              <div
                                className="text-base text-white font-normal tracking-[0.8px] leading-[1.5em] max-w-full text-center min-[810px]:text-left"
                                style={{
                                  wordBreak: 'break-all',
                                  overflowWrap: 'break-word',
                                  whiteSpace: 'normal',
                                }}
                              >
                                {address}
                              </div>
                            </div>
                          </div>
                          <Button variant="white" size="md" onClick={() => disconnect()} className="cursor-pointer">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center mt-5">
                        <WalletButton size="lg" />
                      </div>
                    )}
                  </div>

                  {/* Token Migration Form */}
                  {isConnected && (
                    <div className="mt-8">
                      <div className="overflow-hidden rounded-[5px]">
                        {/* From Section */}
                        <div className="bg-white rounded-lg p-5 mb-4">
                          <div className="flex justify-end mb-2">
                            <button
                              className="px-[10px] py-[3px] min-[810px]:px-[15px] min-[810px]:py-[5px] text-[10px] min-[810px]:text-xs bg-[#d9d9d9] text-black rounded-[5px] cursor-pointer hover:bg-[#d0d0d0] transition-colors"
                              onClick={() => {
                                const cleanBalance = (balance || '0').replace(/,/g, '');
                                handleFromAmountChange(cleanBalance);
                              }}
                            >
                              Max
                            </button>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm min-[810px]:text-lg font-semibold text-black tracking-[0.8px] leading-[1.2] text-left">
                              From
                            </label>
                            <div className="flex flex-col items-end space-y-1">
                              <span className="text-sm min-[810px]:text-base font-semibold text-black tracking-[0.8px] leading-[1.2] text-right min-[810px]:text-left">
                                Balance:
                                <br className="block min-[810px]:hidden" />{' '}
                                {isBalanceLoading ? 'Loading...' : `${balance || '0'}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  fromAmount === ''
                                    ? ''
                                    : isNaN(Number(fromAmount))
                                    ? '0'
                                    : token === 'AQT'
                                    ? Number(fromAmount).toLocaleString()
                                    : fromAmount.includes('.')
                                    ? (() => {
                                        // Apply commas only to integer part when decimal point exists
                                        const parts = fromAmount.split('.');
                                        const integerPart = parts[0];
                                        const decimalPart = parts[1] || '';
                                        return (
                                          Number(integerPart).toLocaleString() + (decimalPart ? '.' + decimalPart : '.')
                                        );
                                      })()
                                    : Number(fromAmount).toLocaleString()
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  if (token === 'AQT') {
                                    // AQT: integers only (no decimals)
                                    if (/^\d*$/.test(value) || value === '') {
                                      handleFromAmountChange(value);
                                    }
                                  } else {
                                    // AERGO: allow digits with optional single decimal point
                                    if (/^\d*(\.)?\d*$/.test(value) || value === '') {
                                      handleFromAmountChange(value);
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onWheel={(e) => {
                                  // prevent accidental value changes by scroll
                                  (e.target as HTMLInputElement).blur();
                                }}
                                className={`w-full border-0 rounded-lg focus:outline-none focus:ring-0 text-[25px] min-[810px]:text-[40px] bg-transparent pl-0 text-black placeholder:text-[#bfbfbf] font-semibold tracking-[0.8px] leading-[1.2] text-left ${
                                  inputError ? 'border-red-500' : ''
                                }`}
                                placeholder={token === 'AQT' ? '0' : '0.0'}
                                autoComplete="off"
                                spellCheck={false}
                              />
                            </div>
                            <Image
                              src={token === 'AERGO' ? AergoToken : token === 'AQT' ? AQTToken : HPPToken}
                              alt={`${token} token`}
                              className="w-15 h-7.5 min-[810px]:w-30 min-[810px]:h-12"
                            />
                          </div>
                        </div>

                        {/* Direction Indicator */}
                        <div className="flex justify-center mb-4">
                          <DotLottieReact src="/lotties/DownArrow.lottie" autoplay loop className="w-12.5 h-12.5" />
                        </div>

                        {/* To Section */}
                        <div className="bg-white rounded-lg px-5 pt-5 pb-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-sm min-[810px]:text-lg font-semibold text-black tracking-[0.8px] leading-[1.2] text-left">
                              To
                            </label>
                            <span className="text-sm min-[810px]:text-base font-semibold text-black tracking-[0.8px] leading-[1.2] text-right min-[810px]:text-left">
                              Balance:
                              <br className="block min-[810px]:hidden" />{' '}
                              {isHppBalanceLoading ? 'Loading...' : `${hppBalance || '0'}`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="text"
                              value={
                                toAmount === ''
                                  ? ''
                                  : isNaN(Number(toAmount))
                                  ? '0'
                                  : (() => {
                                      const num = Number(toAmount);
                                      if (Number.isInteger(num)) {
                                        return num.toLocaleString();
                                      } else {
                                        // Apply commas only to integer part when decimal point exists
                                        const parts = toAmount.split('.');
                                        const integerPart = parts[0];
                                        const decimalPart = parts[1] || '';
                                        // Remove trailing zeros from decimal part
                                        const cleanDecimalPart = decimalPart.replace(/0+$/, '');
                                        return (
                                          Number(integerPart).toLocaleString() +
                                          (cleanDecimalPart ? '.' + cleanDecimalPart : '')
                                        );
                                      }
                                    })()
                              }
                              readOnly
                              className="w-full py-3 border-0 rounded-lg focus:outline-none focus:ring-0 text-[25px] min-[810px]:text-[40px] bg-transparent pl-0 text-black placeholder:text-[#bfbfbf] font-semibold tracking-[0.8px] leading-[1.2] text-left cursor-default pointer-events-none"
                              placeholder="0.0"
                              style={{ cursor: 'default' }}
                            />
                            <Image
                              src={HPPToken}
                              alt="HPP token"
                              className="w-15 h-7.5 min-[810px]:w-30 min-[810px]:h-12"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Migrate Button */}
                      <div className="flex justify-center">
                        <Button
                          variant="black"
                          size="lg"
                          className="mt-5 w-full font-medium py-3 px-6 rounded-[5px] hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleMigrationClick}
                          disabled={isMigrationDisabled()}
                        >
                          {isApproving ? 'Approving...' : isSwapping ? 'Migrating...' : 'Migrate Tokens'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction History */}
              {isConnected && (
                <div className="mt-8">
                  <div className="bg-primary border border-[#161616] rounded-[5px] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold leading-[1em] text-white">Transaction History</h3>
                      <button
                        onClick={() => address && fetchTransactionHistory(address)}
                        disabled={isLoadingHistory}
                        aria-label="Refresh"
                        className="flex items-center px-3 py-2 text-sm text-white rounded-lg cursor-pointer transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-500 ${
                            isLoadingHistory ? 'animate-spin-reverse' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>

                    {transactionHistory.length > 0 ? (
                      <div className="space-y-2">
                        {(showAllHistory ? transactionHistory : transactionHistory.slice(0, 5)).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-start min-[810px]:items-start items-center p-5 bg-[rgba(18,18,18,0.1)] hover:bg-[rgba(18,18,18,0.2)] rounded-[5px] mb-2 last:mb-0 cursor-pointer gap-3 min-[810px]:gap-5 transition-colors duration-200"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const etherscanUrl = createEtherscanLink(tx.hash, tx.network);
                              window.open(etherscanUrl, '_blank');
                            }}
                          >
                            {/* Icon - always on the left */}
                            <div
                              className={`w-13.5 h-13.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                tx.status === 'Pending' ? 'bg-[#F07F1D]' : 'bg-white'
                              }`}
                            >
                              {tx.icon}
                            </div>

                            {/* Content - responsive layout */}
                            <div className="flex-1 min-w-0">
                              {/* Desktop: horizontal layout */}
                              <div className="hidden min-[600px]:flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <div className="text-lg font-semibold text-white leading-[20px]">{tx.type}</div>
                                    <div className="mt-2.5 text-base text-[#bfbfbf] leading-[1.5] tracking-[0.8px] font-normal text-left">
                                      {tx.date}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl text-white leading-[20px] tracking-[0px] font-semibold whitespace-pre text-left">
                                    {tx.amount}
                                  </div>
                                  <div
                                    className={`mt-2.5 text-base font-normal leading-[1.5] tracking-[0.8px] text-right ${
                                      tx.status === 'Completed'
                                        ? 'text-[#25ff21]'
                                        : tx.status === 'Pending'
                                        ? 'text-[#bfbfbf]'
                                        : 'text-[#ff1312]'
                                    }`}
                                  >
                                    {tx.status}
                                  </div>
                                </div>
                              </div>

                              {/* Mobile: vertical layout */}
                              <div className="min-[600px]:hidden space-y-1">
                                <div className="text-base font-semibold text-white leading-[20px]">{tx.type}</div>
                                <div className="text-base text-white leading-[20px] tracking-[0px] font-semibold whitespace-pre text-left">
                                  {tx.amount}
                                </div>
                                <div className="text-sm text-[#bfbfbf] leading-[1.5] tracking-[0.8px] font-normal text-left">
                                  {tx.date}
                                </div>
                                <div
                                  className={`text-sm font-normal leading-[1.5] tracking-[0.8px] text-left whitespace-pre ${
                                    tx.status === 'Completed'
                                      ? 'text-[#25ff21]'
                                      : tx.status === 'Pending'
                                      ? 'text-[#bfbfbf]'
                                      : 'text-[#ff1312]'
                                  }`}
                                >
                                  {tx.status}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-[rgba(18,18,18,0.1)] rounded-[5px]">
                        {isLoadingHistory ? (
                          <div className="mb-4">
                            <DotLottieReact
                              src="/lotties/Loading.lottie"
                              autoplay
                              loop
                              style={{ width: 48, height: 48 }}
                            />
                          </div>
                        ) : (
                          <TransactionsIcon className="w-11 h-12.5 mb-4" />
                        )}
                        <p
                          className={`text-base text-[#bfbfbf] tracking-[0.8px] leading-[1.5] text-center font-normal ${
                            isLoadingHistory ? 'animate-pulse' : ''
                          }`}
                        >
                          {isLoadingHistory ? 'Fetching transaction history...' : 'No transactions yet'}
                        </p>
                      </div>
                    )}

                    {transactionHistory.length > 5 && !showAllHistory && (
                      <div className="mt-4 text-center space-y-3">
                        <Button
                          variant="white"
                          size="lg"
                          onClick={() => {
                            setShowAllHistory(true);
                          }}
                        >
                          View All Transactions
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 Section */}
          <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            <h2 className="text-[30px] font-black text-white leading-[1.5em] mb-8 mt-12.5 min-[1400px]:mt-25">
              Step 2: Finalize Migration to HPP(Mainnet)
            </h2>
            {/* Migration Cards */}
            <div className="space-y-8">
              {/* Step 2 Card */}
              <div className="bg-[#121212] border border-[#161616] rounded-[5px]">
                <div className="p-6">
                  <div className="flex items-start mb-5">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white mb-3 tracking-[0em] leading-[1]">
                        HPP(ETH) → HPP(Mainnet)
                      </h2>
                      <p className="text-base font-normal text-white tracking-[0.8px] text-left leading-[1.5]">
                        Once you have HPP tokens on Ethereum, bridge them to the HPP Mainnet for full ecosystem
                        access(listings, governance, utilities, and more).
                      </p>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="w-full h-min flex flex-row justify-center items-center p-5 overflow-hidden rounded-[5px]">
                    <div className="flex items-center gap-6 min-[480px]:gap-8 min-[640px]:gap-12 min-[810px]:gap-15">
                      {/* HPP (ETH) */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                          <Image src={HPPEth} alt="HPP (ETH)" />
                        </div>
                        <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                          HPP
                          <br className="block min-[810px]:hidden" />
                          (ETH)
                        </span>
                      </div>

                      {/* Migration Arrow */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-3">
                          <DotLottieReact
                            src="/lotties/RightArrow.lottie"
                            autoplay
                            loop
                            className="w-15 h-15 min-[400px]:w-25 min-[400px]:h-25 min-[810px]:w-[150px] min-[810px]:h-[150px]"
                          />
                        </div>
                      </div>

                      {/* HPP Mainnet */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 min-[400px]:w-20 min-[400px]:h-20 min-[810px]:w-25 min-[810px]:h-25 min-[1440px]:w-27.5 min-[1440px]:h-27.5 rounded-lg flex items-center justify-center mb-2.5">
                          <Image src={HPPMainnet} alt="HPP Mainnet" />
                        </div>
                        <span className="text-sm min-[400px]:text-base leading-[1.2em] tracking-[0.8px] font-normal text-white text-center -ml-1 min-[400px]:-ml-2.5">
                          HPP
                          <br className="block min-[810px]:hidden" />
                          (Mainnet)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center mt-5">
                    <Button
                      variant="primary"
                      size="lg"
                      href="https://bridge.arbitrum.io/?destinationChain=190415&sourceChain=ethereum&token=0xe33fbe7584eb79e2673abe576b7ac8c0de62565c"
                      external={true}
                      className="flex items-center justify-center space-x-2 whitespace-nowrap"
                    >
                      Go to HPP Bridge
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <NeedHelp />

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Toast Component */}
      {/* The Toast component is now managed by the useToast hook */}
    </div>
  );
}
