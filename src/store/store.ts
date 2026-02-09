import { configureStore } from '@reduxjs/toolkit';
import uiReducer, { type UiState } from './slices/uiSlice';
import inputReducer from './slices/inputSlice';
import aprReducer from './slices/aprSlice';
import stakingReducer from './slices/stakingSlice';
import walletReducer from './slices/walletSlice';
import activitiesReducer from './slices/activitiesSlice';
import balanceReducer from './slices/balanceSlice';
import cooldownReducer from './slices/cooldownSlice';
import overviewReducer from './slices/overviewSlice';
import airdropReducer from './slices/airdropSlice';
import type { Reducer } from 'redux';

export const store = configureStore({
  reducer: {
    // Explicitly type ui slice so RootState.ui isn't inferred as unknown.
    ui: uiReducer as unknown as Reducer<UiState>,
    input: inputReducer,
    apr: aprReducer,
    staking: stakingReducer,
    wallet: walletReducer,
    activities: activitiesReducer,
    balance: balanceReducer,
    cooldown: cooldownReducer,
    overview: overviewReducer,
    airdrop: airdropReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

