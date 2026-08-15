'use client';
import { filterProps } from '@mantine/core';
import React from 'react';
import { makeFaceMarker, Curl } from '../Curl/Curl.mjs';
import { useBookContext, INHERITABLE_PROPS } from './Book.context.mjs';

const BookPage = (_props) => {
  const { ref, ...props } = _props;
  const ctx = useBookContext();
  const inherited = {};
  if (ctx) {
    for (const key of INHERITABLE_PROPS) {
      if (ctx[key] !== void 0) {
        inherited[key] = ctx[key];
      }
    }
  }
  return /* @__PURE__ */ React.createElement(Curl, { ref, ...inherited, ...filterProps(props) });
};
BookPage.displayName = "BookPage";
BookPage.Front = makeFaceMarker("front", "Book.Page.Front");
BookPage.Back = makeFaceMarker("back", "Book.Page.Back");

export { BookPage };
