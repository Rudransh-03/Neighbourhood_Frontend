"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import InsightsSheet from "@/components/InsightsSheet";
import CompareSheet from "@/components/CompareSheet";
import { LocalitySearchResponse } from "./types";

// Leaflet must be loaded client-side only — no SSR
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lng: number; label?: string }
  | { status: "error"; message: string };

const POPULAR_AREAS_BY_CITY: Record<string, string[]> = {
  "Bengaluru": ["Indiranagar", "HSR Layout", "Koramangala", "Whitefield", "Jayanagar"],
  "Bangalore": ["Indiranagar", "HSR Layout", "Koramangala", "Whitefield", "Jayanagar"],
  "Mumbai": ["Bandra", "Andheri", "Powai", "Juhu", "Lower Parel"],
  "Delhi": ["Connaught Place", "Hauz Khas", "Dwarka", "Saket", "Lajpat Nagar"],
  "New Delhi": ["Connaught Place", "Hauz Khas", "Dwarka", "Saket", "Lajpat Nagar"],
  "Gurugram": ["DLF Cyber City", "Sohna Road", "Golf Course Road", "Sector 56", "MG Road, Gurgaon"],
  "Gurgaon": ["DLF Cyber City", "Sohna Road", "Golf Course Road", "Sector 56", "MG Road, Gurgaon"],
  "Noida": ["Sector 18", "Sector 62", "Sector 137", "Greater Noida West", "Sector 50"],
  "Ghaziabad": ["Indirapuram", "Vaishali", "Raj Nagar Extension", "Crossing Republik", "Kaushambi"],
  "Pune": ["Koregaon Park", "Viman Nagar", "Hinjewadi", "Kothrud", "Baner"],
  "Hyderabad": ["Banjara Hills", "Gachibowli", "Madhapur", "Jubilee Hills", "Hitech City"],
  "Chennai": ["T Nagar", "Adyar", "Anna Nagar", "Velachery", "OMR"],
  "Kolkata": ["Salt Lake", "New Town", "Park Street", "Ballygunge", "Rajarhat"],
  "Jaipur": ["Malviya Nagar", "Vaishali Nagar", "Mansarovar", "C-Scheme", "Tonk Road"],
  "default": ["Indiranagar", "HSR Layout", "Koramangala", "Whitefield", "Jayanagar"],
};

