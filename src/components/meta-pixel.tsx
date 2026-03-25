"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

const TT_PIXEL_ID = process.env.NEXT_PUBLIC_TT_PIXEL_ID;

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
    ttq: { page: () => void; track: (event: string, data?: Record<string, unknown>) => void } & Record<string, unknown>;
  }
}

const META_TO_TIKTOK_EVENT: Record<string, string> = {
  Purchase: "CompletePayment",
};

export function trackPixelEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    if (typeof window.fbq === "function") {
      window.fbq("track", event, data);
    }
    if (typeof window.ttq?.track === "function") {
      const ttEvent = META_TO_TIKTOK_EVENT[event] ?? event;
      window.ttq.track(ttEvent, data);
    }
  }
}

export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
    if (typeof window.ttq?.page === "function") {
      window.ttq.page();
    }
  }, [pathname]);

  if (!FB_PIXEL_ID && !TT_PIXEL_ID) return null;

  return (
    <>
      {TT_PIXEL_ID && (
        <Script
          id="tt-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
                var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                ttq.load('${TT_PIXEL_ID}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
      {FB_PIXEL_ID && (
        <>
          <Script
            id="fb-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${FB_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
