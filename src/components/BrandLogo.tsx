type BrandLogoProps = {
  /** Pixel width/height (square). */
  size?: number;
  className?: string;
  /** Hint for LCP on auth screens (maps to fetchpriority). */
  priority?: boolean;
};

/**
 * Uses a plain <img> so the logo loads reliably in Capacitor / Android WebView.
 * next/image can route through `/_next/image`, which some embedded WebViews handle poorly.
 */
export function BrandLogo({
  size = 32,
  className = "",
  priority,
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`shrink-0 rounded-xl object-contain shadow-md shadow-teal-900/20 dark:shadow-teal-950/40 ${className}`}
    />
  );
}
