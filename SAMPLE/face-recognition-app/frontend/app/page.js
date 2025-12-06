"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { api } from "../lib/api";
import MultiAngleRegistration from "@/components/MultiAngleRegistration";
import RealTimeDetection from "@/components/RealTimeDetection";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700"], // medium + bold
});

export default function Home() {
  const [name, setName] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [liveMatch, setLiveMatch] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const inFlightRef = useRef(false);
  // Real-time detection only
  const registerRef = useRef(null);
  const [showMultiAngleRegistration, setShowMultiAngleRegistration] = useState(false);

  // Manual single-image registration is removed; only Face ID-style registration is supported.

  const onClickRegister = () => {
    if (registerRef.current) {
      registerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleMultiAngleRegistration = () => {
    if (!name) {
      alert("Please enter a name first");
      return;
    }
    setShowMultiAngleRegistration(true);
  };

  const handleMultiAngleComplete = (result) => {
    setShowMultiAngleRegistration(false);
    setUploadSuccess(true);
    // Start real-time detection and show the registered name once camera is on
    const justRegisteredName = result?.name || name;
    // Delay a bit so background DB insert becomes searchable
    setTimeout(() => setIsDetecting(true), 1500);
    if (justRegisteredName) {
      setLiveMatch(`${justRegisteredName} (registered)`);
    }
    setName("");
    setTimeout(() => setUploadSuccess(false), 5000);
  };

  const handleMultiAngleCancel = () => {
    setShowMultiAngleRegistration(false);
  };

  // Manual capture removed

  return (
    <div className="min-h-screen bg-dark text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-400/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M5 7l-2 3 2 3"/><path d="M19 7l2 3-2 3"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>
            </div>
            <span className={`text-3xl font-semibold tracking-tight ${orbitron.className}`}>FaceTrackr</span>
          </div>
          <div className="flex items-center gap-3">
            {!isDetecting ? (
              <button onClick={() => { setIsDetecting(true); setLiveMatch(""); setLiveError(""); }} className="btn-neon green bg-emerald-500 text-white px-4 py-2 rounded-lg">Start</button>
            ) : (
              <button onClick={() => { setIsDetecting(false); setLiveMatch(""); setLiveError(""); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg">Close</button>
            )}
            <button onClick={onClickRegister} className="btn-neon blue bg-sky-500 text-white px-4 py-2 rounded-lg">Register</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Detection Card */}
          <div className="card-neon p-6">
            <div className="mb-5">
              <h2 className="text-emerald-400 text-xl font-semibold">Live Detection Feed</h2>
              <p className="text-slate-400 text-sm">Real-time biometric scan • Facial data processing</p>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40">
              <RealTimeDetection
                isActive={isDetecting}
                onPersonDetected={(personData) => { setLiveMatch(`${personData.name} (${personData.confidence}%)`); setLiveError(""); }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setIsDetecting((v)=>!v)} className="btn-neon green bg-emerald-500 text-white px-4 py-2 rounded-lg">
                {isDetecting ? 'Scanning…' : 'Activate Camera & Scan'}
              </button>
              <div className="text-right text-sm">
                {isDetecting && (
                  <span className="text-slate-300">{liveLoading ? 'Checking…' : (liveError || (liveMatch ? `Match: ${liveMatch}` : 'No match yet'))}</span>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 system-bar rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300">Online</span>
              <span className="text-slate-400 ml-auto">Frame Rate: 60 FPS | Latency: 12ms</span>
            </div>
          </div>

          {/* Enrollment Card */}
          <div ref={registerRef} className="card-neon blue p-6">
            <h2 className="text-sky-300 text-xl font-semibold mb-2">Secure New Enrollment</h2>
            <p className="text-slate-400 text-sm mb-6">Quick, secure setup. No local image upload required.</p>
            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter person's full name"
                  className="mt-2 w-full bg-slate-900/50 border border-slate-700/70 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <button onClick={handleMultiAngleRegistration} disabled={!name} className="btn-neon green w-full bg-emerald-500 text-white py-3 rounded-lg disabled:opacity-50">
                Begin Face ID Setup 🔒
              </button>
              {uploadSuccess && (
                <div className="badge-status rounded-lg px-3 py-2 text-emerald-200">
                  Registration successful! The person has been registered.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showMultiAngleRegistration && (
        <MultiAngleRegistration personName={name} onComplete={handleMultiAngleComplete} onCancel={handleMultiAngleCancel} />
      )}
    </div>
  );
}
