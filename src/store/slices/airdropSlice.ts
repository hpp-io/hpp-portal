import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AirdropStatus = 'On-Going' | 'Coming Soon' | 'Ended';
export type AirdropType = 'hpp' | 'dapp' | 'collaboration';

// Redux-friendly version without React component
export interface AirdropEventData {
  id: string;
  name: string;
  eventName: string;
  reward: number;
  starts: string;
  ends: string;
  status: AirdropStatus;
  // Optional extended fields (API may include these even on list endpoints)
  icon?: string;
  description?: string;
  claimPeriodStart?: string;
  claimPeriodEnd?: string;
  vestingPeriodStart?: string;
  vestingPeriodEnd?: string;
  vestingDuration?: string;
  eligibilityDescription?: string;
  governanceVoteLink?: string;
  governanceVoteText?: string;
  imageUrl?: string;
  contract?: string;
}

export interface AirdropDetailData {
  id: string;
  name: string;
  eventName: string;
  reward: number;
  starts: string;
  ends: string;
  status: AirdropStatus;
  description: string;
  claimPeriodStart: string;
  claimPeriodEnd: string;
  vestingPeriodStart: string;
  vestingPeriodEnd: string;
  vestingDuration: string;
  eligibilityDescription: string;
  governanceVoteLink?: string;
  governanceVoteText?: string;
  imageUrl?: string;
  contract?: string;
}

interface AirdropState {
  events: {
    hpp: AirdropEventData[];
    dapp: AirdropEventData[];
    collaboration: AirdropEventData[];
  };
  details: Record<string, AirdropDetailData>; // id -> detail mapping
  loading: {
    hpp: boolean;
    dapp: boolean;
    collaboration: boolean;
  };
  detailLoading: Record<string, boolean>; // id -> loading status
  lastFetched: {
    hpp: number | null;
    dapp: number | null;
    collaboration: number | null;
  };
  detailLastFetched: Record<string, number>; // id -> timestamp
}

const initialState: AirdropState = {
  events: {
    hpp: [],
    dapp: [],
    collaboration: [],
  },
  details: {},
  loading: {
    hpp: false,
    dapp: false,
    collaboration: false,
  },
  detailLoading: {},
  lastFetched: {
    hpp: null,
    dapp: null,
    collaboration: null,
  },
  detailLastFetched: {},
};

const airdropSlice = createSlice({
  name: 'airdrop',
  initialState,
  reducers: {
    setAirdropLoading: (state, action: PayloadAction<{ type: AirdropType; loading: boolean }>) => {
      state.loading[action.payload.type] = action.payload.loading;
    },
    setAirdropEvents: (state, action: PayloadAction<{ type: AirdropType; events: AirdropEventData[] }>) => {
      state.events[action.payload.type] = action.payload.events;
      state.lastFetched[action.payload.type] = Date.now();
      state.loading[action.payload.type] = false;
    },
    clearAirdropEvents: (state, action: PayloadAction<AirdropType>) => {
      state.events[action.payload] = [];
      state.lastFetched[action.payload] = null;
    },
    setAirdropDetailLoading: (state, action: PayloadAction<{ id: string; loading: boolean }>) => {
      state.detailLoading[action.payload.id] = action.payload.loading;
    },
    setAirdropDetail: (state, action: PayloadAction<{ id: string; detail: AirdropDetailData }>) => {
      state.details[action.payload.id] = action.payload.detail;
      state.detailLastFetched[action.payload.id] = Date.now();
      state.detailLoading[action.payload.id] = false;
    },
    clearAirdropDetail: (state, action: PayloadAction<string>) => {
      delete state.details[action.payload];
      delete state.detailLastFetched[action.payload];
      delete state.detailLoading[action.payload];
    },
  },
});

export const {
  setAirdropLoading,
  setAirdropEvents,
  clearAirdropEvents,
  setAirdropDetailLoading,
  setAirdropDetail,
  clearAirdropDetail,
} = airdropSlice.actions;
export default airdropSlice.reducer;
