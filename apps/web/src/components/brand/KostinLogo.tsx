import * as React from "react";
import { colors } from "@/lib/design-tokens";

export interface KostinLogoProps {
  size?: number;
  /** White wordmark — set for dark backgrounds. Default true. */
  dark?: boolean;
  /** On a light background but still want a dark wordmark, pass dark={false} onLight. */
  onLight?: boolean;
}

// Two overlapping "building" glyphs (accent + dark) + "Kost"/"in" wordmark.
// Ported 1:1 from the source prototype's KostinLogo (relative-to-size ratios
// preserved via inline styles, same as the React Native port).
export function KostinLogo({ size = 28, dark = true, onLight = false }: KostinLogoProps): React.JSX.Element {
  const ms = size * 1.1;
  const wordColor = dark || !onLight ? "#FFFFFF" : colors.text;

  return (
    <div className="flex shrink-0 items-center" style={{ gap: size * 0.35 }}>
      <div className="relative shrink-0" style={{ width: ms * 1.35, height: ms }}>
        <div
          className="absolute bottom-0 left-0 flex flex-col items-center justify-center"
          style={{
            width: ms * 0.72,
            height: ms * 0.82,
            background: colors.accent,
            borderRadius: ms * 0.16,
            gap: ms * 0.07,
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                width: ms * 0.3,
                height: ms * 0.2,
                background: "rgba(255,255,255,0.85)",
                borderRadius: ms * 0.05,
              }}
            />
          ))}
        </div>
        <div
          className="absolute right-0 top-0 grid grid-cols-2"
          style={{
            width: ms * 0.78,
            height: ms * 0.82,
            background: "#3A3A3C",
            borderRadius: ms * 0.16,
            gap: ms * 0.07,
            padding: ms * 0.14,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.35)", borderRadius: ms * 0.04 }} />
          ))}
        </div>
      </div>
      <div className="flex items-baseline">
        <span
          className="font-heading font-bold leading-none"
          style={{ fontSize: size, color: wordColor, letterSpacing: "-0.5px" }}
        >
          Kost
        </span>
        <span
          className="font-heading font-bold leading-none"
          style={{ fontSize: size, color: colors.accent, letterSpacing: "-0.5px" }}
        >
          in
        </span>
      </div>
    </div>
  );
}

export default KostinLogo;