// Default centre shown before user grants location
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export default function Home() {
  const queryCache = useRef<Record<string, LocalitySearchResponse>>({});

  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"HOME" | "INSIGHTS" | "COMPARE">("HOME");
  const [activeRegion, setActiveRegion] = useState<LocalitySearchResponse | null>(null);
  const [compareRegion, setCompareRegion] = useState<LocalitySearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string>("default");
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [myReviews, setMyReviews] = useState<{regionName: string; rating: number; text: string; date: string}[]>([]);
  const [userSettings, setUserSettings] = useState({
    traffic: false,
    retina: true,
    haptics: true,
    tracking: false
  });

  const triggerHaptic = (ms = 15) => {
    if (userSettings.haptics && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const searchLocality = async (query: string, isCompare = false) => {
    if (!query.trim()) return;

    const cacheKey = typeof query === 'string' ? query.trim().toLowerCase() : query;
    if (queryCache.current[cacheKey]) {
      console.log(`[NI] Serving '${query}' from frontend cache`);
      if (isCompare) {
        triggerHaptic(20);
        setCompareRegion(queryCache.current[cacheKey]);
        setCurrentView("COMPARE");
      } else {
        triggerHaptic(20);
        setActiveRegion(queryCache.current[cacheKey]);
        setCurrentView("INSIGHTS");
      }
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/locality/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Fallback to "Bengaluru" if they type generic things for the demo so the Google API succeeds
        body: JSON.stringify({ query: query.includes(",") ? query : `${query}, Bengaluru` }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        queryCache.current[cacheKey] = data.data; // Save to cache
        if (isCompare) {
          triggerHaptic(20);
          setCompareRegion(data.data);
          setCurrentView("COMPARE");
        } else {
          triggerHaptic(20);
          setActiveRegion(data.data);
          setCurrentView("INSIGHTS");
        }
      } else {
        alert("Area not found or API error!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch area metrics.");
    } finally {
      setSearchLoading(false);
    }
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({
        status: "error",
        message: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setLocation({ status: "loading" });
    // Clear any active search so the map can fly to user's real GPS position
    setActiveRegion(null);
    setCurrentView("HOME");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Free reverse geocoding via Nominatim — no API key needed
        let label: string | undefined;
        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const props = data.features?.[0]?.properties;
          label = props?.suburb || props?.city || props?.name;

          // Detect city for dynamic popular areas
          const city = props?.city || props?.county || props?.state || "default";
          console.log("[NI] Detected location properties:", JSON.stringify(props));
          console.log("[NI] Resolved city for popular areas:", city);
          setDetectedCity(city);
        } catch {
          // label stays undefined — no big deal
        }

        setLocation({ status: "success", lat: latitude, lng: longitude, label });
      },
      (err) => {
        setLocation({
          status: "error",
          message:
            err.code === 1
              ? "Location permission denied. Please allow access in your browser settings."
              : "Unable to determine your location. Please try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Handle live Auto-Tracking setting
  useEffect(() => {
    if (!userSettings.tracking) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ status: "success", lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.log("Tracking error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userSettings.tracking]);

  const mapLat = activeRegion ? activeRegion.centroidLat : (location.status === "success" ? location.lat : DEFAULT_LAT);
  const mapLng = activeRegion ? activeRegion.centroidLng : (location.status === "success" ? location.lng : DEFAULT_LNG);

  return (
    <main style={{ 
      position: "relative", 
      height: "100dvh", 
      overflow: "hidden",
      backgroundColor: "#000"
    }}>
      {/* Toast Notification */}
      <div style={{
        position: "fixed", top: "40px", left: "50%", transform: `translate(-50%, ${toastMessage ? '0' : '-100px'})`,
        opacity: toastMessage ? 1 : 0, transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 9999,
        background: "rgba(17, 24, 39, 0.85)", backdropFilter: "blur(12px)", color: "#fff",
        padding: "12px 24px", borderRadius: "50px", fontWeight: 500, fontSize: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px", pointerEvents: "none"
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>
        {toastMessage}
      </div>

      {/* Full-screen real Leaflet map */}
      <MapView lat={mapLat} lng={mapLng} activeRegion={activeRegion} settings={userSettings} isDarkMode={isDarkMode} />


      {/* Overlay UI — glassmorphism cards over the map */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none", // pass map interaction through by default
        }}
      >
        {currentView === "HOME" && (
          <>
            {/* ── Gradient vignettes for cinematic map look ── */}
            <div className="top-vignette" />
            <div className="bottom-vignette" />

            {/* ── TOP BAR: Floating nav icons ── */}
            <div
              className="fade-in"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                pointerEvents: "all",
              }}
            >
              <button
                aria-label="Menu"
                onClick={() => setIsMenuOpen(true)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "14px",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {/* Location button — large, prominent GPS icon */}
              <button
                onClick={requestLocation}
                style={{
                  background: location.status === "success" ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: `1.5px solid ${location.status === "success" ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.25)"}`,
                  borderRadius: "14px",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: location.status === "loading" ? "wait" : "pointer",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = location.status === "success" ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.15)"; }}
              >
                {location.status === "loading" ? (
                  <SpinnerIcon />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={location.status === "success" ? "#34d399" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* GPS crosshair icon */}
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                )}
              </button>
            </div>

            {/* ── BOTTOM PANEL: Branding + Search + Popular Areas ── */}
            <div
              className="slide-up"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                padding: "0 20px 28px",
                pointerEvents: "all",
              }}
            >
              {/* Brand */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}>
                  Discover & Compare
                </p>
                <h1 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(28px, 6vw, 42px)",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.1,
                  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                }}>
                  Neighborhood<br/>Intelligence
                </h1>
                <p style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.7)",
                  marginTop: "8px",
                  maxWidth: "360px",
                  lineHeight: 1.4,
                }}>
                  AI-powered insights for every locality. Search any area to explore scores, facilities & traffic.
                </p>
              </div>

              {/* Search bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "16px",
                  padding: "6px 6px 6px 18px",
                  gap: "10px",
                  marginBottom: "16px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search any locality…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocality(search)}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    fontSize: "15px",
                    color: "#fff",
                    fontWeight: 500,
                  }}
                />
                <button
                  onClick={() => searchLocality(search)}
                  disabled={searchLoading}
                  style={{
                    background: searchLoading
                      ? "rgba(59,130,246,0.5)"
                      : "linear-gradient(135deg, #3b82f6, #6366f1)",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: searchLoading ? "wait" : "pointer",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.4)",
                  }}
                  onMouseEnter={(e) => { if (!searchLoading) e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {searchLoading ? (
                    <SpinnerIcon />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Popular area chips */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(POPULAR_AREAS_BY_CITY[detectedCity] || POPULAR_AREAS_BY_CITY["default"]).map((area: string, i: number) => (
                  <button
                    key={area}
                    onClick={() => { triggerHaptic(); searchLocality(area); }}
                    disabled={searchLoading}
                    className={`slide-up-delay-${Math.min(i + 1, 3)}`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "50px",
                      background: "rgba(255,255,255,0.12)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.85)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      const b = e.currentTarget;
                      b.style.background = "rgba(255,255,255,0.25)";
                      b.style.color = "#fff";
                      b.style.transform = "translateY(-2px)";
                      b.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      const b = e.currentTarget;
                      b.style.background = "rgba(255,255,255,0.12)";
                      b.style.color = "rgba(255,255,255,0.85)";
                      b.style.transform = "translateY(0)";
                      b.style.boxShadow = "none";
                    }}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {location.status === "error" && (
                <p style={{ marginTop: "12px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
                  {location.message}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {currentView === "INSIGHTS" && activeRegion && (
        <InsightsSheet 
          region={activeRegion}
          onClose={() => setCurrentView("HOME")}
          onCompare={() => searchLocality("Koramangala", true)}
          onReviewSubmit={(review) => setMyReviews(prev => [review, ...prev])}
          isDarkMode={isDarkMode}
        />
      )}
      {currentView === "COMPARE" && activeRegion && compareRegion && (
        <CompareSheet
          regionA={activeRegion}
          regionB={compareRegion}
          onClose={() => setCurrentView("INSIGHTS")}
        />
      )}

      {/* ── STUNNING GLASS OVERLAY SIDEBAR ── */}
      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${isMenuOpen ? "open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(2px)",
          zIndex: 40,
          opacity: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? "all" : "none",
          transition: "opacity 0.3s ease-in-out",
        }}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Sidebar Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "300px",
          maxWidth: "80%",
          height: "100%",
          background: isDarkMode ? "rgba(24, 24, 27, 0.92)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          boxShadow: isMenuOpen ? "0 0 40px rgba(0,0,0,0.15)" : "none",
          zIndex: 50,
          transform: isMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
          display: "flex",
          flexDirection: "column",
          padding: "30px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
          <button
            onClick={() => { triggerHaptic(10); setIsMenuOpen(false); }}
            style={{
              background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#a1a1aa" : "#374151"} strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px 0" }}>
          <div className="force-no-invert" style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "24px"
          }}>
            V
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "22px", color: isDarkMode ? "#f4f4f5" : "#111827", margin: "0 0 4px" }}>
            Hey, Vipul
          </h2>
          <p style={{ color: isDarkMode ? "#71717a" : "#6b7280", fontSize: "14px", margin: 0 }}>Discover your city</p>
        </div>

        <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "Saved Places", icon: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" },
            { label: "My Reviews", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
            { label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" },
            { label: "Dark Mode", icon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                triggerHaptic(20);
                if (item.label === "Dark Mode") {
                  setIsDarkMode(!isDarkMode);
                  setIsMenuOpen(false);
                } else if (item.label === "Settings") {
                  setIsSettingsOpen(true);
                  setIsMenuOpen(false);
                } else if (item.label === "My Reviews") {
                  setIsReviewPanelOpen(true);
                  setIsMenuOpen(false);
                } else {
                  showToast("Coming soon!");
                  setIsMenuOpen(false);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                padding: "16px",
                background: "transparent",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: 500,
                color: isDarkMode ? "#a1a1aa" : "#4b5563",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                e.currentTarget.style.color = isDarkMode ? "#f4f4f5" : "#111827";
                (e.currentTarget.firstChild as HTMLElement).style.stroke = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#4b5563";
                (e.currentTarget.firstChild as HTMLElement).style.stroke = isDarkMode ? "#71717a" : "#6b7280";
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#71717a" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto" }}>
          <p style={{ fontSize: "12px", color: isDarkMode ? "#52525b" : "#9ca3af", textAlign: "center" }}>
            v0.1.0 • Neighbourhood Intelligence
          </p>
        </div>
      </div>

      {/* ── MY REVIEWS PANEL ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.35)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
          opacity: isReviewPanelOpen ? 1 : 0,
          pointerEvents: isReviewPanelOpen ? "all" : "none",
          transition: "opacity 0.4s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
        onClick={() => setIsReviewPanelOpen(false)}
      >
        <div
          style={{
            background: isDarkMode ? "rgba(24, 24, 27, 0.95)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(24px)",
            borderRadius: "24px",
            padding: "32px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            transform: isReviewPanelOpen ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 800,
              color: isDarkMode ? "#f4f4f5" : "#111827",
              margin: 0,
            }}>My Reviews</h2>
            <button
              onClick={() => setIsReviewPanelOpen(false)}
              style={{
                background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#a1a1aa" : "#374151"} strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {myReviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#3f3f46" : "#d1d5db"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ color: isDarkMode ? "#71717a" : "#9ca3af", fontSize: "15px", marginBottom: "8px" }}>
                No reviews yet
              </p>
              <p style={{ color: isDarkMode ? "#52525b" : "#d1d5db", fontSize: "13px" }}>
                Search for a locality and write your first review!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {myReviews.map((review, idx) => (
                <div
                  key={idx}
                  style={{
                    background: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "15px", color: isDarkMode ? "#f4f4f5" : "#111827" }}>
                      {review.regionName}
                    </span>
                    <span style={{ fontSize: "12px", color: isDarkMode ? "#52525b" : "#9ca3af" }}>
                      {review.date}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= review.rating ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <p style={{ color: isDarkMode ? "#a1a1aa" : "#4b5563", fontSize: "14px", lineHeight: 1.5, margin: 0 }}>
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STUNNING SETTINGS MODAL ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.35)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
          opacity: isSettingsOpen ? 1 : 0,
          pointerEvents: isSettingsOpen ? "all" : "none",
          transition: "opacity 0.4s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
        onClick={() => setIsSettingsOpen(false)}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "32px",
            width: "100%",
            maxWidth: "380px",
            padding: "32px 24px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
            transform: isSettingsOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(30px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>Settings</h2>
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", cursor: "pointer", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#e5e7eb"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#f3f4f6"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {[
              {
                category: "Map Preferences",
                items: [
                  { id: "traffic", title: "Live Traffic Layer", desc: "Show congestion polygons" },
                  { id: "retina", title: "High-Res Tiles", desc: "Crisp map rendering" }
                ]
              },
              {
                category: "System",
                items: [
                  { id: "tracking", title: "Auto-Tracking", desc: "Follow location on move" },
                  { id: "haptics", title: "Haptics", desc: "Vibrate on interactions" }
                ]
              }
            ].map((group) => (
              <div key={group.category}>
                <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px", color: "#6b7280", fontWeight: 700, marginBottom: "10px", paddingLeft: "8px" }}>
                  {group.category}
                </h3>
                <div style={{ background: "#f9fafb", borderRadius: "20px", padding: "4px 16px", border: "1px solid #f3f4f6" }}>
                  {group.items.map((setting, idx) => {
                    const isActive = userSettings[setting.id as keyof typeof userSettings];
                    return (
                      <div key={setting.id} 
                           style={{ 
                             display: "flex", justifyContent: "space-between", alignItems: "center", 
                             padding: "16px 0", borderBottom: idx < group.items.length - 1 ? "1px solid #e5e7eb" : "none",
                             cursor: "pointer"
                           }}
                           onClick={() => {
                             triggerHaptic(15);
                             setUserSettings(prev => ({ ...prev, [setting.id]: !isActive }));
                           }}
                      >
                         <div>
                            <p style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 600, color: "#111827" }}>{setting.title}</p>
                            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>{setting.desc}</p>
                         </div>
                         <div style={{
                           width: "52px", height: "32px", background: isActive ? "#3b82f6" : "#e5e7eb",
                           borderRadius: "30px", position: "relative", transition: "background 0.3s ease"
                         }}>
                           <div style={{
                             position: "absolute", top: "3px", left: isActive ? "23px" : "3px",
                             width: "26px", height: "26px", background: "#ffffff", borderRadius: "50%",
                             boxShadow: "0 3px 8px rgba(0,0,0,0.15)", transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                           }} />
                         </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              triggerHaptic(30);
              showToast("Settings and map layers securely updated!");
              setIsSettingsOpen(false);
            }}
            style={{
              width: "100%", marginTop: "36px", padding: "16px",
              background: "#111827", color: "#fff", border: "none", borderRadius: "16px",
              fontSize: "16px", fontWeight: 700, cursor: "pointer", transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
              boxShadow: "0 10px 20px rgba(17,24,39,0.2)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 25px rgba(17,24,39,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(17,24,39,0.2)"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = "0 5px 10px rgba(17,24,39,0.15)"; }}
          >
            Done
          </button>
        </div>
      </div>

    </main>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b7280"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
