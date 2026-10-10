"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Desktop: a thumbnail rail beside a large image that crossfades between
 * photos and zooms under the cursor. Mobile: a swipeable scroll-snap strip
 * with position dots. A new image set (another variant) starts at photo 1.
 */
const SIZES = "(min-width: 1024px) 50vw, 100vw";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const key = images.join("|");

  // Reset to the first photo when the image set changes. Adjusting state
  // during render (instead of an effect) avoids a flash of the old index.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setIndex(0);
  }

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
      {/* Thumbnails (desktop) */}
      {images.length > 1 && (
        <ul
          className="hidden flex-col gap-3 lg:flex"
          aria-label="Product photos"
        >
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                onMouseEnter={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className="relative block aspect-[4/5] w-full overflow-hidden bg-surface opacity-55 transition-opacity duration-300 hover:opacity-100 aria-[current=true]:opacity-100"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                />
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground transition-transform duration-500 ease-out-expo",
                    i === index ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Main image (desktop) */}
      {current && <ZoomImage src={current} alt={alt} />}

      {/* Swipe strip (mobile) */}
      <MobileStrip key={key} images={images} alt={alt} />
    </div>
  );
}

function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(false);

  return (
    <div
      className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden bg-surface lg:block"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        // A CSS variable, not state: no re-render per mouse move.
        e.currentTarget.style.setProperty(
          "--zoom-origin",
          `${x.toFixed(1)}% ${y.toFixed(1)}%`,
        );
      }}
    >
      <AnimatePresence initial={false}>
        <m.div
          key={src}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes={SIZES}
            // The page's largest image on desktop: no lazy loading (the
            // mobile strip's preload already fetched this same file).
            loading="eager"
            fetchPriority="high"
            className="object-cover transition-transform duration-500 ease-out-expo"
            style={{
              transformOrigin: "var(--zoom-origin, 50% 50%)",
              transform: zoom ? "scale(1.75)" : "scale(1)",
            }}
          />
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function MobileStrip({ images, alt }: { images: string[]; alt: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const onScroll = () =>
      setActive(
        Math.round(element.scrollLeft / Math.max(element.clientWidth, 1)),
      );
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative -mx-4 sm:-mx-6 lg:hidden">
      <div
        ref={strip}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        aria-label="Product photos"
      >
        {images.map((src, i) => (
          <div
            key={src}
            className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface"
          >
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              // Same sizes as the desktop image, so both resolve to one
              // download; preloaded once here.
              preload={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              sizes={SIZES}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5"
          aria-hidden
        >
          {images.map((src, i) => (
            <span
              key={src}
              className={cn(
                "h-1 rounded-full bg-foreground/80 transition-all duration-500 ease-out-expo",
                i === active ? "w-5" : "w-1 bg-foreground/35",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
