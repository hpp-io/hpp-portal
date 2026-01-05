import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OverviewState {
  overviewTvl: Array<{ date: string; value: string }>;
  totalStakers: number;
  totalStakedAmount: string;
  baseApr: number;
  maxApr: number;
  chartSideMargin: number;
  isNarrow450: boolean;
  isNarrow600: boolean;
  isChartReady: boolean;
  isStatsLoading: boolean;
  statsInitialized: boolean;
  chartAnimKey: string | null;
}

const initialState: OverviewState = {
  overviewTvl: [],
  totalStakers: 0,
  totalStakedAmount: '0',
  baseApr: 0,
  maxApr: 0,
  chartSideMargin: 40,
  isNarrow450: false,
  isNarrow600: false,
  isChartReady: false,
  isStatsLoading: true,
  statsInitialized: false,
  chartAnimKey: null,
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
    setChartSideMargin: (state, action: PayloadAction<number>) => {
      state.chartSideMargin = action.payload;
    },
    setIsNarrow450: (state, action: PayloadAction<boolean>) => {
      state.isNarrow450 = action.payload;
    },
    setIsNarrow600: (state, action: PayloadAction<boolean>) => {
      state.isNarrow600 = action.payload;
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
    setChartAnimKey: (state, action: PayloadAction<string | null>) => {
      state.chartAnimKey = action.payload;
    },
  },
});

export const {
  setOverviewTvl,
  setTotalStakers,
  setTotalStakedAmount,
  setBaseApr,
  setMaxApr,
  setChartSideMargin,
  setIsNarrow450,
  setIsNarrow600,
  setIsChartReady,
  setIsStatsLoading,
  setStatsInitialized,
  setChartAnimKey,
} = overviewSlice.actions;
export default overviewSlice.reducer;

