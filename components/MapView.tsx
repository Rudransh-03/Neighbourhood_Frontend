"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { LocalitySearchResponse } from "../app/types";

interface Props {
  lat: number;
  lng: number;
  activeRegion?: LocalitySearchResponse | null;
  settings?: {
    traffic: boolean;
    retina: boolean;
    haptics: boolean;
    tracking: boolean;
  };
}

export default function MapView({ lat, lng, activeRegion, settings }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const facilityMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trafficLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,      // no +/- buttons, scroll/pinch only
        attributionControl: false,
      });

      // Load base tiles and track reference
      tileLayerRef.current = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        { subdomains: "abcd", maxZoom: 20 }
      ).addTo(mapRef.current);

      // Create a dedicated feature group for live traffic
      trafficLayerRef.current = L.featureGroup().addTo(mapRef.current);

      // Add subtle attribution in bottom-right
      L.control
        .attribution({ prefix: "© OpenStreetMap | © CARTO" })
        .addTo(mapRef.current);
    }

    // Create a custom pulsing marker via DivIcon
    const pulsingIcon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
          <!-- Outer pulse rings -->
          <div style="
            position:absolute;
            width:48px;height:48px;
            border-radius:50%;
            background:rgba(59,130,246,0.2);
            animation:ping-ring 1.8s ease-out infinite;
          "></div>
          <div style="
            position:absolute;
            width:36px;height:36px;
            border-radius:50%;
            background:rgba(59,130,246,0.25);
            animation:ping-ring 1.8s 0.4s ease-out infinite;
          "></div>
          <!-- Inner solid dot -->
          <div style="
            position:relative;
            width:16px;height:16px;
            border-radius:50%;
            background:#3b82f6;
            border:3px solid #fff;
            box-shadow:0 2px 8px rgba(59,130,246,0.6);
          "></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    // Remove old user marker if re-rendering
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    userMarkerRef.current = L.marker([lat, lng], { icon: pulsingIcon })
      .addTo(mapRef.current)
      .bindPopup("<b>Center</b>", { closeButton: false });

    // Remove old facility markers
    facilityMarkersRef.current.forEach(m => m.remove());
    facilityMarkersRef.current = [];

    // Add new facility markers if activeRegion is present
    if (activeRegion && activeRegion.facilities) {
      Object.entries(activeRegion.facilities).forEach(([category, facilities]) => {
        facilities.forEach((fac) => {
          if (fac.lat && fac.lng) {
            // Simple blue dot icon for facilities
            const facIcon = L.divIcon({
              className: "",
              html: `<div style="width:12px; height:12px; background:#3b82f6; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            const m = L.marker([fac.lat, fac.lng], { icon: facIcon })
              .bindPopup(`<b>${fac.name}</b><br/><span style="color:#6b7280;font-size:12px;">${category}</span>`)
              .addTo(mapRef.current!);
            facilityMarkersRef.current.push(m);
          }
        });
      });
    }

    // Fly to user's location smoothly
    mapRef.current.flyTo([lat, lng], 15, { duration: 1.4 });

    return () => {
      // Do NOT destroy the map on re-render — only on unmount
    };
  }, [lat, lng, activeRegion]);

  // ── SETTINGS UPDATE (Retina & Traffic) ──
  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Retina Tiles
    if (tileLayerRef.current) {
      const isRetina = settings?.retina !== false; // default true
      const style = "voyager";
      const rs = isRetina ? "@2x" : "";
      tileLayerRef.current.setUrl(`https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}${rs}.png`);
    }

    // 2. Traffic Layer
    if (trafficLayerRef.current) {
      trafficLayerRef.current.clearLayers();
      if (settings?.traffic && activeRegion) {
        // Drop procedural red/orange polyline mocked traffic around the center
        const colors = ["#ef4444", "#f59e0b", "#991b1b"];
        for (let i = 0; i < 20; i++) {
          const startLat = activeRegion.centroidLat + (Math.random() - 0.5) * 0.015;
          const startLng = activeRegion.centroidLng + (Math.random() - 0.5) * 0.015;
          
          const coords: [number, number][] = [[startLat, startLng]];
          for (let j = 0; j < 6; j++) {
             coords.push([
                coords[j][0] + (Math.random() - 0.5) * 0.003,
                coords[j][1] + (Math.random() - 0.5) * 0.003
             ]);
          }
          L.polyline(coords, {
             color: colors[Math.floor(Math.random() * colors.length)],
             weight: Math.random() > 0.5 ? 5 : 3,
             opacity: 0.8,
             lineCap: "round",
             lineJoin: "round"
          }).addTo(trafficLayerRef.current);
        }
      }
    }
  }, [settings?.retina, settings?.traffic, activeRegion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="map-container" />;
}
