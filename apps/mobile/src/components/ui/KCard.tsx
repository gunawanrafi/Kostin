import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { borderRadius as radii, colors, spacing } from "../../theme";

export interface KCardProps {
  children?: React.ReactNode;
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Mirrors the prototype's KCard: 1px border + optional soft shadow
// (source: boxShadow "0 2px 12px rgba(0,0,0,0.06)" when shadow is on).
export function KCard({
  children,
  padding = spacing.lg,
  borderRadius = radii.xl,
  shadow = true,
  style,
  testID,
}: KCardProps): React.JSX.Element {
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        { padding, borderRadius },
        shadow ? styles.shadow : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});

export default KCard;
