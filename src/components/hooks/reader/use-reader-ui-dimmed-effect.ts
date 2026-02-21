"use client";

import { useEffect } from "react";

const BODY_DIMMED_ATTR = "data-reader-ui-dimmed";

export function useReaderUiDimmedEffect(isReaderUiDimmed: boolean) {
  useEffect(() => {
    const body = document.body;

    if (isReaderUiDimmed) {
      body.setAttribute(BODY_DIMMED_ATTR, "true");
    } else {
      body.removeAttribute(BODY_DIMMED_ATTR);
    }

    return () => {
      body.removeAttribute(BODY_DIMMED_ATTR);
    };
  }, [isReaderUiDimmed]);
}
