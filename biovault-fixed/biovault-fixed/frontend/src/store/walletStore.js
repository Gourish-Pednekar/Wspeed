import { create } from "zustand";

export const useWalletStore = create((set) => ({
  address: null,
  balance: "0",
  transactions: [],
  isLoading: false,

  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),
  setLoading: (isLoading) => set({ isLoading }),
}));
