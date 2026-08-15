'use client';
import { createVarsResolver, getThemeColor, factory, useProps, useStyles, Box, VisuallyHidden } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import React, { memo, useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { CurlWebglPoolContext } from '../Curl/webgl/poolContext.mjs';
import { INHERITABLE_PROPS, BookContext } from './Book.context.mjs';
import { BookPage } from './BookPage.mjs';
import { faceToTurnedPages, turnedPagesToFace } from './page-index.mjs';
import classes from './Book.module.css.mjs';

const defaultProps = {
  defaultPage: 0,
  width: 300,
  height: 600,
  disabled: false,
  riffleDuration: 1e3
};
const varsResolver = createVarsResolver(
  (theme, { width, height, revealBackground }) => ({
    root: {
      "--curl-page-width": `${width}px`,
      "--curl-page-height": `${height}px`,
      "--curl-reveal-background": revealBackground === void 0 ? void 0 : getThemeColor(revealBackground, theme)
    }
  })
);
const RIFFLE_MIN_STEP = 80;
function useShallowStableStyle(style) {
  const ref = useRef(style);
  const prev = ref.current;
  const same = prev === style || !!prev && !!style && Object.keys(prev).length === Object.keys(style).length && Object.keys(style).every(
    (key) => prev[key] === style[key]
  );
  if (!same) {
    ref.current = style;
  }
  return same ? prev : style;
}
const BookSheet = memo(function BookSheet2(props) {
  const {
    child,
    index,
    width,
    height,
    flipped,
    disabled,
    warm,
    raised,
    total,
    stepTime,
    stepFlat,
    hard,
    className,
    style,
    onFoldStep,
    onFlipStep
  } = props;
  const childOnFold = child.props.onFold;
  const childOnFlip = child.props.onFlip;
  const overrides = {
    width,
    height,
    flipped,
    grabZone: "sheet",
    disabled,
    warmSnapshots: warm,
    hard,
    onFold: (info) => {
      onFoldStep(index);
      childOnFold?.(info);
    },
    onFlip: (info) => {
      onFlipStep(index, info.flipped);
      childOnFlip?.(info);
    }
  };
  if (stepTime !== void 0) {
    overrides.flippingTime = stepTime;
  }
  if (stepFlat) {
    overrides.variant = "flat";
  }
  const zIndex = raised ? total + 2 : flipped ? index + 1 : total - index;
  return /* @__PURE__ */ React.createElement("div", { className, style: { ...style, zIndex } }, React.cloneElement(child, overrides));
});
const Book = factory((_props) => {
  const { ref, ...restProps } = _props;
  const props = useProps("Book", defaultProps, restProps);
  const {
    page,
    defaultPage,
    onPageChange,
    width,
    height,
    disabled,
    pages,
    children,
    pageAnnouncement,
    riffleDuration,
    withCover,
    classNames,
    style,
    styles,
    unstyled,
    vars,
    className,
    mod,
    // inheritable (forwarded to pages via context)
    variant,
    align,
    shadowOpacity,
    shadowColor,
    pageBackground,
    revealBackground,
    curlRadius,
    flippingTime,
    flipThreshold,
    swipeDistance,
    swipeTimeThreshold,
    turnOrigin,
    mobileScrollSupport,
    ...others
  } = props;
  const getStyles = useStyles({
    name: "Book",
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
  const ctxSource = {
    // Mantine widens the factory `variant` to string; the payload constrains it.
    variant,
    align,
    shadowOpacity,
    shadowColor,
    pageBackground,
    curlRadius,
    flippingTime,
    flipThreshold,
    swipeDistance,
    swipeTimeThreshold,
    mobileScrollSupport,
    turnOrigin
  };
  const ctxValue = {};
  for (const key of INHERITABLE_PROPS) {
    if (ctxSource[key] !== void 0) {
      ctxValue[key] = ctxSource[key];
    }
  }
  const sheets = useMemo(() => {
    const childPages = React.Children.toArray(children).filter(
      React.isValidElement
    );
    if (childPages.length > 0 || !pages) {
      return childPages;
    }
    return pages.map((data, index) => /* @__PURE__ */ React.createElement(BookPage, { key: index, ...data.props }, /* @__PURE__ */ React.createElement(BookPage.Front, null, data.front), /* @__PURE__ */ React.createElement(BookPage.Back, null, data.back)));
  }, [children, pages]);
  const total = sheets.length;
  const [face, setFace] = useUncontrolled({
    value: page,
    defaultValue: defaultPage ?? 0,
    finalValue: 0,
    onChange: onPageChange
  });
  const turned = faceToTurnedPages(face, total);
  const [foldingIndex, setFoldingIndex] = useState(null);
  const poolHolderRef = useRef({ pool: null });
  useEffect(() => {
    const poolHolder = poolHolderRef.current;
    return () => {
      poolHolder.pool?.dispose();
      poolHolder.pool = null;
    };
  }, []);
  const [displayedState, setDisplayedTurned] = useState(
    () => faceToTurnedPages(typeof page === "number" ? page : defaultPage ?? 0, total)
  );
  const [queueStep, setQueueStep] = useState(null);
  const [stepTime, setStepTime] = useState(void 0);
  const displayedTurned = Math.min(displayedState, total);
  const effectiveTurned = queueStep === null ? displayedTurned : queueStep.forward ? Math.min(displayedTurned + 1, total) : Math.max(displayedTurned - 1, 0);
  useLayoutEffect(() => {
    if (queueStep !== null && queueStep.index >= total) {
      setQueueStep(null);
      setStepTime(void 0);
      setFoldingIndex((current) => current !== null && current >= total ? null : current);
      setDisplayedTurned((current) => Math.min(current, total));
      return;
    }
    if (queueStep !== null || foldingIndex !== null || total === 0) {
      return;
    }
    if (displayedTurned === turned) {
      return;
    }
    const steps = Math.abs(turned - displayedTurned);
    const forward = turned > displayedTurned;
    const index = forward ? displayedTurned : displayedTurned - 1;
    setStepTime(
      steps > 1 ? Math.max(RIFFLE_MIN_STEP, Math.min(flippingTime ?? 600, (riffleDuration ?? 1e3) / steps)) : void 0
    );
    setQueueStep({ index, forward });
  }, [turned, displayedTurned, foldingIndex, queueStep, total, flippingTime, riffleDuration]);
  const handleKeyDown = (event) => {
    if (disabled || total === 0 || event.target !== event.currentTarget) {
      return;
    }
    let next = null;
    if (event.key === "ArrowRight") {
      next = turned < total ? turnedPagesToFace(turned + 1) : null;
    } else if (event.key === "ArrowLeft") {
      next = turned > 0 ? turnedPagesToFace(turned - 1) : null;
    } else if (event.key === "Home") {
      next = turned > 0 ? 0 : null;
    } else if (event.key === "End") {
      next = turned < total ? turnedPagesToFace(total) : null;
    }
    if (next !== null) {
      event.preventDefault();
      setFace(next);
    }
  };
  const fromPage = turned === 0 ? 1 : 2 * turned;
  const toPage = turned === total ? 2 * total : turned === 0 ? 1 : 2 * turned + 1;
  const totalPages = total * 2;
  const announcement = total === 0 ? null : pageAnnouncement?.({ from: fromPage, to: toPage, total: totalPages }) ?? (fromPage === toPage ? `Page ${fromPage} of ${totalPages}` : `Pages ${fromPage}\u2013${toPage} of ${totalPages}`);
  const {
    onKeyDown: userOnKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-roledescription": ariaRoledescription = "book",
    role = "group",
    tabIndex,
    ...rest
  } = others;
  const queueStepRef = useRef(queueStep);
  queueStepRef.current = queueStep;
  const setFaceRef = useRef(setFace);
  setFaceRef.current = setFace;
  const handleFoldStep = useCallback((index) => {
    setFoldingIndex(index);
  }, []);
  const handleFlipStep = useCallback((index, nowFlipped) => {
    setFoldingIndex(null);
    const newTurned = nowFlipped ? index + 1 : index;
    if (queueStepRef.current?.index === index) {
      setDisplayedTurned(newTurned);
      setQueueStep(null);
    } else {
      setQueueStep(null);
      setStepTime(void 0);
      setDisplayedTurned(newTurned);
      setFaceRef.current(turnedPagesToFace(newTurned));
    }
  }, []);
  const riffleWarmHold = queueStep !== null && stepTime !== void 0 && Math.abs(turned - displayedTurned) > 2;
  const pageStyles = getStyles("page");
  const stablePageStyle = useShallowStableStyle(pageStyles.style);
  const coverShift = withCover === true && total > 0 ? turned === 0 ? -(width ?? 0) / 2 : turned === total ? (width ?? 0) / 2 : 0 : 0;
  return /* @__PURE__ */ React.createElement(BookContext.Provider, { value: ctxValue }, /* @__PURE__ */ React.createElement(CurlWebglPoolContext.Provider, { value: poolHolderRef.current }, /* @__PURE__ */ React.createElement(
    Box,
    {
      ref,
      role,
      "aria-roledescription": ariaRoledescription,
      "aria-label": ariaLabelledby ? ariaLabel : ariaLabel ?? "Book",
      "aria-labelledby": ariaLabelledby,
      tabIndex: tabIndex ?? (disabled ? -1 : 0),
      onKeyDown: (event) => {
        userOnKeyDown?.(event);
        if (!event.defaultPrevented) {
          handleKeyDown(event);
        }
      },
      ...getStyles("root", {
        style: withCover === true ? { transform: `translateX(${coverShift}px)` } : void 0
      }),
      ...rest,
      mod: [{ disabled }, mod]
    },
    /* @__PURE__ */ React.createElement(VisuallyHidden, { "aria-live": "polite", "aria-atomic": "true" }, announcement),
    sheets.map((child, index) => {
      const flipped = index < effectiveTurned;
      const inFlight = queueStep?.index ?? foldingIndex;
      const interactive = !disabled && (index === effectiveTurned || index === effectiveTurned - 1) && (inFlight === null || inFlight === index);
      const isStep = queueStep?.index === index;
      return /* @__PURE__ */ React.createElement(
        BookSheet,
        {
          key: child.key ?? index,
          child,
          index,
          width,
          height,
          flipped,
          disabled: child.props.disabled || !interactive,
          warm: !riffleWarmHold && (index === effectiveTurned || index === effectiveTurned - 1),
          raised: inFlight === index,
          total,
          stepTime: isStep ? stepTime : void 0,
          stepFlat: isStep && stepTime !== void 0,
          hard: child.props.hard ?? (withCover === true && (index === 0 || index === total - 1)),
          className: pageStyles.className,
          style: stablePageStyle,
          onFoldStep: handleFoldStep,
          onFlipStep: handleFlipStep
        }
      );
    })
  )));
});
Book.classes = classes;
Book.displayName = "Book";
Book.Page = BookPage;

export { Book };
