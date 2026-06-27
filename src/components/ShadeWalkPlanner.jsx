import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Clock3, Leaf, MapPin, Navigation, RefreshCw, Sun } from "./icons.jsx";
import { buildWalkNetwork, findShadedLoop, findShadedRoute } from "../utils/shadeRouting.js";

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function departureDate(value) {
  const [hours, minutes] = String(value || "12:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function shadeLabel(score) {
  if (score >= 75) return "High mapped shade";
  if (score >= 45) return "Mixed shade";
  return "Mostly exposed";
}

function segmentColor(shade) {
  if (shade >= 0.75) return "#257452";
  if (shade >= 0.45) return "#c79b2d";
  return "#b34d43";
}

export default function ShadeWalkPlanner({ onPlanChange, intensity = 2 }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(L.layerGroup());
  const routeLayerRef = useRef(L.layerGroup());
  const pickModeRef = useRef("start");
  const plannerModeRef = useRef("circuit");
  const [pickMode, setPickMode] = useState("start");
  const [plannerMode, setPlannerMode] = useState("circuit");
  const [start, setStart] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureTime, setDepartureTime] = useState(currentTime);
  const [network, setNetwork] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationNote, setLocationNote] = useState("Use your location or click the map to set a starting point.");

  useEffect(() => {
    pickModeRef.current = pickMode;
  }, [pickMode]);

  useEffect(() => {
    plannerModeRef.current = plannerMode;
  }, [plannerMode]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;
    const map = L.map(mapElementRef.current, { zoomControl: true, attributionControl: true }).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      14,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markersRef.current.addTo(map);
    routeLayerRef.current.addTo(map);
    map.on("click", ({ latlng }) => {
      const point = { lat: latlng.lat, lng: latlng.lng };
      if (pickModeRef.current === "start") {
        setStart(point);
        setDestination(null);
        setRoute(null);
        if (plannerModeRef.current === "circuit") {
          setLocationNote("Start selected from the map. Building a shade-prioritized circuit from this point.");
        } else {
          setLocationNote("Start selected from the map. Now choose a destination.");
          setPickMode("destination");
        }
      } else {
        setDestination(point);
        setLocationNote("Destination selected. Calculating the most shaded connected route.");
      }
    });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markers = markersRef.current;
    markers.clearLayers();
    if (start) {
      L.circleMarker([start.lat, start.lng], {
        radius: 8,
        color: "#0b294b",
        weight: 4,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).bindTooltip("Start").addTo(markers);
    }
    if (destination) {
      L.circleMarker([destination.lat, destination.lng], {
        radius: 8,
        color: "#0b294b",
        weight: 4,
        fillColor: "#dfbd58",
        fillOpacity: 1,
      }).bindTooltip("Destination").addTo(markers);
    }
  }, [destination, start]);

  useEffect(() => {
    if (!start) {
      setNetwork(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setNetwork(null);
    setRoute(null);
    fetch(`/api/walk-network?lat=${start.lat}&lon=${start.lng}&radius=700`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load nearby walking data.");
        return data;
      })
      .then((data) => {
        const nextNetwork = buildWalkNetwork(data);
        if (nextNetwork.graph.size < 2) throw new Error("No connected walking paths are mapped near this point.");
        setNetwork(nextNetwork);
        setLocationNote(plannerMode === "circuit" ? "Walking paths loaded. Circuit is ready to build from your start point." : "Walking paths loaded. Click the map to choose a destination.");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [plannerMode, start]);

  useEffect(() => {
    if (!network || !start || (plannerMode === "destination" && !destination)) {
      setRoute(null);
      return;
    }
    try {
      setError("");
      if (plannerMode === "circuit") {
        setRoute(findShadedLoop(network, start, departureDate(departureTime), { intensity }));
        setLocationNote("Circuit ready. Change intensity or departure time to rebalance distance and shade.");
      } else {
        setRoute(findShadedRoute(network, start, destination, departureDate(departureTime)));
        setLocationNote("Route ready. Change the departure time to recalculate shade.");
      }
    } catch (routeError) {
      setRoute(null);
      setError(routeError.message);
    }
  }, [departureTime, destination, intensity, network, plannerMode, start]);

  useEffect(() => {
    const layer = routeLayerRef.current;
    layer.clearLayers();
    if (!route || !mapRef.current) return;
    const coordinates = route.path.map((point) => [point.lat, point.lng]);
    L.polyline(coordinates, { color: "#ffffff", weight: 10, opacity: 0.9 }).addTo(layer);
    route.segments.forEach((segment) => {
      L.polyline(
        [[segment.from.lat, segment.from.lng], [segment.to.lat, segment.to.lng]],
        { color: segmentColor(segment.shade), weight: 6, opacity: 1 },
      ).addTo(layer);
    });
    mapRef.current.fitBounds(L.latLngBounds(coordinates), { padding: [40, 40], maxZoom: 17 });
  }, [route]);

  const plan = useMemo(() => route ? {
    id: plannerMode === "circuit"
      ? `osm-circuit-${start.lat.toFixed(5)}-${start.lng.toFixed(5)}-${departureTime}-${intensity}`
      : `osm-${start.lat.toFixed(5)}-${destination.lat.toFixed(5)}-${departureTime}`,
    name: plannerMode === "circuit"
      ? route.loopType === "out-and-back"
        ? "Shade-prioritized walking loop fallback"
        : "Shade-prioritized walking circuit"
      : "Shade-prioritized walking route",
    areaId: "openstreetmap",
    areaLabel: "Mapped UAE walking paths",
    departureTime,
    period: departureDate(departureTime).getHours() < 12 ? "morning" : departureDate(departureTime).getHours() < 18 ? "afternoon" : "evening",
    shadeScore: route.shadeScore,
    distanceKm: route.distanceKm,
    minutes: route.minutes,
    reason: plannerMode === "circuit"
      ? "Circuit follows connected pedestrian paths and leans toward shade, tree cover, parks, and building-shadow segments near your start point."
      : "Route follows mapped pedestrian paths and favors covered, tree-lined, park, and building-shadow segments.",
    start,
    destination: plannerMode === "circuit" ? start : destination,
    targetDistanceKm: route.targetDistanceKm,
    loopType: route.loopType || "route",
  } : null, [departureTime, destination, intensity, plannerMode, route, start]);

  useEffect(() => onPlanChange?.(plan), [onPlanChange, plan]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser. Click the map to set your start.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        setStart(point);
        setDestination(null);
        setPickMode(plannerMode === "circuit" ? "start" : "destination");
        setLocationNote(plannerMode === "circuit" ? `Location found with about ${Math.round(coords.accuracy)} m device accuracy. Building a shade-prioritized circuit.` : `Location found with about ${Math.round(coords.accuracy)} m device accuracy. Choose a destination.`);
        mapRef.current?.setView([point.lat, point.lng], 16);
        setLocating(false);
      },
      (locationError) => {
        setError(locationError.code === 1 ? "Location permission was denied. Click the map to set your start." : "Could not determine your location. Click the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <section className="app-panel mt-6 overflow-hidden" aria-labelledby="shade-route-title">
      <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <div className="relative min-h-[360px] bg-[#e7eef0] sm:min-h-[460px]">
          <div ref={mapElementRef} className="absolute inset-0 z-0" aria-label="Interactive OpenStreetMap walking planner" />
          <div className="pointer-events-none absolute left-3 top-3 z-[400] max-w-[calc(100%-24px)] rounded-[18px] bg-white px-3 py-2 text-xs font-bold text-uae-black shadow-soft">
            {loading ? "Loading mapped paths and shade features..." : route ? `${shadeLabel(route.shadeScore)} · about ${route.shadeScore}%` : pickMode === "start" ? "Click to set start" : "Click to set destination"}
          </div>
          <div className="pointer-events-none absolute bottom-6 left-3 z-[400] flex flex-wrap gap-2 rounded-[18px] bg-white px-3 py-2 text-[11px] font-semibold text-uae-black shadow-soft">
            <span className="flex items-center gap-1"><i className="h-2.5 w-5 rounded-sm bg-[#257452]" />High shade</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-5 rounded-sm bg-[#c79b2d]" />Mixed</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-5 rounded-sm bg-[#b34d43]" />Exposed</span>
          </div>
        </div>

        <div className="border-t-[3px] border-[var(--border-dark)] p-5 lg:border-l-[3px] lg:border-t-0">
          <div className="flex items-start gap-3">
            <span className="sketch-icon-wrap flex h-10 w-10 shrink-0 items-center justify-center"><Navigation className="h-5 w-5" /></span>
            <div><p className="text-sm font-semibold text-uae-green">Live UAE path data</p><h2 id="shade-route-title" className="mt-1 text-xl font-bold text-uae-black">{plannerMode === "circuit" ? "Build a shaded walking circuit" : route ? "Shade-prioritized route" : "Choose your walking route"}</h2></div>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`focus-ring sketch-button min-h-11 px-4 text-sm ${plannerMode === "circuit" ? "sketch-button--dark" : "sketch-button--secondary"}`}
                type="button"
                onClick={() => {
                  setPlannerMode("circuit");
                  setPickMode("start");
                  setDestination(null);
                  setRoute(null);
                  setError("");
                  setLocationNote(start ? "Building a shade-prioritized circuit from this start point." : "Use your location or click the map to set a starting point.");
                }}
              >
                Circuit from start
              </button>
              <button
                className={`focus-ring sketch-button min-h-11 px-4 text-sm ${plannerMode === "destination" ? "sketch-button--dark" : "sketch-button--secondary"}`}
                type="button"
                onClick={() => {
                  setPlannerMode("destination");
                  setPickMode(start ? "destination" : "start");
                  setRoute(null);
                  setError("");
                  setLocationNote(start ? "Choose a destination to compare shaded path options." : "Use your location or click the map to set a starting point.");
                }}
              >
                Point to point
              </button>
            </div>
            <button className="focus-ring sketch-button sketch-button--dark inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm disabled:cursor-wait disabled:opacity-65" type="button" onClick={useMyLocation} disabled={locating}>
              <MapPin className="h-4 w-4" />{locating ? "Finding location..." : "Use my location"}
            </button>
            <button className="focus-ring sketch-button sketch-button--secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm" type="button" onClick={() => { setPickMode("start"); setStart(null); setDestination(null); setRoute(null); setError(""); setLocationNote("Click the map to set a new start point."); }}>
              <RefreshCw className="h-4 w-4" />Choose start on map
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-uae-muted">{locationNote}</p>

          <label className="mt-5 grid gap-2 text-sm font-bold text-uae-black">
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Departure time</span>
            <div className="flex gap-2">
              <input className="focus-ring sketch-input min-h-11 min-w-0 flex-1 text-sm font-semibold" type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} />
              <button className="focus-ring sketch-button sketch-button--secondary px-3 text-sm" type="button" onClick={() => setDepartureTime(currentTime())}>Now</button>
            </div>
          </label>

          {route ? (
            <>
              <dl className="mt-5 grid grid-cols-3 gap-2 border-y-[3px] border-[var(--border-dark)] py-4 text-center">
                <div><dt className="text-xs text-uae-muted">Distance</dt><dd className="mt-1 font-bold">{route.distanceKm} km</dd></div>
                <div><dt className="text-xs text-uae-muted">Walking</dt><dd className="mt-1 font-bold">{route.minutes} min</dd></div>
                <div><dt className="text-xs text-uae-muted">Shade</dt><dd className="mt-1 font-bold">~{route.shadeScore}%</dd></div>
              </dl>
              {plannerMode === "circuit" ? (
                <p className="mt-3 text-xs leading-5 text-uae-muted">
                  Target distance for this intensity: about {route.targetDistanceKm} km. Result: {route.loopType === "out-and-back" ? "best available shaded fallback" : "connected circuit"}.
                </p>
              ) : null}
              <p className="mt-4 flex gap-2 text-sm leading-6 text-uae-muted"><Sun className="mt-1 h-4 w-4 shrink-0 text-[#9a741b]" /><span>Changing the time recalculates building shadows and can change the selected path.</span></p>
            </>
          ) : null}

          {network ? <p className="mt-4 flex gap-2 text-xs leading-5 text-uae-muted"><Leaf className="mt-0.5 h-4 w-4 shrink-0 text-uae-green" /><span>Data nearby: {network.coverage.walkNodes.toLocaleString()} path nodes, {network.coverage.trees.toLocaleString()} trees, {network.coverage.greenAreas.toLocaleString()} green areas, {network.coverage.buildings.toLocaleString()} buildings.</span></p> : null}
          {error ? <p className="sketch-note mt-4 bg-[#fff1ef] px-3 py-2 text-sm font-semibold text-[#8d332d]">{error}</p> : null}
          <p className="mt-4 text-xs leading-5 text-uae-muted">Routes follow OpenStreetMap paths. Shade uses mapped cover, trees, parks, building height, and solar position. Missing or outdated map features can reduce accuracy; always check visible conditions and weather.</p>
        </div>
      </div>
    </section>
  );
}
