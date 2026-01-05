import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type StakingTab = 'stake' | 'unstake' | 'claim';
type TopTab = 'overview' | 'staking' | 'dashboard';

interface UiState {
  sidebarOpen: boolean;
  topTab: TopTab;
  activeTab: StakingTab;
}

const initialState: UiState = {
  sidebarOpen: false,
  topTab: 'overview',
  activeTab: 'stake',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTopTab: (state, action: PayloadAction<TopTab>) => {
      state.topTab = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<StakingTab>) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setSidebarOpen, setTopTab, setActiveTab } = uiSlice.actions;
export default uiSlice.reducer;

