import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import inputReducer from './slices/inputSlice';
import aprReducer from './slices/aprSlice';
import stakingReducer from './slices/stakingSlice';
import walletReducer from './slices/walletSlice';
import activitiesReducer from './slices/activitiesSlice';
import balanceReducer from './slices/balanceSlice';
import cooldownReducer from './slices/cooldownSlice';
import overviewReducer from './slices/overviewSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    input: inputReducer,
    apr: aprReducer,
    staking: stakingReducer,
    wallet: walletReducer,
    activities: activitiesReducer,
    balance: balanceReducer,
    cooldown: cooldownReducer,
    overview: overviewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

