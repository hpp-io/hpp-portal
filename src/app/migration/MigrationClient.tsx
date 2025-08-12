'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';
import WalletButton from '@/components/ui/WalletButton';
import MobileHeader from '@/components/ui/MobileHeader';
import { useToast } from '@/hooks/useToast';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { navItems, communityLinks } from '@/config/navigation';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

// Constants
const AERGO_DECIMAL = 18;
const HISTORY_PAGE_SIZE = 20;
const USE_CONTRACT_CENTRIC_HISTORY = true;

// Transaction interface
interface Transaction {
  id: string;
  type: 'Migration' | 'Approval' | 'Other';
  date: string;
  amount: string;
  status: 'Pending' | 'Completed' | 'Failed';
  hash: string;
  icon: React.ReactNode;
  network: 'mainnet' | 'sepolia';
}

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
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const approvalInFlightRef = useRef<boolean>(false);
  const migrationInFlightRef = useRef<boolean>(false);

  const { showToast } = useToast();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();

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
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production';
  const HPP_TOKEN_ADDRESS = (
    isProd
      ? process.env.NEXT_PUBLIC_MAINNET_ETH_HPP_TOKEN_CONTRACT!
      : process.env.NEXT_PUBLIC_SEPOLIA_ETH_HPP_TOKEN_CONTRACT!
  ) as `0x${string}`;
  const AERGO_TOKEN_ADDRESS = (
    isProd
      ? process.env.NEXT_PUBLIC_MAINNET_ETH_AERGO_TOKEN_CONTRACT!
      : process.env.NEXT_PUBLIC_SEPOLIA_ETH_AERGO_TOKEN_CONTRACT!
  ) as `0x${string}`;
  const HPP_MIGRATION_CONTRACT_ADDRESS = (
    isProd
      ? process.env.NEXT_PUBLIC_MAINNET_ETH_HPP_MIGRATION_CONTRACT!
      : process.env.NEXT_PUBLIC_SEPOLIA_ETH_HPP_MIGRATION_CONTRACT!
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

  // AERGO Allowance query for migration contract
  const {
    data: aergoAllowanceData,
    refetch: refetchAergoAllowance,
    isLoading: isAergoAllowanceLoading,
  } = useReadContract({
    address: AERGO_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, HPP_MIGRATION_CONTRACT_ADDRESS] : undefined,
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

  // Update AERGO balance when data changes
  useEffect(() => {
    if (aergoBalanceData) {
      const balance = formatUnits(aergoBalanceData, AERGO_DECIMAL);
      const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      setAergoBalance(formattedBalance);
    }
  }, [aergoBalanceData]);

  // Update allowance when address or contract changes
  useEffect(() => {
    if (address && isConnected) {
      refetchAergoAllowance();
    }
  }, [address, isConnected, refetchAergoAllowance]);

  // Update approval status based on current allowance and input amount
  useEffect(() => {
    if (aergoAllowanceData && fromAmount && parseFloat(fromAmount) > 0) {
      const amountInWei = parseUnits(fromAmount, 18);
      if (aergoAllowanceData >= amountInWei) {
        setApprovalStatus('approved');
      } else {
        setApprovalStatus('needs_approval');
      }
    } else {
      setApprovalStatus('pending');
    }
  }, [aergoAllowanceData, fromAmount]);

  // Removed auto-refresh of history after migration success to preserve pending -> completed UX

  // Utility function to create Etherscan link
  const createEtherscanLink = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet') => {
    const baseUrl = network === 'mainnet' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  // No background polling: status changes only on explicit refresh/View All

  // Decode first uint256 argument (amount) from contract call input
  const decodeAmountFromInput = (input?: string): string | null => {
    try {
      if (!input || input.length < 10 + 64) return null;
      const amountHex = input.slice(10, 10 + 64);
      const amountBigInt = BigInt(`0x${amountHex}`);
      const raw = formatUnits(amountBigInt, 18);
      const num = parseFloat(raw);
      if (isNaN(num)) return null;
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } catch {
      return null;
    }
  };

  // Fetch ALL migration history (no pagination in UI)
  const fetchAllMigrationHistory = async (walletAddress: string) => {
    if (!walletAddress) return;
    setIsLoadingHistory(true);
    try {
      const network: 'mainnet' | 'sepolia' = chainId === 11155111 ? 'sepolia' : 'mainnet';
      const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
      const baseUrl = network === 'mainnet' ? 'https://api.etherscan.io/api' : 'https://api-sepolia.etherscan.io/api';

      const aggregated: Transaction[] = [];
      const seen = new Set<string>();

      if (USE_CONTRACT_CENTRIC_HISTORY) {
        let page = 1;
        while (true) {
          const res = await fetch(
            `${baseUrl}?module=account&action=txlist&address=${HPP_MIGRATION_CONTRACT_ADDRESS}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
          );
          const data = await res.json();
          if (data.status !== '1') break;

          const walletLc = walletAddress.toLowerCase();
          const mapped: Transaction[] = (data.result || [])
            .filter((tx: any) => tx.from?.toLowerCase() === walletLc)
            .map((tx: any) => {
              const type: Transaction['type'] = 'Migration';
              let status: Transaction['status'] = 'Completed';
              if (tx.confirmations === '0') status = 'Pending';
              else if (tx.isError === '1') status = 'Failed';
              const amt = decodeAmountFromInput(tx.input);
              return {
                id: tx.hash,
                type,
                date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('ko-KR'),
                amount: amt ? `${amt} AERGO → ${amt} HPP` : 'AERGO → HPP',
                status,
                hash: tx.hash,
                network,
                icon: getTransactionIcon(type, status),
              } as Transaction;
            });

          for (const t of mapped) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              aggregated.push(t);
            }
          }

          const pageHasMore = Array.isArray(data.result) ? data.result.length === HISTORY_PAGE_SIZE : false;
          if (!pageHasMore) break;
          page += 1;
          if (page > 100) break; // hard cap safety
        }
      } else {
        let page = 1;
        while (true) {
          const normalTxResponse = await fetch(
            `${baseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
          );
          const internalTxResponse = await fetch(
            `${baseUrl}?module=account&action=txlistinternal&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
          );
          const normalTxData = await normalTxResponse.json();
          const internalTxData = await internalTxResponse.json();
          if (normalTxData.status !== '1' && internalTxData.status !== '1') break;

          const allTransactions = [...(normalTxData.result || []), ...(internalTxData.result || [])];
          const filtered = allTransactions.filter(
            (tx: any) => tx.to?.toLowerCase() === HPP_MIGRATION_CONTRACT_ADDRESS.toLowerCase()
          );

          const mapped: Transaction[] = filtered.map((tx: any) => {
            const type: Transaction['type'] = 'Migration';
            let status: Transaction['status'] = 'Completed';
            if (tx.confirmations === '0') status = 'Pending';
            else if (tx.isError === '1') status = 'Failed';
            const amt = decodeAmountFromInput(tx.input);
            return {
              id: tx.hash,
              type,
              date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('ko-KR'),
              amount: amt ? `${amt} AERGO → ${amt} HPP` : 'AERGO → HPP',
              status,
              hash: tx.hash,
              network,
              icon: getTransactionIcon(type, status),
            } as Transaction;
          });

          for (const t of mapped) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              aggregated.push(t);
            }
          }

          const normalHasMore = Array.isArray(normalTxData.result)
            ? normalTxData.result.length === HISTORY_PAGE_SIZE
            : false;
          const internalHasMore = Array.isArray(internalTxData.result)
            ? internalTxData.result.length === HISTORY_PAGE_SIZE
            : false;
          const mayHaveMore = normalHasMore || internalHasMore;
          if (!mayHaveMore) break;
          page += 1;
          if (page > 100) break; // hard cap safety
        }
      }

      // newest first
      aggregated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      updateHistoryWithServer(aggregated);
    } catch (error) {
      console.error('Failed to fetch ALL transaction history:', error);
      showToast('Error', 'Failed to fetch ALL transaction history.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
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

  // Fetch transaction history from Etherscan (supports pagination)
  const fetchTransactionHistory = async (walletAddress: string, options?: { page?: number; append?: boolean }) => {
    if (!walletAddress) return;

    const page = options?.page ?? 1;
    setIsLoadingHistory(true);
    try {
      const network: 'mainnet' | 'sepolia' = chainId === 11155111 ? 'sepolia' : 'mainnet';
      const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
      const baseUrl = network === 'mainnet' ? 'https://api.etherscan.io/api' : 'https://api-sepolia.etherscan.io/api';

      if (USE_CONTRACT_CENTRIC_HISTORY) {
        // Query only the migration contract txs, then filter by user address as the sender
        const contractTxResponse = await fetch(
          `${baseUrl}?module=account&action=txlist&address=${HPP_MIGRATION_CONTRACT_ADDRESS}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
        );
        const contractTxData = await contractTxResponse.json();

        if (contractTxData.status === '1') {
          const walletLc = walletAddress.toLowerCase();
          const relevantTransactions = (contractTxData.result || [])
            .filter((tx: any) => tx.from?.toLowerCase() === walletLc)
            .map((tx: any) => {
              const type: Transaction['type'] = 'Migration';
              let status: Transaction['status'] = 'Completed';
              if (tx.confirmations === '0') status = 'Pending';
              else if (tx.isError === '1') status = 'Failed';
              const amt = decodeAmountFromInput(tx.input);
              return {
                id: tx.hash,
                type,
                date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('ko-KR'),
                amount: amt ? `${amt} AERGO → ${amt} HPP` : 'AERGO → HPP',
                status,
                hash: tx.hash,
                network,
                icon: getTransactionIcon(type, status),
              } as Transaction;
            });

          updateHistoryWithServer(relevantTransactions);
        } else {
          // No data; keep existing (e.g., preserve local pending)
        }
      } else {
        // Legacy wallet-centric mode (fallback)
        // Fetch normal transactions
        const normalTxResponse = await fetch(
          `${baseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
        );
        // Fetch internal transactions (for contract interactions)
        const internalTxResponse = await fetch(
          `${baseUrl}?module=account&action=txlistinternal&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=${HISTORY_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
        );

        const normalTxData = await normalTxResponse.json();
        const internalTxData = await internalTxResponse.json();

        if (normalTxData.status === '1' || internalTxData.status === '1') {
          const allTransactions = [...(normalTxData.result || []), ...(internalTxData.result || [])];
          const relevantTransactions = allTransactions
            .filter((tx: any) => {
              const toAddress = tx.to?.toLowerCase();
              const isApproval = tx.input?.includes('0x095ea7b3'); // approve
              if (isApproval) return false;
              return toAddress === HPP_MIGRATION_CONTRACT_ADDRESS.toLowerCase();
            })
            .sort((a: any, b: any) => Number(b.timeStamp) - Number(a.timeStamp))
            .map((tx: any) => {
              const type: Transaction['type'] = 'Migration';
              let status: Transaction['status'] = 'Completed';
              if (tx.confirmations === '0') status = 'Pending';
              else if (tx.isError === '1') status = 'Failed';
              const amt = decodeAmountFromInput(tx.input);
              return {
                id: tx.hash,
                type,
                date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('ko-KR'),
                amount: amt ? `${amt} AERGO → ${amt} HPP` : 'AERGO → HPP',
                status,
                hash: tx.hash,
                network,
                icon: getTransactionIcon(type, status),
              } as Transaction;
            });

          updateHistoryWithServer(relevantTransactions);
        } else {
          // No data; keep existing
        }
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      showToast('Error', 'Failed to fetch transaction history.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Get appropriate icon for transaction type and status
  const getTransactionIcon = (type: Transaction['type'], status: Transaction['status']) => {
    if (status === 'Pending') {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else if (status === 'Completed') {
      if (type === 'Migration') {
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        );
      } else {
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      }
    } else {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
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

    // 1:1 conversion: 1 AERGO = 1 HPP
    setToAmount(value);
  };

  // Fetch transaction history when wallet connects or chain changes
  useEffect(() => {
    if (isConnected && address) {
      // reset paging state
      setTransactionHistory([]);
      setShowAllHistory(false);
      // Initial history fetch is safe now due to merge logic
      fetchTransactionHistory(address, { page: 1, append: false });
    }
  }, [isConnected, address, chainId]);

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
      const amountInWei = parseUnits(fromAmount, 18); // AERGO has 18 decimals

      // First, refresh allowance data to get the latest state
      await refetchAergoAllowance();

      // Wait a bit for the data to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we have sufficient allowance
      if (aergoAllowanceData && aergoAllowanceData >= amountInWei) {
        // Sufficient allowance exists, proceed directly to migration
        setIsSwapping(true);
        handleSwapAergoForHpp();
      } else {
        // Need to approve first
        setIsApproving(true);
        setIsSwapping(false);

        showToast('Approving...', 'Please wait while we approve the transaction...', 'loading');

        const approveHash = await approveTokens({
          address: AERGO_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [HPP_MIGRATION_CONTRACT_ADDRESS, amountInWei],
        });

        setApproveHash(approveHash);
        showToast('Approval sent', 'Waiting for approval confirmation...', 'loading');
        approvalInFlightRef.current = true;
        setTimeout(() => {
          if (approvalInFlightRef.current) {
            showToast('Approval sent', 'The network may be busy. Please hold on a moment.', 'loading');
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
      refetchAergoAllowance().then(() => {
        setIsSwapping(true);
        handleSwapAergoForHpp();
      });
    }
  }, [isApproveSuccess, isApproving, refetchAergoAllowance]);

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
      const hppMigrationContract = HPP_MIGRATION_CONTRACT_ADDRESS;

      const amountInWei = parseUnits(fromAmount, 18);

      showToast('Migrating...', 'Starting HPP migration. Please wait...', 'loading');

      // cache amount for later status updates
      lastSubmittedAmountRef.current = fromAmount;

      const migrationHash = await swapTokens({
        address: hppMigrationContract as `0x${string}`,
        abi: hppMigrationABI,
        functionName: 'swapAergoForHPP',
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
        const pendingTx: Transaction = {
          id: migrationHash,
          type: 'Migration',
          date: new Date().toLocaleString('ko-KR'),
          amount: `${formatted} AERGO → ${formatted} HPP`,
          status: 'Pending',
          hash: migrationHash,
          network,
          icon: getTransactionIcon('Migration', 'Pending'),
        } as Transaction;
        setTransactionHistory((prev) => [pendingTx, ...prev.filter((t) => t.id !== migrationHash)]);
      } catch {}
      // Keep Pending until user refreshes history; no background polling

      setTimeout(() => {
        if (migrationInFlightRef.current) {
          showToast('Migration sent', 'The network may be busy. Please hold on a moment.', 'loading');
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
    refetchAergoBalance();
    refetchAergoAllowance();

    // No automatic history refetch; user triggers refresh manually
  }, [isMigrationSuccess, migrationHash, chainId, refetchHppBalance, refetchAergoBalance, refetchAergoAllowance]);

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
    <div className="flex h-screen bg-white overflow-x-hidden">
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

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
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
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                Balance: {isAergoBalanceLoading ? 'Loading...' : `${aergoBalance || '0'} AERGO`}
                              </span>
                              {/* Approval Status Check */}
                              {isConnected && (
                                <div className="relative group">
                                  {isAergoAllowanceLoading ? (
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                                  ) : aergoAllowanceData &&
                                    fromAmount &&
                                    parseFloat(fromAmount) > 0 &&
                                    parseUnits(fromAmount, 18) <= aergoAllowanceData ? (
                                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  ) : aergoAllowanceData && fromAmount && parseFloat(fromAmount) > 0 ? (
                                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  ) : null}

                                  {/* Popover */}
                                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    <div className="text-center">
                                      <div className="font-medium mb-1">Approval Status</div>
                                      {isAergoAllowanceLoading ? (
                                        <div>Checking allowance...</div>
                                      ) : aergoAllowanceData &&
                                        fromAmount &&
                                        parseFloat(fromAmount) > 0 &&
                                        parseUnits(fromAmount, 18) <= aergoAllowanceData ? (
                                        <div className="text-green-400">✓ Approved for this amount</div>
                                      ) : aergoAllowanceData && fromAmount && parseFloat(fromAmount) > 0 ? (
                                        <div className="text-orange-400">⚠ Needs approval</div>
                                      ) : null}
                                      {aergoAllowanceData && (
                                        <div className="text-gray-300 mt-1">
                                          Current allowance: {formatUnits(aergoAllowanceData, 18)} AERGO
                                        </div>
                                      )}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={fromAmount === '' ? '' : fromAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // allow only digits and one decimal point
                                  if (/^\d*(\.)?\d*$/.test(value) || value === '') {
                                    handleFromAmountChange(value);
                                  }
                                }}
                                onWheel={(e) => {
                                  // prevent accidental value changes by scroll
                                  (e.target as HTMLInputElement).blur();
                                }}
                                className={`w-full py-3 border-0 rounded-lg focus:outline-none focus:ring-0 text-lg bg-transparent pl-0 ${
                                  inputError ? 'border-red-500' : ''
                                }`}
                                placeholder="0.0"
                                autoComplete="off"
                                spellCheck={false}
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
                              type="text"
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
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
                          <button
                            onClick={() => address && fetchTransactionHistory(address)}
                            disabled={isLoadingHistory}
                            aria-label="Refresh"
                            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            style={{ cursor: 'pointer' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        </div>

                        {isLoadingHistory ? (
                          <div className="flex items-center justify-center py-8">
                            <div
                              aria-label="Loading"
                              className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"
                            ></div>
                          </div>
                        ) : transactionHistory.length > 0 ? (
                          <div className="space-y-2">
                            {(showAllHistory ? transactionHistory : transactionHistory.slice(0, 2)).map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  const etherscanUrl = createEtherscanLink(tx.hash, tx.network);
                                  window.open(etherscanUrl, '_blank');
                                }}
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
                                      tx.status === 'Completed'
                                        ? 'text-green-600'
                                        : tx.status === 'Pending'
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {tx.status}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <svg
                              className="w-12 h-12 mx-auto mb-3 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="text-sm text-gray-400 mt-1">No transactions yet</p>
                          </div>
                        )}

                        {transactionHistory.length > 2 && !showAllHistory && (
                          <div className="mt-4 text-center space-y-3">
                            <button
                              onClick={() => {
                                setShowAllHistory(true);
                                if (address) {
                                  fetchAllMigrationHistory(address);
                                }
                              }}
                              className="text-sm text-gray-600 hover:text-gray-800 bg-transparent cursor-pointer px-2 py-1 focus:outline-none"
                              style={{ cursor: 'pointer' }}
                            >
                              View All Transactions
                            </button>
                          </div>
                        )}
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
// Unused legacy constants removed (addresses are sourced above via isProd guard)

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
