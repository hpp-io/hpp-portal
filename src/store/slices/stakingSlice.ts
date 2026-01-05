import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StakingState {
  stakingFinalAPR: number;
  stakingExpectedReward: string;
  stakingExpectedRewardLoading: boolean;
}

const initialState: StakingState = {
  stakingFinalAPR: 10,
  stakingExpectedReward: '≈0 HPP',
  stakingExpectedRewardLoading: false,
};

const stakingSlice = createSlice({
  name: 'staking',
  initialState,
  reducers: {
    setStakingFinalAPR: (state, action: PayloadAction<number>) => {
      state.stakingFinalAPR = action.payload;
    },
    setStakingExpectedReward: (state, action: PayloadAction<string>) => {
      state.stakingExpectedReward = action.payload;
    },
    setStakingExpectedRewardLoading: (state, action: PayloadAction<boolean>) => {
      state.stakingExpectedRewardLoading = action.payload;
    },
  },
});

export const { setStakingFinalAPR, setStakingExpectedReward, setStakingExpectedRewardLoading } = stakingSlice.actions;
export default stakingSlice.reducer;
