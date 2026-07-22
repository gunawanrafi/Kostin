import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { borderRadius, colors, spacing, typography } from "../../theme";

export type KButtonVariant = "primary" | "dark" | "outline" | "ghost" | "success";
export type KButtonSize = "sm" | "md" | "lg";

export interface KButtonProps {
  label: string;
  variant?: KButtonVariant;
  size?: KButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Mirrors the prototype's KBtn: same 5 variants, 10px radius (borderRadius.lg),
// Inter/600 label. sm/md/lg sizing extends the source's small/regular scale.
const VARIANT_STYLES: Record<KButtonVariant, { background: string; textColor: string; borderColor?: string }> = {
  primary: { background: colors.accent, textColor: colors.surface },
  dark: { background: colors.dark, textColor: colors.surface },
  outline: { background: colors.surface, textColor: colors.text, borderColor: colors.border },
  ghost: { background: "transparent", textColor: colors.textMid },
  success: { background: colors.success, textColor: colors.surface },
};

const SIZE_STYLES: Record<KButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, fontSize: typography.fontSize.sm },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.fontSize.base },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing["2xl"], fontSize: typography.fontSize.md },
};

export function KButton({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  onPress,
  style,
  testID,
}: KButtonProps): React.JSX.Element {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.background,
          borderColor: variantStyle.borderColor ?? "transparent",
          borderWidth: variantStyle.borderColor ? 1.5 : 0,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          width: fullWidth ? "100%" : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.6 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              { color: variantStyle.textColor, fontSize: sizeStyle.fontSize },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm - 2,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },
});

export default KButton;
