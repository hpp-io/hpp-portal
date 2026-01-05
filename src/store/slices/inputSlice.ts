import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface InputState {
  amount: string;
  inputError: string;
}

const initialState: InputState = {
  amount: '',
  inputError: '',
};

const inputSlice = createSlice({
  name: 'input',
  initialState,
  reducers: {
    setAmount: (state, action: PayloadAction<string>) => {
      state.amount = action.payload;
    },
    setInputError: (state, action: PayloadAction<string>) => {
      state.inputError = action.payload;
    },
    clearInput: (state) => {
      state.amount = '';
      state.inputError = '';
    },
  },
});

export const { setAmount, setInputError, clearInput } = inputSlice.actions;
export default inputSlice.reducer;

