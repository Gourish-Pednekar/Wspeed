import { useState, useEffect, useRef } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import useAuthStore from "../store/authStore";
import useWalletStore from "../store/walletStore";
import api from "../services/api";

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const { balance, fetchBalance } = useWalletStore();
  
  // Transaction Form State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice Auth State
  const [isRecording, setIsRecording] = useState(false);
  const [challengePhrase, setChallengePhrase] = useState("");
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(5);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (user?.walletAddress) {
      fetchBalance(user.walletAddress);
    }
  }, [user, fetchBalance]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/";
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) return alert("Fill in all fields");
    
    setIsProcessing(true);

    try {
      // 1. Prepare Transaction & Get WebAuthn Options
      console.log("Preparing transaction...");
      const prepRes = await api.post("/api/transaction/prepare", {
        to: recipient,
        value: amount,
        data: "0x",
      });
      const { userOp, authOptions } = prepRes.data;

      // 2. Primary Auth: WebAuthn (Fingerprint / FaceID)
      console.log("Awaiting biometric signature...");
      let biometricCredential;
      try {
        biometricCredential = await startAuthentication(authOptions);
      } catch (err) {
        throw new Error("Biometric authentication cancelled or failed.");
      }

      // 3. Step-Up Auth: Fetch Voice Challenge
      console.log("Fetching voice challenge...");
      const challengeRes = await api.get("/api/voice/challenge");
      setChallengePhrase(challengeRes.data.phrase);
      setIsRecording(true);
      setRecordingTimeLeft(5);

      // 4. Start Audio Recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setChallengePhrase("");
        stream.getTracks().forEach(track => track.stop()); // Kill mic access

        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        try {
          // 5. Verify Voice
          console.log("Verifying voice embedding...");
          const verifyRes = await api.post("/api/voice/verify", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (verifyRes.data.success) {
            // 6. Submit to Bundler
            console.log("Submitting UserOp to bundler...");
            const txRes = await api.post("/api/transaction/send", {
              userOp,
              biometricCredential,
              voiceAuthId: verifyRes.data.voiceAuthId,
            });

            alert(`Success! Transaction Hash: ${txRes.data.userOpHash}`);
            setRecipient("");
            setAmount("");
            fetchBalance(user.walletAddress);
          }
        } catch (err) {
          console.error("Verification failed:", err);
          alert(err.response?.data?.error || "Voice mismatch. Transaction aborted.");
        } finally {
          setIsProcessing(false);
        }
      };

      // Start recording and countdown UI
      mediaRecorder.start();
      timerRef.current = setInterval(() => {
        setRecordingTimeLeft((prev) => prev - 1);
      }, 1000);

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          clearInterval(timerRef.current);
        }
      }, 5000);

    } catch (error) {
      console.error("Transaction Error:", error);
      alert(error.message || "An error occurred during the transaction flow.");
      setIsProcessing(false);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
          BioVault Dashboard
        </h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all"
        >
          Logout
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Wallet Info Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl text-gray-400 mb-2">Wallet Address</h2>
          <p className="font-mono text-sm bg-gray-900 p-3 rounded mb-6 break-all border border-gray-700">
            {user?.walletAddress || "Loading..."}
          </p>
          
          <h2 className="text-xl text-gray-400 mb-2">Balance</h2>
          <p className="text-4xl font-bold text-green-400">
            {balance ? parseFloat(balance).toFixed(4) : "0.0000"} <span className="text-lg">ETH</span>
          </p>
        </div>

        {/* Send Transaction Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-6 text-white">Send ETH</h2>
          
          <form onSubmit={handleTransaction} className="space-y-4 relative z-10">
            <div>
              <label className="block text-gray-400 mb-1">Recipient Address</label>
              <input 
                type="text" 
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-cyan-400 focus:outline-none"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Amount (ETH)</label>
              <input 
                type="number" 
                step="0.0001"
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-cyan-400 focus:outline-none"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isProcessing}
              className={`w-full py-3 mt-4 rounded font-bold text-lg transition-all ${
                isProcessing 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] text-gray-900"
              }`}
            >
              {isProcessing ? "Processing..." : "Send Securely"}
            </button>
          </form>

          {/* Voice Recording Overlay */}
          {isRecording && (
            <div className="absolute inset-0 bg-gray-900/95 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-red-500"></div>
              </div>
              <h3 className="text-cyan-400 font-bold mb-2 uppercase tracking-wider">Voice Verification Required</h3>
              <p className="text-gray-300 mb-4 text-sm">Please read this phrase out loud clearly:</p>
              <p className="text-2xl font-mono font-bold text-white bg-gray-800 px-4 py-2 rounded border border-gray-600 mb-6 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                {challengePhrase}
              </p>
              <p className="text-red-400 font-bold">Recording ends in: {recordingTimeLeft}s</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}