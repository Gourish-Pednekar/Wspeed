import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Plus, Trash2, CheckCircle, ArrowLeft, Users, Key } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

const MODES = ["setup", "recover"];

export default function Recovery() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState("setup");
  const [guardians, setGuardians] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Recover mode
  const [recoverUsername, setRecoverUsername] = useState("");
  const [guardianShares, setGuardianShares] = useState([{ guardianAddress: "", share: "" }]);

  function addGuardian() {
    if (guardians.length < 5) setGuardians([...guardians, ""]);
  }

  function removeGuardian(i) {
    setGuardians(guardians.filter((_, idx) => idx !== i));
  }

  function updateGuardian(i, val) {
    const updated = [...guardians];
    updated[i] = val;
    setGuardians(updated);
  }

  async function handleSetupGuardians(e) {
    e.preventDefault();
    const valid = guardians.filter((g) => g.trim().startsWith("0x") && g.length === 42);
    if (valid.length < 2) {
      setError("Add at least 2 valid Ethereum addresses.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/recovery/setup", { guardians: valid });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const validShares = guardianShares.filter((s) => s.guardianAddress && s.share);
      const { data } = await api.post("/recovery/reconstruct", {
        username: recoverUsername,
        guardianShares: validShares,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen hex-bg" style={{ background: "var(--bio-black)" }}>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-8 transition-colors"
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Shield size={24} style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <h1 className="mono font-bold text-white text-2xl">Wallet Recovery</h1>
            <p className="text-sm text-gray-500">Shamir's Secret Sharing · Social Recovery</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--bio-border)" }}>
          {[
            { key: "setup", label: "Setup Guardians", icon: Users },
            { key: "recover", label: "Recover Access", icon: Key },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setResult(null); setError(""); }}
              className="flex-1 py-2.5 rounded-lg text-sm mono font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: mode === key ? "rgba(124,58,237,0.15)" : "transparent",
                color: mode === key ? "#7c3aed" : "#555",
                border: mode === key ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Setup guardians */}
          {mode === "setup" && !result && (
            <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bio-card p-6">
                <p className="text-sm text-gray-400 mb-6">
                  Add trusted wallet addresses as guardians. If you lose access, a 2/3 majority can restore your wallet using their secret shares.
                </p>

                <form onSubmit={handleSetupGuardians} className="space-y-4">
                  {guardians.map((g, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="bio-input px-3 py-2.5 mono text-sm flex-1"
                        placeholder={`0x... guardian ${i + 1}`}
                        value={g}
                        onChange={(e) => updateGuardian(i, e.target.value)}
                      />
                      {guardians.length > 1 && (
                        <button type="button" className="btn-ghost p-2.5" onClick={() => removeGuardian(i)}>
                          <Trash2 size={15} style={{ color: "#ff3366" }} />
                        </button>
                      )}
                    </div>
                  ))}

                  {guardians.length < 5 && (
                    <button type="button" className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2" onClick={addGuardian}>
                      <Plus size={15} /> Add Guardian
                    </button>
                  )}

                  <div className="p-3 rounded-xl text-xs text-gray-500" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.1)" }}>
                    <strong className="text-purple-400">How it works:</strong> Your recovery key is split into {guardians.length} shares using Shamir's Secret Sharing.
                    At least {Math.ceil(guardians.length * 0.66)} guardians must cooperate to recover your wallet.
                  </div>

                  {error && <div className="text-xs p-2 rounded" style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366" }}>{error}</div>}

                  <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Shield size={15} />}
                    Setup Recovery
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Recover access */}
          {mode === "recover" && !result && (
            <motion.div key="recover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bio-card p-6">
                <p className="text-sm text-gray-400 mb-6">
                  Collect shares from enough guardians, then enter them here to reconstruct your recovery key and re-enroll biometrics.
                </p>
                <form onSubmit={handleRecover} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Your Username</label>
                    <input className="bio-input px-3 py-2.5" placeholder="username" value={recoverUsername} onChange={(e) => setRecoverUsername(e.target.value)} required />
                  </div>

                  {guardianShares.map((gs, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2" style={{ border: "1px solid var(--bio-border)" }}>
                      <div className="text-xs text-gray-500 mono">Guardian {i + 1}</div>
                      <input className="bio-input px-3 py-2 mono text-xs" placeholder="0x... guardian address" value={gs.guardianAddress} onChange={(e) => { const u = [...guardianShares]; u[i].guardianAddress = e.target.value; setGuardianShares(u); }} />
                      <input className="bio-input px-3 py-2 mono text-xs" placeholder="Secret share" value={gs.share} onChange={(e) => { const u = [...guardianShares]; u[i].share = e.target.value; setGuardianShares(u); }} />
                    </div>
                  ))}

                  <button type="button" className="btn-ghost w-full py-2 text-sm flex items-center justify-center gap-2" onClick={() => setGuardianShares([...guardianShares, { guardianAddress: "", share: "" }])}>
                    <Plus size={14} /> Add Another Guardian Share
                  </button>

                  {error && <div className="text-xs p-2 rounded" style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366" }}>{error}</div>}

                  <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Key size={15} />}
                    Reconstruct & Recover
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Success state */}
          {result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bio-card p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#00ff88" }} />
              <h3 className="mono font-bold text-white text-xl mb-2">
                {mode === "setup" ? "Guardians Configured!" : "Recovery Successful!"}
              </h3>
              <p className="text-sm text-gray-400 mb-4">{result.message}</p>

              {result.shares && (
                <div className="text-left space-y-2 mb-4">
                  <div className="text-xs text-gray-500 mono mb-2">GUARDIAN SHARES (send each privately):</div>
                  {result.shares.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--bio-border)" }}>
                      <div className="text-xs text-gray-500 mb-1">Guardian {i + 1}: {s.guardianAddress.slice(0, 10)}...</div>
                      <div className="mono text-xs text-purple-400 break-all">{s.share}</div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-primary w-full py-3" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}>
                {isAuthenticated ? "Back to Dashboard" : "Go to Login"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
