import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OverviewState {
  overviewTvl: Array<{ date: string; value: string }>;
  totalStakers: number;
  totalStakedAmount: string;
  baseApr: number;
  maxApr: number;
  isChartReady: boolean;
  isStatsLoading: boolean;
  statsInitialized: boolean;
}

const initialState: OverviewState = {
  overviewTvl: [],
  totalStakers: 0,
  totalStakedAmount: '0',
  baseApr: 0,
  maxApr: 0,
  isChartReady: false,
  isStatsLoading: true,
  statsInitialized: false,
};

const overviewSlice = createSlice({
  name: 'overview',
  initialState,
  reducers: {
    setOverviewTvl: (state, action: PayloadAction<Array<{ date: string; value: string }>>) => {
      state.overviewTvl = action.payload;
    },
    setTotalStakers: (state, action: PayloadAction<number>) => {
      state.totalStakers = action.payload;
    },
    setTotalStakedAmount: (state, action: PayloadAction<string>) => {
      state.totalStakedAmount = action.payload;
    },
    setBaseApr: (state, action: PayloadAction<number>) => {
      state.baseApr = action.payload;
    },
    setMaxApr: (state, action: PayloadAction<number>) => {
      state.maxApr = action.payload;
    },
    setIsChartReady: (state, action: PayloadAction<boolean>) => {
      state.isChartReady = action.payload;
    },
    setIsStatsLoading: (state, action: PayloadAction<boolean>) => {
      state.isStatsLoading = action.payload;
    },
    setStatsInitialized: (state, action: PayloadAction<boolean>) => {
      state.statsInitialized = action.payload;
    },
  },
});

export const {
  setOverviewTvl,
  setTotalStakers,
  setTotalStakedAmount,
  setBaseApr,
  setMaxApr,
  setIsChartReady,
  setIsStatsLoading,
  setStatsInitialized,
} = overviewSlice.actions;
export default overviewSlice.reducer;

