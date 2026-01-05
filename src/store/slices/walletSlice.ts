import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  walletAprLoading: boolean;
  walletBaseApr: number | null;
  walletBonusApr: number | null;
  walletWhaleCredit: number | null;
  walletHoldCredit: number | null;
  walletDaoCredit: number | null;
  walletStakedAmountDisplay: string;
  walletFinalApr: number | null; // Expected APR based on current staked amount
  walletFinalAprLoading: boolean; // Loading state for walletFinalApr
}

const initialState: WalletState = {
  walletAprLoading: false,
  walletBaseApr: null,
  walletBonusApr: null,
  walletWhaleCredit: null,
  walletHoldCredit: null,
  walletDaoCredit: null,
  walletStakedAmountDisplay: '',
  walletFinalApr: null,
  walletFinalAprLoading: false,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletAprLoading: (state, action: PayloadAction<boolean>) => {
      state.walletAprLoading = action.payload;
    },
    setWalletBaseApr: (state, action: PayloadAction<number | null>) => {
      state.walletBaseApr = action.payload;
    },
    setWalletBonusApr: (state, action: PayloadAction<number | null>) => {
      state.walletBonusApr = action.payload;
    },
    setWalletWhaleCredit: (state, action: PayloadAction<number | null>) => {
      state.walletWhaleCredit = action.payload;
    },
    setWalletHoldCredit: (state, action: PayloadAction<number | null>) => {
      state.walletHoldCredit = action.payload;
    },
    setWalletDaoCredit: (state, action: PayloadAction<number | null>) => {
      state.walletDaoCredit = action.payload;
    },
    setWalletStakedAmountDisplay: (state, action: PayloadAction<string>) => {
      state.walletStakedAmountDisplay = action.payload;
    },
    setWalletFinalApr: (state, action: PayloadAction<number | null>) => {
      state.walletFinalApr = action.payload;
    },
    setWalletFinalAprLoading: (state, action: PayloadAction<boolean>) => {
      state.walletFinalAprLoading = action.payload;
    },
  },
});

export const {
  setWalletAprLoading,
  setWalletBaseApr,
  setWalletBonusApr,
  setWalletWhaleCredit,
  setWalletHoldCredit,
  setWalletDaoCredit,
  setWalletStakedAmountDisplay,
  setWalletFinalApr,
  setWalletFinalAprLoading,
} = walletSlice.actions;
export default walletSlice.reducer;
