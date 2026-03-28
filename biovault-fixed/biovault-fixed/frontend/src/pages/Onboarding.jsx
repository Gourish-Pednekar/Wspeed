import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, User, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { useBiometric } from "../hooks/useBiometric";
import { useAuthStore } from "../store/authStore";

const STEPS = ["Profile", "Biometric", "Wallet Ready"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { register, loading, error, isSupported } = useBiometric();
  const { login: storeLogin } = useAuthStore();

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [scanState, setScanState] = useState("idle"); // idle | scanning | success | error
  const [walletAddress, setWalletAddress] = useState("");

  async function handleSubmitProfile(e) {
    e.preventDefault();
    if (username.length < 3) return;
    setStep(1);
    // Auto-start biometric after short delay
    setTimeout(() => startBiometric(), 800);
  }

  async function startBiometric() {
    setScanState("scanning");
    try {
      const result = await register(username, email);
      storeLogin(result.token, result.user);
      setWalletAddress(result.user.walletAddress);
      setScanState("success");
      setTimeout(() => setStep(2), 1200);
    } catch (err) {
      setScanState("error");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 hex-bg"
      style={{ background: "var(--bio-black)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00e5ff, #7c3aed)" }}>
          <Fingerprint size={14} color="#000" />
        </div>
        <span className="mono font-bold text-white">BioVault</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs mono font-bold transition-all duration-300"
              style={{
                background: i <= step ? "linear-gradient(135deg, #00e5ff, #7c3aed)" : "rgba(255,255,255,0.05)",
                color: i <= step ? "#000" : "#555",
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px transition-all duration-500" style={{ background: i < step ? "#00e5ff" : "#2a2a3a" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bio-card p-8 w-full max-w-md">
        <AnimatePresence mode="wait">

          {/* Step 0: Profile */}
          {step === 0 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.1)" }}>
                  <User size={20} style={{ color: "#00e5ff" }} />
                </div>
                <div>
                  <h2 className="mono font-bold text-white text-xl">Create Account</h2>
                  <p className="text-xs text-gray-500">Step 1 of 3</p>
                </div>
              </div>

              <form onSubmit={handleSubmitProfile} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Username *</label>
                  <input
                    className="bio-input px-4 py-3"
                    placeholder="satoshi_nakamoto"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                    required
                    minLength={3}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email (optional)</label>
                  <input
                    className="bio-input px-4 py-3"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2" disabled={username.length < 3}>
                  Continue <ArrowRight size={16} />
                </button>
                <button type="button" className="btn-ghost w-full py-2 text-sm" onClick={() => navigate("/")}>
                  Back
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 1: Biometric scan */}
          {step === 1 && (
            <motion.div
              key="biometric"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h2 className="mono font-bold text-white text-xl mb-1">Register Biometric</h2>
              <p className="text-sm text-gray-500 mb-8">Touch your fingerprint sensor when prompted</p>

              {/* Fingerprint scanner visual */}
              <div className="relative flex items-center justify-center mb-8">
                {/* Outer rings */}
                {scanState === "scanning" && [1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 120 + i * 50,
                      height: 120 + i * 50,
                      border: "1px solid rgba(0,229,255,0.2)",
                    }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}

                {/* Main circle */}
                <motion.div
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: scanState === "success"
                      ? "rgba(0,255,136,0.1)"
                      : scanState === "error"
                      ? "rgba(255,51,102,0.1)"
                      : "rgba(0,229,255,0.08)",
                    border: `2px solid ${
                      scanState === "success" ? "#00ff88"
                      : scanState === "error" ? "#ff3366"
                      : "#00e5ff"
                    }`,
                  }}
                  animate={scanState === "scanning" ? { boxShadow: ["0 0 20px rgba(0,229,255,0.3)", "0 0 50px rgba(0,229,255,0.6)", "0 0 20px rgba(0,229,255,0.3)"] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {/* Scan line */}
                  {scanState === "scanning" && (
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <motion.div
                        className="absolute inset-x-0 h-0.5"
                        style={{ background: "linear-gradient(90deg, transparent, #00e5ff, transparent)" }}
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}

                  {scanState === "success" ? (
                    <CheckCircle size={48} style={{ color: "#00ff88" }} />
                  ) : scanState === "error" ? (
                    <AlertCircle size={48} style={{ color: "#ff3366" }} />
                  ) : (
                    <Fingerprint size={48} style={{ color: "#00e5ff" }} />
                  )}
                </motion.div>
              </div>

              {/* Status text */}
              <div className="mono text-sm mb-6" style={{
                color: scanState === "success" ? "#00ff88"
                  : scanState === "error" ? "#ff3366"
                  : scanState === "scanning" ? "#00e5ff"
                  : "#555"
              }}>
                {scanState === "idle" && "Ready to scan"}
                {scanState === "scanning" && "Scanning biometric..."}
                {scanState === "success" && "Biometric registered ✓"}
                {scanState === "error" && (error || "Registration failed")}
              </div>

              {!isSupported && (
                <div className="text-xs px-3 py-2 rounded-lg mb-4 text-left" style={{ background: "rgba(255,165,0,0.1)", color: "#ffa500" }}>
                  ⚠️ WebAuthn not supported. Use Chrome/Safari on a device with biometrics.
                </div>
              )}

              {(scanState === "idle" || scanState === "error") && (
                <button className="btn-primary w-full py-3 flex items-center justify-center gap-2" onClick={startBiometric} disabled={loading || !isSupported}>
                  {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Fingerprint size={18} />}
                  {scanState === "error" ? "Try Again" : "Touch Fingerprint Sensor"}
                </button>
              )}
            </motion.div>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(0,255,136,0.1)", border: "2px solid #00ff88" }}
                animate={{ boxShadow: ["0 0 20px rgba(0,255,136,0.3)", "0 0 40px rgba(0,255,136,0.5)", "0 0 20px rgba(0,255,136,0.3)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle size={40} style={{ color: "#00ff88" }} />
              </motion.div>

              <h2 className="mono font-bold text-white text-2xl mb-2">Wallet Created!</h2>
              <p className="text-sm text-gray-400 mb-6">Your biometric wallet is ready. No seed phrase needed.</p>

              <div className="p-4 rounded-xl mb-6 text-left" style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
                <div className="text-xs text-gray-500 mb-1">Your Wallet Address</div>
                <div className="mono text-xs text-cyan-400 break-all">
                  {walletAddress || "0x" + "0".repeat(40)}
                </div>
              </div>

              <button className="btn-primary w-full py-3" onClick={() => navigate("/dashboard")}>
                Go to Dashboard →
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
