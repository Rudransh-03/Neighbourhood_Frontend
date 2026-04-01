"use client";

import { useEffect, useState } from "react";

import { LocalitySearchResponse } from "../app/types";

interface Props {
  region: LocalitySearchResponse;
  onClose: () => void;
  onCompare: () => void;
}

export default function InsightsSheet({ region, onClose, onCompare }: Props) {
  const [lazySummary, setLazySummary] = useState(region.aiSummary);
  const [isFetchingSummary, setIsFetchingSummary] = useState(!region.aiSummary);

  useEffect(() => {
    if (!region.aiSummary && region.regionId) {
      setIsFetchingSummary(true);
      fetch(`/api/locality/${region.regionId}/summary`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
             setLazySummary(data.data.aiSummary);
          }
          setIsFetchingSummary(false);
        })
        .catch(err => {
          console.error("Failed to load summary", err);
          setIsFetchingSummary(false);
        });
    } else {
      setLazySummary(region.aiSummary);
      setIsFetchingSummary(false);
    }
  }, [region.regionId, region.aiSummary]);

  // Safe parsing metrics out of 10.
  const score = region.localityScore ? region.localityScore.toFixed(1) : "N/A";

  const connectivity = region.connectivity?.score ?? 8;
  const traffic = region.traffic?.score ?? 6;
  
  // Generating placeholders for demo if missing
  const facilitiesScore = Math.min(10, Object.keys(region.facilities || {}).length * 2 || 8);
  const safety = region.safety?.score ?? 7;
  const pollution = region.pollution?.score ?? 6;

  const metrics = [
    { label: "Connectivity", value: connectivity, color: "#10b981" }, // green
    { label: "Facilities", value: facilitiesScore, color: "#f59e0b" }, // orange
    { label: "Safety", value: safety, color: "#3b82f6" }, // light blue
    { label: "Traffic", value: traffic, color: "#3b82f6" }, // blue
    { label: "Pollution", value: pollution, color: "#3b82f6" }, // blue
  ];

  const nearbyCats = Object.keys(region.facilities || {});
  const nearbyPills = nearbyCats.length > 0 ? nearbyCats : ["Hospitals", "Schools", "Metro Station", "Grocery Stores", "Malls"];

  return (
    <div
      className="glass-card slide-up"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        maxHeight: "85vh",
        borderTopLeftRadius: "24px",
        borderTopRightRadius: "24px",
        padding: "20px 24px",
        overflowY: "auto",
        pointerEvents: "all",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Handle marker / drag dash */}
      <div style={{ width: "40px", height: "4px", background: "#d1d5db", borderRadius: "10px", margin: "0 auto 16px" }} />

      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <p style={{ fontWeight: 600, color: "#111827", fontSize: "16px", margin: 0 }}>Neighborhood Insights</p>
        <button onClick={onCompare} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", gap: "3px" }}>
          <circle cx="5" cy="12" r="2" fill="#374151" />
          <circle cx="12" cy="12" r="2" fill="#374151" />
          <circle cx="19" cy="12" r="2" fill="#374151" />
        </button>
      </div>

      <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
        {region.formattedAddress || "Unknown Area"}
      </h1>
      
      {/* Area Score */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", fontSize: "15px" }}>
        <span style={{ fontWeight: 600, color: "#111827", marginRight: "6px" }}>Area Score:</span>
        <span style={{ fontWeight: 700, color: "#10b981", fontSize: "18px" }}>{score}</span>
        <span style={{ color: "#9ca3af", marginLeft: "2px" }}>/ 10</span>
      </div>

      {/* Main Score Bar */}
      <div style={{ width: "100%", height: "8px", background: "#dcfce7", borderRadius: "100px", marginBottom: "24px", overflow: "hidden" }}>
        <div style={{ width: `${(parseFloat(score) / 10) * 100}%`, height: "100%", background: "#10b981", borderRadius: "100px" }} />
      </div>

      {/* Breakdown Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center" }}>
            <span style={{ width: "100px", fontSize: "14px", color: "#4b5563", fontWeight: 500 }}>{m.label}</span>
            <div style={{ flex: 1, height: "8px", background: "#f3f4f6", borderRadius: "10px", margin: "0 12px", overflow: "hidden" }}>
              <div style={{ width: `${(m.value / 10) * 100}%`, height: "100%", background: m.color, borderRadius: "10px" }} />
            </div>
            <span style={{ width: "20px", fontSize: "14px", fontWeight: 600, color: "#111827", textAlign: "right" }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Nearby */}
      <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>Nearby</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "30px" }}>
        {nearbyPills.map((pill) => (
          <div key={pill} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", background: "#fff", border: "1.5px solid #f3f4f6",
            borderRadius: "50px", fontSize: "13px", color: "#374151", fontWeight: 500
          }}>
            <div style={{ width: "14px", height: "14px", background: "#e0f2fe", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#0ea5e9" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </div>
            {pill}
          </div>
        ))}
      </div>

      {/* Best For (AI Summary) */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Best For:</h3>
        
        {isFetchingSummary ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
             <div style={{ width: "100%", height: "16px", background: "#e5e7eb", borderRadius: "4px", animation: "pulse 1.5s infinite ease-in-out" }} />
             <div style={{ width: "94%", height: "16px", background: "#e5e7eb", borderRadius: "4px", animation: "pulse 1.5s infinite ease-in-out" }} />
             <div style={{ width: "70%", height: "16px", background: "#e5e7eb", borderRadius: "4px", animation: "pulse 1.5s infinite ease-in-out" }} />
          </div>
        ) : lazySummary ? (
          <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.5 }}>
            {lazySummary}
          </p>
        ) : (
          <p style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic", marginTop: "4px" }}>
            Insufficient verified community reviews to generate an AI summary.
          </p>
        )}
      </div>
      
      {/* Decorative Image Placeholder */}
      <div style={{
        width: "100%", height: "120px", borderRadius: "12px",
        background: "url('https://images.unsplash.com/photo-1548345680-f5475ea90f14?auto=format&fit=crop&w=800&q=80') center/cover",
        marginBottom: "20px"
      }} />

    </div>
  );
}
