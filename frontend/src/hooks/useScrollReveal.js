import { useEffect, useRef } from "react";

/**
 * Adds the `.reveal` class to an element and reveals it on scroll using
 * IntersectionObserver. Supports staggered delays via the `delay` prop.
 */
export default function useScrollReveal({ delay = 0, threshold = 0.12, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal");
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, threshold, rootMargin]);

  return ref;
}