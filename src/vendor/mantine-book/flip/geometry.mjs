'use client';
function limitPointToCircle(center, radius, point) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius || dist === 0) {
    return point;
  }
  return { x: center.x + dx / dist * radius, y: center.y + dy / dist * radius };
}
function clipToHalfPlane(poly, through, dir, ref) {
  const normal = { x: -dir.y, y: dir.x };
  const signedSide = (p) => normal.x * (p.x - through.x) + normal.y * (p.y - through.y);
  const want = Math.sign(signedSide(ref)) || 1;
  const inside = (p) => signedSide(p) * want >= -1e-9;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) {
      out.push(a);
    }
    if (ia !== ib) {
      const sa = signedSide(a);
      const sb = signedSide(b);
      const t = sa / (sa - sb);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}
function clampReflectionTarget(anchor, target, _pageWidth, pageHeight) {
  const spineTop = { x: 0, y: 0 };
  const spineBottom = { x: 0, y: pageHeight };
  const rTop = Math.hypot(anchor.x - spineTop.x, anchor.y - spineTop.y);
  const rBottom = Math.hypot(anchor.x - spineBottom.x, anchor.y - spineBottom.y);
  let t = target;
  for (let i = 0; i < 3; i++) {
    t = limitPointToCircle(spineTop, rTop, t);
    t = limitPointToCircle(spineBottom, rBottom, t);
  }
  return t;
}
const REFLECTION_REST_EPSILON = 2;
function computeReflectionFold(anchor, rawTarget, pageWidth, pageHeight) {
  const target = clampReflectionTarget(anchor, rawTarget, pageWidth, pageHeight);
  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;
  const len = Math.hypot(dx, dy);
  if (len < REFLECTION_REST_EPSILON) {
    return null;
  }
  const dragDir = { x: dx / len, y: dy / len };
  const mid = { x: (anchor.x + target.x) / 2, y: (anchor.y + target.y) / 2 };
  const creaseDir = { x: -dragDir.y, y: dragDir.x };
  const xMin = Math.min(0, anchor.x);
  const xMax = Math.max(0, anchor.x);
  const rect = [
    { x: xMin, y: 0 },
    { x: xMax, y: 0 },
    { x: xMax, y: pageHeight },
    { x: xMin, y: pageHeight }
  ];
  const flatRef = { x: mid.x + dragDir.x, y: mid.y + dragDir.y };
  const flatFront = clipToHalfPlane(rect, mid, creaseDir, flatRef);
  const flap = clipToHalfPlane(rect, mid, creaseDir, anchor);
  const dm = dragDir.x * mid.x + dragDir.y * mid.y;
  const matrix = [
    1 - 2 * dragDir.x * dragDir.x,
    // a
    -2 * dragDir.x * dragDir.y,
    // b
    -2 * dragDir.x * dragDir.y,
    // c
    1 - 2 * dragDir.y * dragDir.y,
    // d
    2 * dm * dragDir.x,
    // e
    2 * dm * dragDir.y
    // f
  ];
  const progress = Math.max(
    0,
    Math.min(100, Math.abs(anchor.x - target.x) / (2 * pageWidth) * 100)
  );
  return { flatFront, flap, matrix, progress, creaseMid: mid, creaseDir };
}
function shouldCompleteFold(progress, threshold, isSwipe, velocityX, anchorX) {
  const swipedTowardSpine = isSwipe && velocityX * anchorX < 0;
  return progress >= threshold || swipedTowardSpine;
}
function computeFoldShadow(fold, _pageWidth) {
  const [a, b, c, d, e, f] = fold.matrix;
  const reflect = (p) => ({ x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f });
  const flapPolygon = fold.flap.map(reflect);
  const dragDir = { x: fold.creaseDir.y, y: -fold.creaseDir.x };
  let depth = 1;
  for (const p of flapPolygon) {
    const proj = dragDir.x * (p.x - fold.creaseMid.x) + dragDir.y * (p.y - fold.creaseMid.y);
    if (proj > depth) {
      depth = proj;
    }
  }
  const gradient = {
    x1: fold.creaseMid.x,
    y1: fold.creaseMid.y,
    x2: fold.creaseMid.x + dragDir.x * depth,
    y2: fold.creaseMid.y + dragDir.y * depth
  };
  const t = Math.max(0, Math.min(1, fold.progress / 100));
  const strength = Math.sin(t * Math.PI);
  return { flapPolygon, gradient, strength };
}
function pointsToCssPolygon(points, unit = "px") {
  if (points.length < 3) {
    return null;
  }
  const parts = points.map((p) => `${p.x.toFixed(3)}${unit} ${p.y.toFixed(3)}${unit}`).join(", ");
  return `polygon(${parts})`;
}
function turnAnchorY(origin, height) {
  return origin === "top" ? 0 : origin === "middle" ? height / 2 : height;
}
function turnTargetY(origin, eased, height) {
  const lift = Math.sin(Math.max(0, Math.min(1, eased)) * Math.PI) * height * 0.5;
  if (origin === "top") {
    return lift;
  }
  if (origin === "bottom") {
    return height - lift;
  }
  return height / 2;
}

export { clampReflectionTarget, computeFoldShadow, computeReflectionFold, pointsToCssPolygon, shouldCompleteFold, turnAnchorY, turnTargetY };
