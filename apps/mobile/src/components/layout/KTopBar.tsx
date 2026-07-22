import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme";

export interface KTopBarProps {
  title: string;
  onBackPress?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Mirrors the prototype's ProtoNavBar: 52px height, "0 12px" padding, 8px
// gap, Rubik/600/16 title, border-bottom that disappears on the dark variant.
export function KTopBar({
  title,
  onBackPress,
  right,
  dark = false,
  style,
  testID,
}: KTopBarProps): React.JSX.Element {
  const backgroundColor = dark ? colors.dark : colors.surface;
  const textColor = dark ? colors.surface : colors.text;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor,
          borderBottomWidth: dark ? 0 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      {onBackPress ? (
        <Pressable
          onPress={onBackPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
      ) : null}

      <Text
        style={[styles.title, { color: textColor, paddingLeft: onBackPress ? 0 : spacing.sm - 2 }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.md,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default KTopBar;
