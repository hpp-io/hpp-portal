import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BalanceState {
  hppBalance: string;
  isHppBalanceLoading: boolean;
  stakedTotal: string;
  isStakedTotalLoading: boolean;
}

const initialState: BalanceState = {
  hppBalance: '0',
  isHppBalanceLoading: false,
  stakedTotal: '0',
  isStakedTotalLoading: false,
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    setHppBalance: (state, action: PayloadAction<string>) => {
      state.hppBalance = action.payload;
    },
    setIsHppBalanceLoading: (state, action: PayloadAction<boolean>) => {
      state.isHppBalanceLoading = action.payload;
    },
    setStakedTotal: (state, action: PayloadAction<string>) => {
      state.stakedTotal = action.payload;
    },
    setIsStakedTotalLoading: (state, action: PayloadAction<boolean>) => {
      state.isStakedTotalLoading = action.payload;
    },
  },
});

export const { setHppBalance, setIsHppBalanceLoading, setStakedTotal, setIsStakedTotalLoading } =
  balanceSlice.actions;
export default balanceSlice.reducer;

