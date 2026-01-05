import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Activity {
  id: string;
  date: string;
  action: string;
  amount?: string;
  status?: string;
  isLocal?: boolean; // Flag to identify locally added activities
}

interface ActivitiesState {
  activities: Activity[];
  activitiesLoading: boolean;
  activityPage: number;
}

const initialState: ActivitiesState = {
  activities: [],
  activitiesLoading: false,
  activityPage: 1,
};

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setActivities: (state, action: PayloadAction<Activity[]>) => {
      state.activities = action.payload;
      // Reset to page 1 when activities change
      state.activityPage = 1;
    },
    updateBlockscoutActivities: (state, action: PayloadAction<Activity[]>) => {
      // Update only Blockscout activities, preserve local activities
      const localActivities = state.activities.filter((a) => a.isLocal);
      const blockscoutActivities = action.payload;
      // Remove local activities that now exist in Blockscout
      const blockscoutIds = new Set(blockscoutActivities.map((a) => a.id.toLowerCase()));
      const localToKeep = localActivities.filter((local) => !blockscoutIds.has(local.id.toLowerCase()));
      // Merge: Blockscout activities + local activities that are still pending
      state.activities = [...blockscoutActivities, ...localToKeep].sort((a: Activity, b: Activity) =>
        a.date < b.date ? 1 : -1
      );
      // Reset to page 1 when activities change
      state.activityPage = 1;
    },
    setActivitiesLoading: (state, action: PayloadAction<boolean>) => {
      state.activitiesLoading = action.payload;
    },
    setActivityPage: (state, action: PayloadAction<number>) => {
      state.activityPage = action.payload;
    },
    addLocalActivity: (state, action: PayloadAction<Activity>) => {
      // Check if activity already exists (by id/tx hash)
      const exists = state.activities.some((a) => a.id === action.payload.id);
      if (!exists) {
        // Add to the beginning of the array (most recent first)
        state.activities.unshift(action.payload);
        // Reset to page 1 when activities change
        state.activityPage = 1;
      }
    },
    removeLocalActivity: (state, action: PayloadAction<string>) => {
      // Remove local activity by id (when Blockscout data is available)
      state.activities = state.activities.filter((a) => a.id !== action.payload);
    },
  },
});

export const {
  setActivities,
  setActivitiesLoading,
  setActivityPage,
  addLocalActivity,
  removeLocalActivity,
  updateBlockscoutActivities,
} = activitiesSlice.actions;
export default activitiesSlice.reducer;
