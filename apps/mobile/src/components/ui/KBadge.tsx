import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { colors, typography } from "../../theme";

export type KBadgeVariant = "success" | "warning" | "error" | "info" | "accent";
export type KBadgeSize = "sm" | "md";

export interface KBadgeProps {
  label: string;
  variant?: KBadgeVariant;
  size?: KBadgeSize;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

// Mirrors the prototype's KBadge (pill, Inter/600, fully rounded) with each
// variant's soft/solid pair from theme tokens (e.g. successSoft + success).
const VARIANT_COLORS: Record<KBadgeVariant, { background: string; text: string }> = {
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  error: { background: colors.errorSoft, text: colors.error },
  info: { background: colors.infoSoft, text: colors.info },
  accent: { background: colors.accentSoft, text: colors.accent },
};

const SIZE_STYLES: Record<KBadgeSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 2, paddingHorizontal: 6, fontSize: 9 },
  md: { paddingVertical: 3, paddingHorizontal: 8, fontSize: typography.fontSize.xs },
};

export function KBadge({
  label,
  variant = "accent",
  size = "md",
  style,
  testID,
}: KBadgeProps): React.JSX.Element {
  const variantColors = VARIANT_COLORS[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Text
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: variantColors.background,
          color: variantColors.text,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          fontSize: sizeStyle.fontSize,
        },
        style,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 20,
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    overflow: "hidden",
  },
});

export default KBadge;
