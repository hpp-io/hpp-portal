import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CooldownItem {
  date: string;
  note: string;
  amount: string;
  amountWei: string; // Store as string for Redux serialization
  cooling: boolean;
  unlock: number;
}

interface CooldownState {
  cooldowns: CooldownItem[];
  isCooldownsLoading: boolean;
  cooldownsInitialized: boolean;
  nowSecTick: number;
  cooldownSeconds: number;
}

const initialState: CooldownState = {
  cooldowns: [],
  isCooldownsLoading: false,
  cooldownsInitialized: false,
  nowSecTick: Math.floor(Date.now() / 1000),
  cooldownSeconds: 0,
};

const cooldownSlice = createSlice({
  name: 'cooldown',
  initialState,
  reducers: {
    setCooldowns: (state, action: PayloadAction<CooldownItem[]>) => {
      state.cooldowns = action.payload;
    },
    setIsCooldownsLoading: (state, action: PayloadAction<boolean>) => {
      state.isCooldownsLoading = action.payload;
    },
    setCooldownsInitialized: (state, action: PayloadAction<boolean>) => {
      state.cooldownsInitialized = action.payload;
    },
    setNowSecTick: (state, action: PayloadAction<number>) => {
      state.nowSecTick = action.payload;
    },
    setCooldownSeconds: (state, action: PayloadAction<number>) => {
      state.cooldownSeconds = action.payload;
    },
  },
});

export const {
  setCooldowns,
  setIsCooldownsLoading,
  setCooldownsInitialized,
  setNowSecTick,
  setCooldownSeconds,
} = cooldownSlice.actions;
export default cooldownSlice.reducer;

