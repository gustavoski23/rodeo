'use client';
import { createVarsResolver, getThemeColor, factory, useProps, useStyles, useMantineTheme, Box } from '@mantine/core';
import React, { lazy, useState, useId, useMemo, useRef, useCallback, Suspense } from 'react';
import { pointsToCssPolygon, computeFoldShadow } from '../flip/geometry.mjs';
import { useCurlController } from '../flip/useCurlController.mjs';
import classes from './Curl.module.css.mjs';

const CurlWebglLayer = lazy(
  () => import('./webgl/CurlWebglLayer.mjs').then((m) => ({ default: m.CurlWebglLayer }))
);
const defaultProps = {
  width: 300,
  height: 600,
  variant: "flat",
  shadowOpacity: 0.5,
  shadowColor: "dark.9",
  pageBackground: "white",
  disabled: false,
  grabZone: "play-zone",
  flippingTime: 600,
  flipThreshold: 50,
  swipeDistance: 30,
  swipeTimeThreshold: 250,
  mobileScrollSupport: true
};
const varsResolver = createVarsResolver(
  (theme, { width, height, pageBackground, revealBackground, shadowColor }) => ({
    root: {
      "--curl-page-width": `${width}px`,
      "--curl-page-height": `${height}px`,
      "--curl-page-background": pageBackground === void 0 ? void 0 : getThemeColor(pageBackground, theme),
      "--curl-reveal-background": revealBackground === void 0 ? void 0 : getThemeColor(revealBackground, theme),
      "--curl-shadow-color": shadowColor === void 0 ? void 0 : getThemeColor(shadowColor, theme)
    }
  })
);
function parseFaces(children) {
  const result = { front: null, back: null };
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }
    const props = child.props;
    const name = child.type?.displayName;
    const slot = child.type?.__curlSlot;
    const face = { content: props.children, align: props.align };
    if (slot === "front" || name === "Curl.Front") {
      result.front = face;
    } else if (slot === "back" || name === "Curl.Back") {
      result.back = face;
    }
  });
  return result;
}
function alignToFlex(align) {
  const map = { start: "flex-start", center: "center", end: "flex-end" };
  return {
    justifyContent: map[align?.horizontal ?? "center"],
    alignItems: map[align?.vertical ?? "center"]
  };
}
const Curl = factory((_props) => {
  const { ref, ...restProps } = _props;
  const props = useProps("Curl", defaultProps, restProps);
  const {
    width,
    height,
    align,
    variant,
    shadowOpacity,
    shadowColor,
    pageBackground: _pb,
    revealBackground,
    curlRadius,
    disabled,
    warmSnapshots,
    hard,
    flipped: flippedProp,
    grabZone,
    turnOrigin,
    flippingTime,
    flipThreshold,
    swipeDistance,
    swipeTimeThreshold,
    mobileScrollSupport,
    onFold,
    onFlip,
    children,
    classNames,
    style,
    styles,
    unstyled,
    vars,
    className,
    mod,
    ...others
  } = props;
  const W = width ?? 300;
  const H = height ?? 600;
  const threshold = flipThreshold ?? 50;
  const [webglFailed, setWebglFailed] = useState(false);
  const rounded = variant === "rounded" && !webglFailed;
  const shadowGradientId = `curl-shadow-${useId().replace(/:/g, "")}`;
  const getStyles = useStyles({
    name: "Curl",
    props,
    classes,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    varsResolver
  });
  const faces = useMemo(() => parseFaces(children), [children]);
  const frontFlex = useMemo(() => alignToFlex(faces.front?.align ?? align), [faces.front, align]);
  const backFlex = useMemo(() => alignToFlex(faces.back?.align ?? align), [faces.back, align]);
  const rootRef = useRef(null);
  const { fold, flipped, folding, dragHandlers } = useCurlController({
    width: W,
    height: H,
    threshold,
    flippingTime: flippingTime ?? 600,
    swipeDistance,
    swipeTimeThreshold,
    mobileScrollSupport,
    disabled,
    flipped: flippedProp,
    turnOrigin,
    rootRef,
    onFold,
    onFlip
  });
  const setRootRef = useCallback(
    (node) => {
      rootRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );
  const preventNativeDrag = useCallback((event) => event.preventDefault(), []);
  const frontNode = /* @__PURE__ */ React.createElement("div", { ...getStyles("face", { style: frontFlex }), onDragStart: preventNativeDrag }, faces.front?.content);
  const backNode = /* @__PURE__ */ React.createElement("div", { ...getStyles("face", { style: backFlex }), onDragStart: preventNativeDrag }, faces.back?.content);
  const restFaceNode = flipped ? backNode : frontNode;
  const liftFaceNode = flipped ? frontNode : backNode;
  const restLeft = flipped ? 0 : W;
  const off = flipped ? W : 0;
  const shift = (poly) => poly.map((p) => ({ x: p.x + off, y: p.y }));
  const flatClip = fold ? pointsToCssPolygon(shift(fold.flatFront), "px") : null;
  const flapClip = fold ? pointsToCssPolygon(shift(fold.flap), "px") : null;
  const flapMatrix = fold ? (() => {
    const [a, b, c, d, e, f] = fold.matrix;
    const el = e + off * (1 - a);
    const fl = f - b * off;
    return `matrix(${[a, b, c, d, el, fl].map((n) => n.toFixed(5)).join(", ")})`;
  })() : void 0;
  const curlVisible = folding && flapClip !== null;
  const hardActive = hard === true && folding;
  const hardProgress = fold?.progress ?? 0;
  const hardX = flipped ? hardProgress / 50 - 1 : 1 - hardProgress / 50;
  const hardAngle = hardActive ? Math.acos(Math.max(-1, Math.min(1, hardX))) : 0;
  const webglActive = rounded && folding && hard !== true;
  const [webglReady, setWebglReady] = useState(false);
  const flatFoldVisible = !hardActive && (!rounded || webglActive && !webglReady);
  const radius = curlRadius ?? Math.round(W * 0.32);
  const theme = useMantineTheme();
  const resolvedShadowColor = getThemeColor(shadowColor ?? "dark.9", theme);
  const shadowOp = shadowOpacity ?? 0;
  const shadow = fold && shadowOp > 0 ? computeFoldShadow(fold) : null;
  const shadowPoints = shadow ? shadow.flapPolygon.map((p) => `${(p.x + W).toFixed(2)},${p.y.toFixed(2)}`).join(" ") : "";
  const castShadow = shadow ? `drop-shadow(0 1px ${(5 + 15 * shadow.strength).toFixed(1)}px color-mix(in srgb, var(--curl-shadow-color) ${(shadowOp * shadow.strength * 55).toFixed(1)}%, transparent))` : void 0;
  const sheetGrab = grabZone === "sheet";
  return /* @__PURE__ */ React.createElement(
    Box,
    {
      ref: setRootRef,
      ...getStyles("root", { style: sheetGrab ? { pointerEvents: "none" } : void 0 }),
      ...others,
      ...dragHandlers,
      mod: [{ folding, flipped, disabled, hard }, mod]
    },
    revealBackground !== void 0 && /* @__PURE__ */ React.createElement("div", { ...getStyles("revealLayer", { style: { left: restLeft } }), "aria-hidden": "true" }),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ...getStyles("restSheet", {
          style: {
            left: restLeft,
            // Re-enable pointers on the resting half when the root is a
            // pass-through surface (grabZone="sheet").
            ...sheetGrab && !disabled ? { pointerEvents: "auto" } : null,
            // While the WebGL curl (or the rigid hard sheet) is drawing it
            // shows the whole page itself; until the WebGL first frame
            // lands, keep the flat clipped fold visible.
            ...hardActive || webglActive && webglReady ? { display: "none" } : folding && flatClip ? { clipPath: flatClip, WebkitClipPath: flatClip } : null
          }
        })
      },
      restFaceNode
    ),
    hardActive && /* @__PURE__ */ React.createElement(
      "div",
      {
        ...getStyles("hardSheet", {
          style: {
            // NEGATIVE: the free edge lifts TOWARD the viewer (out of the
            // desk) as it sweeps over the spine, like a real cover.
            transform: `rotateY(${(-hardAngle * 180 / Math.PI).toFixed(3)}deg)`,
            // Shadow as box-shadow, NOT filter: a filter forces
            // transform-style to flatten, which kills the backface culling
            // and showed the mirrored front instead of the back face past
            // the vertical. box-shadow rotates with the sheet and keeps
            // the 3D context intact. Peaks at the upright pose (sin θ).
            boxShadow: shadowOp > 0 ? `0 ${(2 + 4 * Math.sin(hardAngle)).toFixed(1)}px ${(8 + 22 * Math.sin(hardAngle)).toFixed(1)}px color-mix(in srgb, var(--curl-shadow-color) ${(shadowOp * Math.sin(hardAngle) * 45).toFixed(1)}%, transparent)` : void 0
          }
        }),
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React.createElement("div", { className: classes.hardFace }, frontNode),
      /* @__PURE__ */ React.createElement("div", { className: `${classes.hardFace} ${classes.hardFaceBack}` }, backNode)
    ),
    flatFoldVisible && /* @__PURE__ */ React.createElement(
      "div",
      {
        ...getStyles("curlSheet", {
          style: curlVisible ? {
            left: restLeft,
            transformOrigin: "0 0",
            transform: flapMatrix,
            clipPath: flapClip,
            WebkitClipPath: flapClip,
            filter: castShadow
          } : { display: "none" }
        })
      },
      /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", transform: "scaleX(-1)" } }, liftFaceNode)
    ),
    flatFoldVisible && shadow && curlVisible && shadowPoints && /* @__PURE__ */ React.createElement("svg", { ...getStyles("shadowLayer"), width: W * 2, height: H, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement(
      "linearGradient",
      {
        id: shadowGradientId,
        gradientUnits: "userSpaceOnUse",
        x1: shadow.gradient.x1 + W,
        y1: shadow.gradient.y1,
        x2: shadow.gradient.x2 + W,
        y2: shadow.gradient.y2
      },
      /* @__PURE__ */ React.createElement(
        "stop",
        {
          offset: "0",
          stopColor: "var(--curl-shadow-color)",
          stopOpacity: shadowOp * shadow.strength
        }
      ),
      /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "var(--curl-shadow-color)", stopOpacity: 0 })
    )), /* @__PURE__ */ React.createElement("polygon", { points: shadowPoints, fill: `url(#${shadowGradientId})` })),
    rounded && hard !== true && /* @__PURE__ */ React.createElement(Suspense, { fallback: null }, /* @__PURE__ */ React.createElement(
      CurlWebglLayer,
      {
        width: W,
        height: H,
        active: webglActive,
        fold,
        flipped,
        curlRadius: radius,
        shadowOpacity: shadowOp,
        shadowColor: resolvedShadowColor,
        frontContent: restFaceNode,
        backContent: liftFaceNode,
        warm: warmSnapshots,
        onUnavailable: () => setWebglFailed(true),
        onReadyChange: setWebglReady
      }
    ))
  );
});
Curl.classes = classes;
Curl.displayName = "Curl";
function makeFaceMarker(slot, name) {
  const Marker = (_props) => null;
  Marker.displayName = name;
  Marker.__curlSlot = slot;
  return Marker;
}
Curl.Front = makeFaceMarker("front", "Curl.Front");
Curl.Back = makeFaceMarker("back", "Curl.Back");

export { Curl, makeFaceMarker };
