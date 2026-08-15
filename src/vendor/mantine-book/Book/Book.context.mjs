'use client';
import { createContext, useContext } from 'react';

const INHERITABLE_PROPS = [
  "variant",
  "align",
  "shadowOpacity",
  "shadowColor",
  "pageBackground",
  "curlRadius",
  "flippingTime",
  "flipThreshold",
  "swipeDistance",
  "swipeTimeThreshold",
  "mobileScrollSupport",
  "turnOrigin"
];
const BookContext = createContext(null);
function useBookContext() {
  return useContext(BookContext);
}

export { BookContext, INHERITABLE_PROPS, useBookContext };
