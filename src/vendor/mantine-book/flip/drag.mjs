'use client';
import { useRef, useCallback, useEffect, useMemo } from 'react';

function pruneSampleWindow(samples, now, windowMs) {
  if (samples.length <= 2) {
    return samples;
  }
  const cutoff = now - windowMs;
  let start = 0;
  for (let i = 0; i < samples.length - 2; i++) {
    if (samples[i].t < cutoff) {
      start = i + 1;
    } else {
      break;
    }
  }
  return start === 0 ? samples : samples.slice(start);
}
function computeReleaseVelocity(samples) {
  if (samples.length < 2) {
    return { x: 0, y: 0 };
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = Math.max(1, last.t - first.t);
  return {
    x: (last.x - first.x) / dt,
    y: (last.y - first.y) / dt
  };
}
function classifyGesture(input) {
  const { delta, duration, swipeDistance, swipeTimeThreshold } = input;
  const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
  if (distance < swipeDistance && duration <= swipeTimeThreshold) {
    return "click";
  }
  if (distance >= swipeDistance && duration <= swipeTimeThreshold) {
    return "swipe";
  }
  return "drag";
}
function useDragController(options = {}) {
  const {
    swipeDistance = 30,
    swipeTimeThreshold = 250,
    mobileScrollSupport = true,
    velocityWindowMs = 60,
    onMove,
    onStart,
    onRelease,
    getLocalPoint
  } = options;
  const optionsRef = useRef({ onMove, onStart, onRelease, getLocalPoint });
  optionsRef.current = { onMove, onStart, onRelease, getLocalPoint };
  const stateRef = useRef(null);
  const toLocal = useCallback((clientX, clientY) => {
    const fn = optionsRef.current.getLocalPoint;
    return fn ? fn(clientX, clientY) : { x: clientX, y: clientY };
  }, []);
  const moveHandlerRef = useRef(() => {
  });
  const upHandlerRef = useRef(() => {
  });
  const cancelHandlerRef = useRef(() => {
  });
  const detachWindow = useCallback(() => {
    window.removeEventListener("pointermove", moveHandlerRef.current);
    window.removeEventListener("pointerup", upHandlerRef.current);
    window.removeEventListener("pointercancel", cancelHandlerRef.current);
  }, []);
  const handleMove = useCallback(
    (clientX, clientY, pointerId) => {
      const state = stateRef.current;
      if (!state || state.pointerId !== pointerId) {
        return;
      }
      const now = performance.now();
      const local = toLocal(clientX, clientY);
      const sample = { t: now, x: local.x, y: local.y };
      if (state.awaitingScrollDecision) {
        const dx = Math.abs(local.x - state.startPoint.x);
        const dy = Math.abs(local.y - state.startPoint.y);
        if (dx < swipeDistance / 4 && dy < swipeDistance / 4) {
          return;
        }
        if (dy > dx) {
          state.active = false;
          stateRef.current = null;
          detachWindow();
          return;
        }
        state.awaitingScrollDecision = false;
      }
      state.lastPoint = local;
      state.samples = pruneSampleWindow([...state.samples, sample], now, velocityWindowMs);
      optionsRef.current.onMove?.(local);
    },
    [swipeDistance, toLocal, velocityWindowMs, detachWindow]
  );
  const finishDrag = useCallback(
    (pointerId, cancelled) => {
      const state = stateRef.current;
      if (!state || state.pointerId !== pointerId) {
        return;
      }
      stateRef.current = null;
      detachWindow();
      if (cancelled) {
        optionsRef.current.onRelease?.({
          kind: "click",
          duration: performance.now() - state.startTime,
          delta: { x: 0, y: 0 },
          releasePoint: state.lastPoint,
          velocity: { x: 0, y: 0 }
        });
        return;
      }
      const now = performance.now();
      const duration = now - state.startTime;
      const delta = {
        x: state.lastPoint.x - state.startPoint.x,
        y: state.lastPoint.y - state.startPoint.y
      };
      const velocity = computeReleaseVelocity(state.samples);
      const kind = classifyGesture({ delta, duration, swipeDistance, swipeTimeThreshold });
      optionsRef.current.onRelease?.({
        kind,
        duration,
        delta,
        releasePoint: state.lastPoint,
        velocity
      });
    },
    [swipeDistance, swipeTimeThreshold, detachWindow]
  );
  moveHandlerRef.current = (e) => handleMove(e.clientX, e.clientY, e.pointerId);
  upHandlerRef.current = (e) => finishDrag(e.pointerId, false);
  cancelHandlerRef.current = (e) => finishDrag(e.pointerId, true);
  const onPointerDown = useCallback(
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      const now = performance.now();
      const local = toLocal(event.clientX, event.clientY);
      stateRef.current = {
        pointerId: event.pointerId,
        startTime: now,
        startPoint: local,
        lastPoint: local,
        samples: [{ t: now, x: local.x, y: local.y }],
        active: true,
        awaitingScrollDecision: mobileScrollSupport && event.pointerType !== "mouse"
      };
      detachWindow();
      window.addEventListener("pointermove", moveHandlerRef.current);
      window.addEventListener("pointerup", upHandlerRef.current);
      window.addEventListener("pointercancel", cancelHandlerRef.current);
      optionsRef.current.onStart?.(local);
    },
    [mobileScrollSupport, toLocal, detachWindow]
  );
  useEffect(() => detachWindow, [detachWindow]);
  const isDragging = useCallback(() => stateRef.current?.active === true, []);
  const noop = useCallback(() => {
  }, []);
  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove: noop,
      onPointerUp: noop,
      onPointerCancel: noop,
      isDragging
    }),
    [onPointerDown, noop, isDragging]
  );
}

export { classifyGesture, computeReleaseVelocity, pruneSampleWindow, useDragController };
