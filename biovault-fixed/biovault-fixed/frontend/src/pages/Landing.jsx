import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Shield, Zap, Lock } from "lucide-react";
import { useBiometric } from "../hooks/useBiometric";
import { useAuthStore } from "../store/authStore";

export default function Landing() {
  const navigate = useNavigate();
  const { login, loading, error, isSupported } = useBiometric();
  const { login: storeLogin } = useAuthStore();
  const [mode, setMode] = useState(null); // null | "login"
  const [username, setUsername] = useState("");
  const [loginError, setLoginError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const result = await login(username);
      storeLogin(result.token, result.user);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err.message);
    }
  }

  return (
    <div className="min-h-screen hex-bg noise-bg flex flex-col" style={{ background: "var(--bio-black)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00e5ff, #7c3aed)" }}>
            <Fingerprint size={16} color="#000" />
          </div>
          <span className="mono font-bold text-white text-lg tracking-tight">BioVault</span>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-ghost px-4 py-2 text-sm"
            onClick={() => setMode(mode === "login" ? null : "login")}
          >
            Sign In
          </button>
          <button
            className="btn-primary px-5 py-2 text-sm"
            onClick={() => navigate("/onboarding")}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        {/* Animated fingerprint orb */}
        <motion.div
          className="relative mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Pulsing rings */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: 80 + i * 60,
                height: 80 + i * 60,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                borderColor: `rgba(0,229,255,${0.15 - i * 0.04})`,
              }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          {/* Center orb */}
          <div
            className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center glow-cyan"
            style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(124,58,237,0.2))", border: "1px solid rgba(0,229,255,0.4)" }}
          >
            <Fingerprint size={44} style={{ color: "#00e5ff" }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h1
            className="text-5xl md:text-7xl font-bold mb-4 mono"
            style={{ background: "linear-gradient(135deg, #fff 0%, #00e5ff 50%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Your Wallet.<br />Your Fingerprint.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-3" style={{ fontFamily: "DM Sans" }}>
            No seed phrases. No private keys. Just your biometric.
            Secured by ZK-proofs and ERC-4337 account abstraction.
          </p>
          <p className="text-sm text-gray-600 mb-10 mono">
            Fingerprint → ZK Commitment → On-chain Wallet
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              className="btn-primary px-8 py-4 text-base flex items-center gap-2 justify-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/onboarding")}
            >
              <Fingerprint size={18} />
              Create Biometric Wallet
            </motion.button>
            <motion.button
              className="btn-ghost px-8 py-4 text-base flex items-center gap-2"
              whileHover={{ scale: 1.03 }}
              onClick={() => setMode("login")}
            >
              <Lock size={18} />
              Sign In
            </motion.button>
          </div>
        </motion.div>

        {/* Login modal */}
        <AnimatePresence>
          {mode === "login" && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && setMode(null)}
            >
              <motion.div
                className="bio-card p-8 w-full max-w-sm"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Fingerprint size={24} style={{ color: "#00e5ff" }} />
                  <h2 className="mono font-bold text-xl text-white">Biometric Sign In</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Username</label>
                    <input
                      className="bio-input px-4 py-3"
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {(error || loginError) && (
                    <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366", border: "1px solid rgba(255,51,102,0.2)" }}>
                      {error || loginError}
                    </div>
                  )}

                  {!isSupported && (
                    <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(255,165,0,0.1)", color: "#ffa500", border: "1px solid rgba(255,165,0,0.2)" }}>
                      ⚠️ WebAuthn not supported in this browser
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    disabled={loading || !isSupported}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Fingerprint size={18} />
                        Touch Fingerprint Sensor
                      </>
                    )}
                  </button>
                  <button type="button" className="btn-ghost w-full py-2 text-sm" onClick={() => setMode(null)}>
                    Cancel
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full px-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          {[
            { icon: Shield, title: "ZK Privacy", desc: "Your biometric never leaves your device. Only a cryptographic proof is stored." },
            { icon: Zap, title: "Gasless UX", desc: "ERC-4337 Paymaster sponsors your first transactions. No ETH needed to start." },
            { icon: Lock, title: "Social Recovery", desc: "Lost your device? Trusted guardians help recover your wallet via Shamir's SSS." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bio-card p-5 text-left">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}>
                <Icon size={20} style={{ color: "#00e5ff" }} />
              </div>
              <h3 className="mono font-bold text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 mono text-xs text-gray-700">
        BioVault — ERC-4337 + WebAuthn + ZK-SNARKs
      </div>
    </div>
  );
}
