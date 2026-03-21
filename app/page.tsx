"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";

// Leaflet must be loaded client-side only — no SSR
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lng: number; label?: string }
  | { status: "error"; message: string };

const POPULAR_AREAS = [
  "Indiranagar",
  "HSR Layout",
  "Viman Nagar",
  "Koramangala",
  "Whitefield",
];

// Default centre shown before user grants location
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export default function Home() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [search, setSearch] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({
        status: "error",
        message: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setLocation({ status: "loading" });

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
          label =
            data.features?.[0]?.properties?.suburb ||
            data.features?.[0]?.properties?.city ||
            data.features?.[0]?.properties?.name;
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

  const mapLat = location.status === "success" ? location.lat : DEFAULT_LAT;
  const mapLng = location.status === "success" ? location.lng : DEFAULT_LNG;

  return (
    <main style={{ position: "relative", height: "100dvh", overflow: "hidden" }}>
      {/* Full-screen real Leaflet map */}
      <MapView lat={mapLat} lng={mapLng} />

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
        {/* ── TOP CARD ── */}
        <div
          className="glass-card slide-up"
          style={{
            margin: "20px 16px 0",
            borderRadius: "20px",
            padding: "20px 20px 16px",
            pointerEvents: "all",
          }}
        >
          {/* Nav row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <button
              aria-label="Menu"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              aria-label="Search"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
              marginBottom: "4px",
            }}
          >
            Neighborhood Intelligence
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
            Find the best places to live in your city
          </p>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f3f4f6",
              borderRadius: "12px",
              padding: "10px 14px",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search locality or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "15px",
                color: "#374151",
              }}
            />
            <button
              style={{
                background: "#3b82f6",
                border: "none",
                borderRadius: "8px",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Use my location button */}
          <button
            onClick={requestLocation}
            disabled={location.status === "loading"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px 0",
              borderRadius: "50px",
              background:
                location.status === "loading"
                  ? "#e5e7eb"
                  : location.status === "success"
                  ? "#dcfce7"
                  : "#fff",
              border: "1.5px solid #e5e7eb",
              cursor: location.status === "loading" ? "wait" : "pointer",
              fontSize: "15px",
              fontWeight: 600,
              color: location.status === "success" ? "#16a34a" : "#374151",
              transition: "all 0.25s ease",
            }}
          >
            {location.status === "loading" ? (
              <>
                <SpinnerIcon />
                Locating you…
              </>
            ) : location.status === "success" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {(location as any).label ?? "Location found"}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                Use my location
              </>
            )}
          </button>

          {location.status === "error" && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "#dc2626", textAlign: "center" }}>
              {location.message}
            </p>
          )}
        </div>

        {/* ── BOTTOM CARD ── */}
        <div
          className="glass-card slide-up-delay-2"
          style={{
            margin: "0 16px 24px",
            borderRadius: "20px",
            padding: "18px 20px",
            pointerEvents: "all",
          }}
        >
          <p
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "17px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "12px",
            }}
          >
            Popular areas:
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {POPULAR_AREAS.map((area) => (
              <button
                key={area}
                style={{
                  padding: "6px 14px",
                  borderRadius: "50px",
                  background: "#fff",
                  border: "1.5px solid #e5e7eb",
                  fontSize: "14px",
                  color: "#374151",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget;
                  b.style.background = "#3b82f6";
                  b.style.color = "#fff";
                  b.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget;
                  b.style.background = "#fff";
                  b.style.color = "#374151";
                  b.style.borderColor = "#e5e7eb";
                }}
              >
                {area}
              </button>
            ))}
          </div>
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
