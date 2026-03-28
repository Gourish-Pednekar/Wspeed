import { useEffect, useCallback } from "react";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export function useWallet() {
  const {
    address,
    balance,
    transactions,
    isLoading,
    setAddress,
    setBalance,
    setTransactions,
    setLoading,
  } = useWalletStore();
  const { user } = useAuthStore();

  const fetchWalletInfo = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [infoRes, txRes] = await Promise.allSettled([
        api.get("/wallet/info"),
        api.get("/wallet/transactions"),
      ]);

      if (infoRes.status === "fulfilled") {
        setAddress(infoRes.value.data.address);
        setBalance(infoRes.value.data.balance);
      }
      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch wallet info:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletInfo();
  }, [fetchWalletInfo]);

  async function sendTransaction(to, value, data = "0x") {
    const { data: prepared } = await api.post("/transaction/prepare", { to, value, data });
    return prepared;
  }

  function formatAddress(addr) {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return {
    address,
    balance,
    transactions,
    isLoading,
    sendTransaction,
    refresh: fetchWalletInfo,
    formatAddress,
  };
}
