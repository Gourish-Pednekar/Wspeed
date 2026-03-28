import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Send, Copy, QrCode, Shield, LogOut, RefreshCw, CheckCircle, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useWallet } from "../hooks/useWallet";
import { useBiometric } from "../hooks/useBiometric";
import api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { address, balance, isLoading, refresh, formatAddress } = useWallet();
  const { signTransaction, loading: signingLoading } = useBiometric();

  const [activeTab, setActiveTab] = useState("wallet");
  const [copied, setCopied] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", value: "" });
  const [txStatus, setTxStatus] = useState(null); // null | "signing" | "sent" | "error"
  const [txHash, setTxHash] = useState("");

  // Mock recent transactions
  const mockTxs = [
    { type: "out", to: "0xdead...beef", value: "0.05", time: "2m ago", hash: "0xabc..." },
    { type: "in", from: "0xcafe...babe", value: "0.2", time: "1h ago", hash: "0xdef..." },
    { type: "out", to: "0x1234...5678", value: "0.01", time: "3h ago", hash: "0xghi..." },
  ];

  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setTxStatus("signing");
    try {
      // 1. Prepare UserOp
      const { data: prepared } = await api.post("/transaction/prepare", {
        to: sendForm.to,
        value: sendForm.value,
      });

      // 2. Trigger biometric to sign
      const result = await signTransaction(user.id, prepared.userOp, prepared.authOptions);
      setTxHash(result.userOpHash);
      setTxStatus("sent");
    } catch (err) {
      setTxStatus("error");
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bio-black)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--bio-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00e5ff, #7c3aed)" }}>
            <Fingerprint size={14} color="#000" />
          </div>
          <span className="mono font-bold text-white">BioVault</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button className="btn-ghost p-2" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Balance card */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-6 mb-6"
          style={{
            background: "linear-gradient(135deg, #111118, #1a1a2e)",
            border: "1px solid rgba(0,229,255,0.2)",
            boxShadow: "0 0 40px rgba(0,229,255,0.05)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #00e5ff, transparent)" }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs mono text-gray-500 mb-1">TOTAL BALANCE</div>
                <div className="text-4xl font-bold text-white">{isLoading ? "..." : parseFloat(balance || 0).toFixed(4)} <span className="text-xl text-gray-400">ETH</span></div>
              </div>
              <button onClick={refresh} className="p-2 rounded-lg transition-colors hover:bg-white/5" title="Refresh">
                <RefreshCw size={16} style={{ color: "#00e5ff" }} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="mono text-sm text-gray-300 flex-1 truncate">{address || "Not connected"}</span>
              <button onClick={copyAddress} className="ml-2 text-gray-500 hover:text-cyan-400 transition-colors">
                {copied ? <CheckCircle size={15} style={{ color: "#00ff88" }} /> : <Copy size={15} />}
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                className="btn-primary py-3 flex items-center justify-center gap-2 text-sm"
                onClick={() => setSendModal(true)}
              >
                <Send size={15} /> Send
              </button>
              <button className="btn-ghost py-3 flex items-center justify-center gap-2 text-sm" onClick={() => navigate("/recovery")}>
                <Shield size={15} /> Recovery
              </button>
            </div>
          </div>
        </motion.div>

        {/* Security badge */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)" }}>
          <Fingerprint size={16} style={{ color: "#00ff88" }} />
          <span className="text-xs text-green-400 mono">Biometric secured · ZK-proof verified · No private keys</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--bio-border)" }}>
          {["wallet", "guardians"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-sm mono font-bold capitalize transition-all"
              style={{
                background: activeTab === tab ? "rgba(0,229,255,0.1)" : "transparent",
                color: activeTab === tab ? "#00e5ff" : "#555",
                border: activeTab === tab ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
              }}
            >
              {tab === "wallet" ? "Transactions" : "Guardians"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "wallet" && (
            <motion.div key="txs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="mono text-sm text-gray-500 mb-3">RECENT ACTIVITY</h3>
              {mockTxs.length === 0 ? (
                <div className="bio-card p-8 text-center text-gray-600 text-sm">
                  No transactions yet. Send your first transaction!
                </div>
              ) : (
                <div className="space-y-2">
                  {mockTxs.map((tx, i) => (
                    <motion.div
                      key={i}
                      className="bio-card p-4 flex items-center gap-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: tx.type === "in" ? "rgba(0,255,136,0.1)" : "rgba(0,229,255,0.1)",
                          border: `1px solid ${tx.type === "in" ? "rgba(0,255,136,0.2)" : "rgba(0,229,255,0.2)"}`,
                        }}
                      >
                        {tx.type === "in"
                          ? <ArrowDownLeft size={18} style={{ color: "#00ff88" }} />
                          : <ArrowUpRight size={18} style={{ color: "#00e5ff" }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">
                          {tx.type === "in" ? "Received" : "Sent"}
                        </div>
                        <div className="text-xs mono text-gray-500 truncate">
                          {tx.type === "in" ? `from ${tx.from}` : `to ${tx.to}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono font-bold" style={{ color: tx.type === "in" ? "#00ff88" : "#fff" }}>
                          {tx.type === "in" ? "+" : "-"}{tx.value} ETH
                        </div>
                        <div className="text-xs text-gray-600">{tx.time}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "guardians" && (
            <motion.div key="guardians" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bio-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users size={20} style={{ color: "#7c3aed" }} />
                  <h3 className="mono font-bold text-white">Recovery Guardians</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Add trusted addresses that can help recover your wallet if you lose biometric access.</p>
                <button className="btn-primary py-3 w-full flex items-center justify-center gap-2 text-sm" onClick={() => navigate("/recovery")}>
                  <Shield size={15} /> Setup Recovery Guardians
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Send modal */}
      <AnimatePresence>
        {sendModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setSendModal(false)}
          >
            <motion.div
              className="bio-card p-8 w-full max-w-sm"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h2 className="mono font-bold text-xl text-white mb-1">Send ETH</h2>
              <p className="text-sm text-gray-500 mb-6">Touch fingerprint to authorize</p>

              {txStatus === "sent" ? (
                <div className="text-center py-4">
                  <CheckCircle size={48} className="mx-auto mb-3" style={{ color: "#00ff88" }} />
                  <div className="mono text-green-400 font-bold mb-2">Transaction Submitted!</div>
                  <div className="text-xs mono text-gray-600 break-all">{txHash}</div>
                  <button className="btn-ghost w-full mt-4 py-2" onClick={() => { setSendModal(false); setTxStatus(null); }}>Close</button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Recipient Address</label>
                    <input
                      className="bio-input px-4 py-3 mono text-sm"
                      placeholder="0x..."
                      value={sendForm.to}
                      onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Amount (ETH)</label>
                    <input
                      className="bio-input px-4 py-3 mono text-sm"
                      type="number"
                      step="0.0001"
                      placeholder="0.01"
                      value={sendForm.value}
                      onChange={(e) => setSendForm({ ...sendForm, value: e.target.value })}
                      required
                    />
                  </div>

                  {txStatus === "error" && (
                    <div className="text-xs p-2 rounded" style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366" }}>
                      Transaction failed. Try again.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    disabled={signingLoading || txStatus === "signing"}
                  >
                    {signingLoading || txStatus === "signing" ? (
                      <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Waiting for biometric...</>
                    ) : (
                      <><Fingerprint size={16} /> Touch to Sign & Send</>
                    )}
                  </button>
                  <button type="button" className="btn-ghost w-full py-2 text-sm" onClick={() => { setSendModal(false); setTxStatus(null); }}>
                    Cancel
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
