import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors, typography } from "../../theme";

export type KostinLogoVariant = "light" | "dark";

export interface KostinLogoProps {
  size?: number;
  /** "light" = for light backgrounds (dark wordmark). "dark" = for dark backgrounds (white wordmark). */
  variant?: KostinLogoVariant;
}

// Mark color for the right building — a one-off shade from the source
// design, not a theme token (the source hardcodes it the same way).
const MARK_DARK = "#3A3A3C";

// Ports the source KostinLogo (two overlapping "building" glyphs + wordmark)
// from absolutely-positioned divs to precise SVG rects. Geometry is derived
// from the same size-relative ratios as the source (ms = size * 1.1, etc.)
export function KostinLogo({ size = 28, variant = "light" }: KostinLogoProps): React.JSX.Element {
  const ms = size * 1.1;
  const containerW = ms * 1.35;
  const containerH = ms;
  const radius = ms * 0.16;

  // Left building — accent, bottom-aligned, two stacked windows.
  const leftW = ms * 0.72;
  const leftH = ms * 0.82;
  const leftX = 0;
  const leftY = containerH - leftH;

  const winW = ms * 0.3;
  const winH = ms * 0.2;
  const winGap = ms * 0.07;
  const winRadius = ms * 0.05;
  const winX = leftX + (leftW - winW) / 2;
  const winY1 = leftY + (leftH - (winH * 2 + winGap)) / 2;
  const winY2 = winY1 + winH + winGap;

  // Right building — dark, top-aligned, 2x2 window grid.
  const rightW = ms * 0.78;
  const rightH = ms * 0.82;
  const rightX = containerW - rightW;
  const rightY = 0;

  const gridPad = ms * 0.14;
  const gridGap = ms * 0.07;
  const cellW = (rightW - gridPad * 2 - gridGap) / 2;
  const cellH = (rightH - gridPad * 2 - gridGap) / 2;
  const gridX0 = rightX + gridPad;
  const gridX1 = gridX0 + cellW + gridGap;
  const gridY0 = rightY + gridPad;
  const gridY1 = gridY0 + cellH + gridGap;

  const wordColor = variant === "dark" ? colors.surface : colors.text;

  return (
    <View style={styles.row}>
      <Svg width={containerW} height={containerH} viewBox={`0 0 ${containerW} ${containerH}`}>
        <Rect x={leftX} y={leftY} width={leftW} height={leftH} rx={radius} fill={colors.accent} />
        <Rect x={winX} y={winY1} width={winW} height={winH} rx={winRadius} fill="rgba(255,255,255,0.85)" />
        <Rect x={winX} y={winY2} width={winW} height={winH} rx={winRadius} fill="rgba(255,255,255,0.85)" />

        <Rect x={rightX} y={rightY} width={rightW} height={rightH} rx={radius} fill={MARK_DARK} />
        <Rect x={gridX0} y={gridY0} width={cellW} height={cellH} rx={ms * 0.04} fill="rgba(255,255,255,0.35)" />
        <Rect x={gridX1} y={gridY0} width={cellW} height={cellH} rx={ms * 0.04} fill="rgba(255,255,255,0.35)" />
        <Rect x={gridX0} y={gridY1} width={cellW} height={cellH} rx={ms * 0.04} fill="rgba(255,255,255,0.35)" />
        <Rect x={gridX1} y={gridY1} width={cellW} height={cellH} rx={ms * 0.04} fill="rgba(255,255,255,0.35)" />
      </Svg>

      <View style={[styles.wordmark, { marginLeft: size * 0.35 }]}>
        <Text style={[styles.wordText, { fontSize: size, color: wordColor }]}>Kost</Text>
        <Text style={[styles.wordText, { fontSize: size, color: colors.accent }]}>in</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  wordText: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
});

export default KostinLogo;
