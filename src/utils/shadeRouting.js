import * as SunCalc from "suncalc";

const PEDESTRIAN_HIGHWAYS = new Set(["footway", "path", "pedestrian", "living_street"]);
const EARTH_RADIUS_METERS = 6371000;

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= item.cost) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].cost < this.items[left].cost ? right : left;
        if (this.items[child].cost >= last.cost) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }

  get size() {
    return this.items.length;
  }
}

export function distanceMeters(a, b) {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.lat > point.lat !== previousPoint.lat > point.lat &&
      point.lng <
        ((previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)) /
          (previousPoint.lat - currentPoint.lat || Number.EPSILON) +
          currentPoint.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonCenter(points) {
  return points.reduce(
    (center, point) => ({ lat: center.lat + point.lat / points.length, lng: center.lng + point.lng / points.length }),
    { lat: 0, lng: 0 },
  );
}

function bearingDegrees(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLon = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function angularDifference(first, second) {
  return Math.abs(((first - second + 540) % 360) - 180);
}

function buildingHeight(tags = {}) {
  const direct = Number.parseFloat(String(tags.height || "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const levels = Number.parseFloat(tags["building:levels"]);
  return Number.isFinite(levels) && levels > 0 ? levels * 3 : 9;
}

function featureCell(point) {
  return `${Math.floor(point.lat * 700)}:${Math.floor(point.lng * 700)}`;
}

function nearbyFeatures(index, point) {
  const latCell = Math.floor(point.lat * 700);
  const lngCell = Math.floor(point.lng * 700);
  const nearby = [];
  for (let latOffset = -1; latOffset <= 1; latOffset += 1) {
    for (let lngOffset = -1; lngOffset <= 1; lngOffset += 1) {
      nearby.push(...(index.get(`${latCell + latOffset}:${lngCell + lngOffset}`) || []));
    }
  }
  return nearby;
}

function addToIndex(index, feature) {
  const key = featureCell(feature.center || feature);
  index.set(key, [...(index.get(key) || []), feature]);
}

export function buildWalkNetwork(overpassData) {
  const elements = Array.isArray(overpassData?.elements) ? overpassData.elements : [];
  const nodeMap = new Map();
  elements.forEach((element) => {
    if (element.type === "node" && Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
      nodeMap.set(element.id, { id: element.id, lat: element.lat, lng: element.lon, tags: element.tags || {} });
    }
  });

  const graph = new Map();
  const treeIndex = new Map();
  const greenIndex = new Map();
  const buildingIndex = new Map();
  const ways = elements.filter((element) => element.type === "way" && Array.isArray(element.nodes));

  nodeMap.forEach((node) => {
    if (node.tags.natural === "tree") addToIndex(treeIndex, node);
  });

  ways.forEach((way) => {
    const points = way.nodes.map((id) => nodeMap.get(id)).filter(Boolean);
    if (points.length < 2) return;
    const tags = way.tags || {};
    const isGreen = tags.natural === "wood" || tags.landuse === "forest" || tags.leisure === "park";
    if (isGreen && points.length >= 3) {
      addToIndex(greenIndex, { points, center: polygonCenter(points) });
    }
    if (tags.building && points.length >= 3) {
      const center = polygonCenter(points);
      const radius = Math.max(...points.map((point) => distanceMeters(center, point)));
      addToIndex(buildingIndex, { points, center, radius, height: buildingHeight(tags) });
    }

    const sidewalkMapped = ["yes", "both", "left", "right"].includes(tags.sidewalk);
    const roadWithSidewalk = ["residential", "service"].includes(tags.highway) && sidewalkMapped;
    if ((!PEDESTRIAN_HIGHWAYS.has(tags.highway) && !roadWithSidewalk) || ["no", "private"].includes(tags.access) || tags.foot === "no") return;
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index];
      const to = points[index + 1];
      const distance = distanceMeters(from, to);
      if (!graph.has(from.id)) graph.set(from.id, []);
      if (!graph.has(to.id)) graph.set(to.id, []);
      const properties = { distance, covered: tags.covered === "yes" || Boolean(tags.tunnel) };
      graph.get(from.id).push({ to: to.id, ...properties });
      graph.get(to.id).push({ to: from.id, ...properties });
    }
  });

  const componentByNode = new Map();
  const componentSizes = new Map();
  let componentId = 0;
  graph.forEach((_edges, nodeId) => {
    if (componentByNode.has(nodeId)) return;
    const pending = [nodeId];
    let size = 0;
    componentByNode.set(nodeId, componentId);
    while (pending.length) {
      const current = pending.pop();
      size += 1;
      (graph.get(current) || []).forEach((edge) => {
        if (!componentByNode.has(edge.to)) {
          componentByNode.set(edge.to, componentId);
          pending.push(edge.to);
        }
      });
    }
    componentSizes.set(componentId, size);
    componentId += 1;
  });

  return {
    graph,
    nodes: nodeMap,
    treeIndex,
    greenIndex,
    buildingIndex,
    componentByNode,
    componentSizes,
    coverage: {
      walkNodes: graph.size,
      trees: [...treeIndex.values()].reduce((total, items) => total + items.length, 0),
      greenAreas: [...greenIndex.values()].reduce((total, items) => total + items.length, 0),
      buildings: [...buildingIndex.values()].reduce((total, items) => total + items.length, 0),
    },
  };
}

function estimateEdgeShade(network, from, to, edge, date) {
  const midpoint = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const solar = SunCalc.getPosition(date, midpoint.lat, midpoint.lng);
  if (solar.altitude <= 0) return 0.96;
  if (edge.covered) return 0.98;

  let shade = 0.04;
  const closeTrees = nearbyFeatures(network.treeIndex, midpoint)
    .map((tree) => distanceMeters(midpoint, tree))
    .filter((distance) => distance <= 22);
  if (closeTrees.length) shade = Math.max(shade, Math.min(0.82, 0.38 + closeTrees.length * 0.12));

  const insideGreenArea = nearbyFeatures(network.greenIndex, midpoint).some((area) => pointInPolygon(midpoint, area.points));
  if (insideGreenArea) shade = Math.max(shade, 0.48);

  const sunBearing = ((solar.azimuth * 180) / Math.PI + 180 + 360) % 360;
  const shadowBearing = (sunBearing + 180) % 360;
  const altitude = Math.max(solar.altitude, 0.06);
  const shadedByBuilding = nearbyFeatures(network.buildingIndex, midpoint).some((building) => {
    const distance = distanceMeters(building.center, midpoint);
    const shadowLength = Math.min(140, building.height / Math.tan(altitude));
    if (distance > shadowLength + building.radius || distance < building.radius * 0.45) return false;
    const direction = bearingDegrees(building.center, midpoint);
    const corridorAngle = Math.min(55, (Math.atan2(building.radius + 5, Math.max(distance, 1)) * 180) / Math.PI);
    return angularDifference(direction, shadowBearing) <= corridorAngle;
  });
  if (shadedByBuilding) shade = Math.max(shade, 0.78);
  return shade;
}

export function nearestWalkNode(network, point, maxDistance = 180, allowedIds = null) {
  let nearest = null;
  network.graph.forEach((_edges, id) => {
    if (allowedIds && !allowedIds.has(id)) return;
    const node = network.nodes.get(id);
    const distance = distanceMeters(point, node);
    if ((!nearest || distance < nearest.distance) && distance <= maxDistance) nearest = { id, distance };
  });
  return nearest;
}

function nearbyWalkNodes(network, point, maxDistance = 180) {
  const candidates = [];
  network.graph.forEach((_edges, id) => {
    const distance = distanceMeters(point, network.nodes.get(id));
    if (distance <= maxDistance) candidates.push({ id, distance, component: network.componentByNode.get(id) });
  });
  return candidates.sort((first, second) => first.distance - second.distance).slice(0, 80);
}

function chooseConnectedCandidatePair(network, startPoint, endPoint) {
  const startCandidates = nearbyWalkNodes(network, startPoint);
  const endCandidates = nearbyWalkNodes(network, endPoint);
  if (!startCandidates.length) throw new Error("The start is too far from a mapped walking path.");
  if (!endCandidates.length) throw new Error("The destination is too far from a mapped walking path.");
  let pair = null;
  startCandidates.forEach((startCandidate) => {
    endCandidates.forEach((endCandidate) => {
      if (startCandidate.component !== endCandidate.component) return;
      const componentSize = network.componentSizes.get(startCandidate.component) || 1;
      const score = startCandidate.distance + endCandidate.distance - Math.min(componentSize, 500) * 0.08;
      if (!pair || score < pair.score) pair = { start: startCandidate, end: endCandidate, score };
    });
  });
  if (!pair) throw new Error("No connected walking route is mapped between those points.");
  return pair;
}

function findShadedNodeRoute(network, startId, endId, departureDate) {
  const start = { id: startId, distance: 0 };
  const end = { id: endId, distance: 0 };

  const distances = new Map([[start.id, 0]]);
  const previous = new Map();
  const queue = new MinHeap();
  queue.push({ id: start.id, cost: 0 });

  while (queue.size) {
    const current = queue.pop();
    if (current.cost !== distances.get(current.id)) continue;
    if (current.id === end.id) break;
    const from = network.nodes.get(current.id);
    (network.graph.get(current.id) || []).forEach((edge) => {
      const to = network.nodes.get(edge.to);
      const shade = estimateEdgeShade(network, from, to, edge, departureDate);
      const cost = current.cost + edge.distance * (1 + (1 - shade) * 1.8);
      if (cost < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, cost);
        previous.set(edge.to, { id: current.id, edge, shade });
        queue.push({ id: edge.to, cost });
      }
    });
  }

  if (!previous.has(end.id) && start.id !== end.id) throw new Error("No connected walking route was found between those points.");
  const steps = [];
  let cursor = end.id;
  while (cursor !== start.id) {
    const item = previous.get(cursor);
    if (!item) break;
    steps.unshift({ from: item.id, to: cursor, distance: item.edge.distance, shade: item.shade });
    cursor = item.id;
  }
  const path = [network.nodes.get(start.id), ...steps.map((step) => network.nodes.get(step.to))];
  const distance = steps.reduce((total, step) => total + step.distance, 0);
  const weightedShade = distance
    ? steps.reduce((total, step) => total + step.shade * step.distance, 0) / distance
    : 0;
  return {
    startId,
    endId,
    path,
    segments: steps.map((step) => ({
      from: network.nodes.get(step.from),
      to: network.nodes.get(step.to),
      shade: step.shade,
    })),
    distanceKm: Number((distance / 1000).toFixed(2)),
    minutes: Math.max(1, Math.round((distance / 1000 / 4.5) * 60)),
    shadeScore: Math.round(weightedShade * 100),
    startSnapMeters: Math.round(start.distance),
    endSnapMeters: Math.round(end.distance),
  };
}

function pathNodeIds(route) {
  return route.path.map((point) => point?.id).filter(Boolean);
}

function combineRoutes(routes) {
  const path = [];
  const segments = [];
  let totalDistance = 0;
  let shadeWeightedDistance = 0;
  routes.forEach((route, index) => {
    if (!route) return;
    const nextPath = index ? route.path.slice(1) : route.path;
    path.push(...nextPath);
    segments.push(...route.segments);
    const segmentDistance = route.segments.reduce((sum, segment) => sum + distanceMeters(segment.from, segment.to), 0);
    totalDistance += segmentDistance;
    shadeWeightedDistance += route.segments.reduce((sum, segment) => sum + distanceMeters(segment.from, segment.to) * segment.shade, 0);
  });
  const uniqueNodeCount = new Set(pathNodeIds({ path })).size;
  const repeatRatio = path.length > 1 ? 1 - uniqueNodeCount / path.length : 0;
  return {
    path,
    segments,
    distanceKm: Number((totalDistance / 1000).toFixed(2)),
    minutes: Math.max(1, Math.round((totalDistance / 1000 / 4.5) * 60)),
    shadeScore: totalDistance ? Math.round((shadeWeightedDistance / totalDistance) * 100) : 0,
    repeatRatio,
  };
}

function localNodeShade(network, nodeId, departureDate) {
  const node = network.nodes.get(nodeId);
  const edges = network.graph.get(nodeId) || [];
  if (!node || !edges.length) return 0;
  const shadeTotal = edges.reduce((sum, edge) => {
    const neighbor = network.nodes.get(edge.to);
    return sum + estimateEdgeShade(network, node, neighbor, edge, departureDate);
  }, 0);
  return shadeTotal / edges.length;
}

function targetLoopDistanceMeters(intensity = 2) {
  const map = { 1: 900, 2: 1400, 3: 2200, 4: 3100, 5: 4200 };
  return map[Math.max(1, Math.min(5, Math.round(Number(intensity) || 2)))] || map[2];
}

export function findShadedRoute(network, startPoint, endPoint, departureDate) {
  const { start, end } = chooseConnectedCandidatePair(network, startPoint, endPoint);
  const route = findShadedNodeRoute(network, start.id, end.id, departureDate);
  return {
    ...route,
    startSnapMeters: Math.round(start.distance),
    endSnapMeters: Math.round(end.distance),
  };
}

export function findShadedLoop(network, startPoint, departureDate, options = {}) {
  const startCandidate = nearbyWalkNodes(network, startPoint)[0];
  if (!startCandidate) throw new Error("Start point is too far from a mapped walking path.");
  const startNode = network.nodes.get(startCandidate.id);
  const targetMeters = Number(options.targetMeters || targetLoopDistanceMeters(options.intensity));
  const bandMin = targetMeters * 0.16;
  const bandMax = targetMeters * 0.42;
  const component = startCandidate.component;
  const candidates = [];
  network.graph.forEach((_edges, nodeId) => {
    if (network.componentByNode.get(nodeId) !== component || nodeId === startCandidate.id) return;
    const node = network.nodes.get(nodeId);
    const distanceFromStart = distanceMeters(startNode, node);
    if (distanceFromStart < bandMin || distanceFromStart > bandMax) return;
    candidates.push({
      id: nodeId,
      node,
      distanceFromStart,
      bearing: bearingDegrees(startNode, node),
      localShade: localNodeShade(network, nodeId, departureDate),
    });
  });
  const ranked = candidates
    .sort((first, second) => {
      const firstScore = Math.abs(first.distanceFromStart - targetMeters / 3) - first.localShade * 120;
      const secondScore = Math.abs(second.distanceFromStart - targetMeters / 3) - second.localShade * 120;
      return firstScore - secondScore;
    })
    .slice(0, 18);

  let best = null;
  for (let firstIndex = 0; firstIndex < ranked.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < ranked.length; secondIndex += 1) {
      const first = ranked[firstIndex];
      const second = ranked[secondIndex];
      const angle = angularDifference(first.bearing, second.bearing);
      if (angle < 55 || angle > 175) continue;
      try {
        const legOne = findShadedNodeRoute(network, startCandidate.id, first.id, departureDate);
        const legTwo = findShadedNodeRoute(network, first.id, second.id, departureDate);
        const legThree = findShadedNodeRoute(network, second.id, startCandidate.id, departureDate);
        const combined = combineRoutes([legOne, legTwo, legThree]);
        const targetError = Math.abs(combined.distanceKm * 1000 - targetMeters) / targetMeters;
        const score = targetError * 210 + (100 - combined.shadeScore) * 2.8 + combined.repeatRatio * 260;
        if (!best || score < best.score) best = { ...combined, score };
      } catch {
        // Try next candidate pair.
      }
    }
  }

  if (!best) {
    const fallback = ranked[0];
    if (!fallback) throw new Error("No connected shaded circuit could be built near this start point.");
    const out = findShadedNodeRoute(network, startCandidate.id, fallback.id, departureDate);
    const back = findShadedNodeRoute(network, fallback.id, startCandidate.id, departureDate);
    best = { ...combineRoutes([out, back]), score: Number.POSITIVE_INFINITY, outAndBack: true };
  }

  return {
    ...best,
    startSnapMeters: Math.round(startCandidate.distance),
    endSnapMeters: Math.round(startCandidate.distance),
    targetDistanceKm: Number((targetMeters / 1000).toFixed(2)),
    loopType: best.outAndBack ? "out-and-back" : "circuit",
  };
}
