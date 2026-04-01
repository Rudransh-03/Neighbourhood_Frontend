"use client";

import { LocalitySearchResponse } from "../app/types";

interface Props {
  regionA: LocalitySearchResponse;
  regionB: LocalitySearchResponse;
  onClose: () => void;
}

export default function CompareSheet({ regionA, regionB, onClose }: Props) {
  const rsA = regionA.localityScore ? regionA.localityScore.toFixed(1) : "N/A";
  const rsB = regionB.localityScore ? regionB.localityScore.toFixed(1) : "N/A";

  const metricsA = [
    { label: "Connectivity", value: regionA.connectivity?.score ?? 8 },
    { label: "Facilities", value: Math.min(10, Object.keys(regionA.facilities || {}).length * 2 || 8) },
    { label: "Safety", value: regionA.safety?.score ?? 7 },
    { label: "Traffic", value: regionA.traffic?.score ?? 6 },
    { label: "Pollution", value: regionA.pollution?.score ?? 6 },
  ];

  const metricsB = [
    { label: "Connectivity", value: regionB.connectivity?.score ?? 8 },
    { label: "Facilities", value: Math.min(10, Object.keys(regionB.facilities || {}).length * 2 || 8) },
    { label: "Safety", value: regionB.safety?.score ?? 7 },
    { label: "Traffic", value: regionB.traffic?.score ?? 6 },
    { label: "Pollution", value: regionB.pollution?.score ?? 6 },
  ];

  return (
    <div
      className="glass-card slide-up"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        maxHeight: "90vh",
        borderTopLeftRadius: "24px",
        borderTopRightRadius: "24px",
        padding: "20px 24px",
        overflowY: "auto",
        pointerEvents: "all",
        zIndex: 20,
      }}
    >
      <div style={{ width: "40px", height: "4px", background: "#d1d5db", borderRadius: "10px", margin: "0 auto 16px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span style={{ fontWeight: 600, color: "#111827", fontSize: "16px" }}>Compare Areas</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <div style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #d1d5db", borderRadius: "50px", textAlign: "center", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
           <svg width="12" height="12" fill="#10b981" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
           {regionA.formattedAddress?.split(",")[0] || "Area A"}
        </div>
        <div style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #d1d5db", borderRadius: "50px", textAlign: "center", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
           <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4b5563" }} />
           {regionB.formattedAddress?.split(",")[0] || "Area B"}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{regionA.formattedAddress?.split(",")[0]}</h2>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{regionB.formattedAddress?.split(",")[0]}</h2>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <p style={{ margin: 0, fontSize: "14px" }}>
          <span style={{ color: "#4b5563" }}>Area Score: </span>
          <span style={{ fontWeight: 700, color: "#10b981" }}>{rsA}</span>
          <span style={{ color: "#9ca3af" }}>/10</span>
        </p>
        <p style={{ margin: 0, fontSize: "14px" }}>
          <span style={{ fontWeight: 700, color: "#10b981" }}>{rsB}</span>
          <span style={{ color: "#9ca3af", marginRight: "6px" }}>/10</span>
        </p>
      </div>

      {metricsA.map((mA, idx) => {
        const mB = metricsB[idx];
        return (
          <div key={mA.label} style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
             <span style={{ width: "80px", fontSize: "13px", color: "#4b5563", fontWeight: 500 }}>{mA.label}</span>
             <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", margin: "0 10px" }}>
               {/* Bar A */}
               <div style={{ height: "6px", flex: 1, background: "#f3f4f6", borderRadius: "10px", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
                 <div style={{ width: `${(mA.value / 10) * 100}%`, height: "100%", background: "#10b981" }} />
               </div>
               {/* Bar B */}
               <div style={{ height: "6px", flex: 1, background: "#f3f4f6", borderRadius: "10px", overflow: "hidden" }}>
                 <div style={{ width: `${(mB.value / 10) * 100}%`, height: "100%", background: "#f59e0b" }} />
               </div>
             </div>
             <span style={{ width: "20px", fontSize: "13px", color: "#6b7280", textAlign: "right" }}>
                {mA.value}
             </span>
          </div>
        )
      })}

      <div style={{ marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Overall Score</span>
        <span style={{ fontSize: "16px", fontWeight: 700 }}>
          <span style={{ color: "#10b981" }}>{rsA}</span>
          <span style={{ color: "#9ca3af", fontWeight: 500, margin: "0 2px" }}>/ 10</span>
        </span>
      </div>
      <div style={{ marginTop: "12px", display: "flex", height: "8px", gap: "4px" }}>
         <div style={{ height: "100%", flex: 1, background: "#f3f4f6", borderRadius: "10px", overflow: "hidden" }}>
           <div style={{ width: `${(parseFloat(rsA) / 10) * 100}%`, height: "100%", background: "#10b981" }} />
         </div>
         <div style={{ height: "100%", flex: 1, background: "#f3f4f6", borderRadius: "10px", overflow: "hidden" }}>
           <div style={{ width: `${(parseFloat(rsB) / 10) * 100}%`, height: "100%", background: "#bedc8b" }} />
         </div>
      </div>

      <button style={{
        marginTop: "30px", width: "100%", padding: "14px", background: "#10b981", color: "#fff",
        border: "none", borderRadius: "12px", fontWeight: 600, fontSize: "15px", cursor: "pointer"
      }}>
        Find the best places to live in {regionA.formattedAddress?.split(",")[0] || "your city"}
      </button>

    </div>
  );
}
