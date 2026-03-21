"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface Props {
  lat: number;
  lng: number;
}

export default function MapView({ lat, lng }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

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

      // CartoDB Voyager — colorful, clean, free, no API key needed
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(mapRef.current);

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

    // Remove old marker if re-rendering
    if (markerRef.current) {
      markerRef.current.remove();
    }

    markerRef.current = L.marker([lat, lng], { icon: pulsingIcon })
      .addTo(mapRef.current)
      .bindPopup("<b>You are here</b>", { closeButton: false });

    // Fly to user's location smoothly
    mapRef.current.flyTo([lat, lng], 15, { duration: 1.4 });

    return () => {
      // Do NOT destroy the map on re-render — only on unmount
    };
  }, [lat, lng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="map-container" />;
}
