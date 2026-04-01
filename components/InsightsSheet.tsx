"use client";

import { useEffect, useState } from "react";

import { LocalitySearchResponse } from "../app/types";

interface Props {
  region: LocalitySearchResponse;
  onClose: () => void;
  onCompare: () => void;
  onReviewSubmit?: (review: { regionName: string; rating: number; text: string; date: string }) => void;
  isDarkMode?: boolean;
}

export default function InsightsSheet({ region, onClose, onCompare, onReviewSubmit, isDarkMode = false }: Props) {
  const [lazySummary, setLazySummary] = useState(region.aiSummary);
  const [isFetchingSummary, setIsFetchingSummary] = useState(!region.aiSummary);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Theme colors
  const t = {
    bg: isDarkMode ? "rgba(17, 17, 21, 0.92)" : "rgba(255, 255, 255, 0.92)",
    card: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    cardBorder: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    text: isDarkMode ? "#f4f4f5" : "#111827",
    textSecondary: isDarkMode ? "#a1a1aa" : "#4b5563",
    textMuted: isDarkMode ? "#52525b" : "#9ca3af",
    barBg: isDarkMode ? "rgba(255,255,255,0.06)" : "#f3f4f6",
    pillBg: isDarkMode ? "rgba(255,255,255,0.06)" : "#fff",
    pillBorder: isDarkMode ? "rgba(255,255,255,0.08)" : "#f3f4f6",
    inputBg: isDarkMode ? "rgba(255,255,255,0.05)" : "#f9fafb",
    inputBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
    inputText: isDarkMode ? "#e4e4e7" : "#374151",
    divider: isDarkMode ? "rgba(255,255,255,0.06)" : "#e5e7eb",
    handleBar: isDarkMode ? "rgba(255,255,255,0.15)" : "#d1d5db",
    iconStroke: isDarkMode ? "#a1a1aa" : "#374151",
    scoreBg: isDarkMode ? "rgba(16,185,129,0.15)" : "#dcfce7",
    skeletonBg: isDarkMode ? "rgba(255,255,255,0.06)" : "#e5e7eb",
  };

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
    setReviewRating(0);
    setReviewText("");
    setReviewSubmitted(false);
  }, [region.regionId, region.aiSummary]);

  const submitReview = async () => {
    if (reviewRating === 0 || reviewText.length < 10) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "vipul-chauhan-001",
        },
        body: JSON.stringify({
          regionId: region.regionId,
          rating: reviewRating,
          reviewText: reviewText,
        }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        onReviewSubmit?.({
          regionName: region.formattedAddress || "Unknown Area",
          rating: reviewRating,
          text: reviewText,
          date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        });
      }
    } catch (e) {
      console.error("Review submit failed", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const score = region.localityScore ? region.localityScore.toFixed(1) : "N/A";
  const connectivity = region.connectivity?.score ?? 8;
  const traffic = region.traffic?.score ?? 6;
  const facilitiesScore = Math.min(10, Object.keys(region.facilities || {}).length * 2 || 8);
  const safety = region.safety?.score ?? 7;
  const pollution = region.pollution?.score ?? 6;

  const metrics = [
    { label: "Connectivity", value: connectivity, color: "#10b981" },
    { label: "Facilities", value: facilitiesScore, color: "#f59e0b" },
    { label: "Safety", value: safety, color: "#6366f1" },
    { label: "Traffic", value: traffic, color: "#3b82f6" },
    { label: "Pollution", value: pollution, color: "#ef4444" },
  ];

  const nearbyCats = Object.keys(region.facilities || {});
  const nearbyPills = nearbyCats.length > 0 ? nearbyCats : ["Hospitals", "Schools", "Metro Station", "Grocery Stores", "Malls"];

  const categoryIcons: Record<string, string> = {
    SCHOOL: "🏫", HOSPITAL: "🏥", GROCERY_STORE: "🛒", MALL: "🛍️",
    AIRPORT: "✈️", METRO_STATION: "🚇", Hospitals: "🏥", Schools: "🏫",
    "Metro Station": "🚇", "Grocery Stores": "🛒", Malls: "🛍️",
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        maxHeight: "85vh",
        borderTopLeftRadius: "28px",
        borderTopRightRadius: "28px",
        padding: "16px 24px 24px",
        overflowY: "auto",
        pointerEvents: "all",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        background: t.bg,
        backdropFilter: "blur(30px) saturate(1.5)",
        WebkitBackdropFilter: "blur(30px) saturate(1.5)",
        borderTop: `1px solid ${t.cardBorder}`,
        boxShadow: "0 -10px 60px rgba(0,0,0,0.3)",
        animation: "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Handle */}
      <div style={{ width: "40px", height: "4px", background: t.handleBar, borderRadius: "10px", margin: "0 auto 16px" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span style={{ fontWeight: 600, color: t.textMuted, fontSize: "13px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Neighborhood Insights</span>
        <button onClick={onCompare} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="12" r="1.5" fill={t.iconStroke} />
            <circle cx="12" cy="12" r="1.5" fill={t.iconStroke} />
            <circle cx="19" cy="12" r="1.5" fill={t.iconStroke} />
          </svg>
        </button>
      </div>

      {/* Title + Score */}
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "26px", fontWeight: 800, color: t.text, marginBottom: "6px", lineHeight: 1.2 }}>
        {region.formattedAddress || "Unknown Area"}
      </h1>
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          background: t.scoreBg,
          borderRadius: "50px",
          fontSize: "14px",
        }}>
          <span style={{ fontWeight: 700, color: "#10b981", fontSize: "18px" }}>{score}</span>
          <span style={{ color: t.textMuted, fontSize: "13px" }}>/ 10</span>
        </div>
        <div style={{ flex: 1, height: "6px", background: t.barBg, borderRadius: "100px", overflow: "hidden" }}>
          <div style={{
            width: `${(parseFloat(score) / 10) * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #10b981, #34d399)",
            borderRadius: "100px",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
        </div>
      </div>

      {/* Breakdown Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "32px" }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center" }}>
            <span style={{ width: "100px", fontSize: "13px", color: t.textSecondary, fontWeight: 500 }}>{m.label}</span>
            <div style={{ flex: 1, height: "6px", background: t.barBg, borderRadius: "10px", margin: "0 14px", overflow: "hidden" }}>
              <div style={{
                width: `${(m.value / 10) * 100}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${m.color}, ${m.color}cc)`,
                borderRadius: "10px",
                transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{ width: "24px", fontSize: "13px", fontWeight: 700, color: m.color, textAlign: "right" }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Nearby */}
      <h3 style={{ fontSize: "13px", fontWeight: 600, color: t.textMuted, marginBottom: "12px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
        Nearby
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
        {nearbyPills.map((pill) => (
          <div key={pill} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px",
            background: t.pillBg,
            border: `1px solid ${t.pillBorder}`,
            borderRadius: "50px",
            fontSize: "12px",
            color: t.textSecondary,
            fontWeight: 500,
          }}>
            <span style={{ fontSize: "14px" }}>{categoryIcons[pill] || "📍"}</span>
            {pill.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <h3 style={{ fontSize: "13px", fontWeight: 600, color: t.textMuted, marginBottom: "10px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
        AI Summary
      </h3>
      <div style={{
        marginBottom: "28px",
        padding: "16px 20px",
        background: t.card,
        borderRadius: "16px",
        border: `1px solid ${t.cardBorder}`,
      }}>
        {isFetchingSummary ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
             <div style={{ width: "100%", height: "14px", background: t.skeletonBg, borderRadius: "6px", animation: "pulse 1.5s infinite ease-in-out" }} />
             <div style={{ width: "94%", height: "14px", background: t.skeletonBg, borderRadius: "6px", animation: "pulse 1.5s infinite ease-in-out" }} />
             <div style={{ width: "70%", height: "14px", background: t.skeletonBg, borderRadius: "6px", animation: "pulse 1.5s infinite ease-in-out" }} />
          </div>
        ) : lazySummary ? (
          <p style={{ fontSize: "14px", color: t.textSecondary, lineHeight: 1.7, margin: 0 }}>
            {lazySummary}
          </p>
        ) : (
          <p style={{ fontSize: "14px", color: t.textMuted, fontStyle: "italic", margin: 0 }}>
            Insufficient verified community reviews to generate an AI summary.
          </p>
        )}
      </div>

      {/* ── WRITE A REVIEW ── */}
      <div style={{
        borderTop: `1px solid ${t.divider}`,
        paddingTop: "24px",
        marginBottom: "20px",
      }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, color: t.textMuted, marginBottom: "18px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          Rate & Review
        </h3>

        {reviewSubmitted ? (
          <div style={{
            textAlign: "center",
            padding: "28px",
            background: isDarkMode ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)",
            borderRadius: "16px",
            border: "1px solid rgba(16,185,129,0.15)",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p style={{ fontWeight: 600, color: "#10b981", fontSize: "16px", marginBottom: "4px" }}>Thanks for your review!</p>
            <p style={{ color: t.textMuted, fontSize: "13px" }}>Your feedback helps the community.</p>
          </div>
        ) : (
          <>
            {/* Star Rating */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    transition: "transform 0.15s ease",
                    transform: (hoverRating >= star || reviewRating >= star) ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill={(hoverRating || reviewRating) >= star ? "#f59e0b" : "none"}
                    stroke={(hoverRating || reviewRating) >= star ? "#f59e0b" : (isDarkMode ? "#3f3f46" : "#d1d5db")}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
              {reviewRating > 0 && (
                <span style={{
                  marginLeft: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#f59e0b",
                  letterSpacing: "0.5px",
                }}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                </span>
              )}
            </div>

            {/* Review Text */}
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience living in or visiting this area..."
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "14px 16px",
                borderRadius: "14px",
                border: `1.5px solid ${t.inputBorder}`,
                background: t.inputBg,
                fontSize: "14px",
                color: t.inputText,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                marginBottom: "8px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            />

            {/* Character count */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", color: reviewText.length >= 10 ? "#10b981" : t.textMuted }}>
                {reviewText.length} / 2000 {reviewText.length > 0 && reviewText.length < 10 ? `· ${10 - reviewText.length} more` : ""}
              </span>
            </div>

            {/* Submit */}
            <button
              onClick={submitReview}
              disabled={reviewRating === 0 || reviewText.length < 10 || isSubmitting}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                background: (reviewRating === 0 || reviewText.length < 10)
                  ? (isDarkMode ? "rgba(255,255,255,0.04)" : "#e5e7eb")
                  : "linear-gradient(135deg, #3b82f6, #6366f1)",
                border: (reviewRating === 0 || reviewText.length < 10)
                  ? `1px solid ${t.cardBorder}`
                  : "none",
                color: (reviewRating === 0 || reviewText.length < 10) ? t.textMuted : "#fff",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                cursor: (reviewRating === 0 || reviewText.length < 10) ? "not-allowed" : "pointer",
                transition: "all 0.25s ease",
                boxShadow: (reviewRating > 0 && reviewText.length >= 10) ? "0 4px 20px rgba(59,130,246,0.4)" : "none",
              }}
            >
              {isSubmitting ? "Submitting…" : "Submit Review"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
