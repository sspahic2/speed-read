import * as React from "react"

const MOBILE_BREAKPOINT = 768
const PORTRAIT_TABLET_MAX_WIDTH = 1024
const PHONE_MAX_SHORT_EDGE = 600
const subscribers = new Set<() => void>()
let unsubscribeViewport: (() => void) | null = null

type ViewportSnapshot = {
  width: number
  height: number
}

const SERVER_VIEWPORT_SNAPSHOT: ViewportSnapshot = { width: 1024, height: 768 }
let snapshot: ViewportSnapshot = SERVER_VIEWPORT_SNAPSHOT

function readViewport(): ViewportSnapshot {
  return { width: window.innerWidth, height: window.innerHeight }
}

function getSnapshot() {
  if (typeof window === "undefined") return SERVER_VIEWPORT_SNAPSHOT

  const current = readViewport()
  if (snapshot.width !== current.width || snapshot.height !== current.height) {
    snapshot = current
  }

  return snapshot
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback())
}

function ensureViewportSubscription() {
  if (typeof window === "undefined" || unsubscribeViewport) return

  snapshot = readViewport()

  const handleChange = () => {
    snapshot = readViewport()
    notifySubscribers()
  }

  window.addEventListener("resize", handleChange)
  window.addEventListener("orientationchange", handleChange)

  unsubscribeViewport = () => {
    window.removeEventListener("resize", handleChange)
    window.removeEventListener("orientationchange", handleChange)
    unsubscribeViewport = null
  }
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  ensureViewportSubscription()
  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0 && unsubscribeViewport) {
      unsubscribeViewport()
    }
  }
}

function useViewportSnapshot() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => SERVER_VIEWPORT_SNAPSHOT)
}

export function useIsMobile() {
  const { width } = useViewportSnapshot()
  return width < MOBILE_BREAKPOINT
}

export function useReaderViewport() {
  const { width, height } = useViewportSnapshot()

  const isPortrait = height >= width
  const shortEdge = Math.min(width, height)
  const isPhone = shortEdge < PHONE_MAX_SHORT_EDGE
  const isPortraitPhone = isPhone && isPortrait
  const isLandscapePhone = isPhone && !isPortrait
  const isPortraitTablet = !isPhone && isPortrait && width <= PORTRAIT_TABLET_MAX_WIDTH
  const useMobileControls = isPhone || isPortraitTablet
  const isLandscapeTablet = !isPhone && !isPortrait
  const isShortViewport = height < 500

  return {
    width,
    height,
    isPhone,
    isPortrait,
    isPortraitPhone,
    isLandscapePhone,
    isPortraitTablet,
    isLandscapeTablet,
    useMobileControls,
    isShortViewport,
  }
}
