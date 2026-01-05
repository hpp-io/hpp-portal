import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AprState {
  // APR Calculator controls
  calcPreRegYes: 'yes' | 'no';
  calcWhaleTier: string;
  // APR API state
  aprLoading: boolean;
  aprBase: number;
  aprBonus: number;
  aprWhaleCredit: number;
  aprHoldCredit: number | undefined;
  aprDaoCredit: number | undefined;
  aprTotal: number;
  finalAPR: number;
}

const initialState: AprState = {
  calcPreRegYes: 'yes',
  calcWhaleTier: 'T1',
  aprLoading: false,
  aprBase: 10,
  aprBonus: 0,
  aprWhaleCredit: 1,
  aprHoldCredit: undefined,
  aprDaoCredit: undefined,
  aprTotal: 10,
  finalAPR: 10,
};

const aprSlice = createSlice({
  name: 'apr',
  initialState,
  reducers: {
    setCalcPreRegYes: (state, action: PayloadAction<'yes' | 'no'>) => {
      state.calcPreRegYes = action.payload;
    },
    setCalcWhaleTier: (state, action: PayloadAction<string>) => {
      state.calcWhaleTier = action.payload;
    },
    setAprLoading: (state, action: PayloadAction<boolean>) => {
      state.aprLoading = action.payload;
    },
    setAprBase: (state, action: PayloadAction<number>) => {
      state.aprBase = action.payload;
    },
    setAprBonus: (state, action: PayloadAction<number>) => {
      state.aprBonus = action.payload;
    },
    setAprWhaleCredit: (state, action: PayloadAction<number>) => {
      state.aprWhaleCredit = action.payload;
    },
    setAprHoldCredit: (state, action: PayloadAction<number | undefined>) => {
      state.aprHoldCredit = action.payload;
    },
    setAprDaoCredit: (state, action: PayloadAction<number | undefined>) => {
      state.aprDaoCredit = action.payload;
    },
    setAprTotal: (state, action: PayloadAction<number>) => {
      state.aprTotal = action.payload;
    },
    setFinalAPR: (state, action: PayloadAction<number>) => {
      state.finalAPR = action.payload;
    },
  },
});

export const {
  setCalcPreRegYes,
  setCalcWhaleTier,
  setAprLoading,
  setAprBase,
  setAprBonus,
  setAprWhaleCredit,
  setAprHoldCredit,
  setAprDaoCredit,
  setAprTotal,
  setFinalAPR,
} = aprSlice.actions;
export default aprSlice.reducer;

