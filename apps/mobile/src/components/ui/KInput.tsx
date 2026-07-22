import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { borderRadius, colors, spacing, typography } from "../../theme";

export type KInputVariant = "default" | "password" | "phone";

export interface KInputProps
  extends Pick<TextInputProps, "value" | "onChangeText" | "autoFocus" | "onBlur" | "onFocus"> {
  label?: string;
  placeholder?: string;
  error?: string;
  note?: string;
  variant?: KInputVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Mirrors the prototype's ProtoInput: 1.5px border that turns accent on
// focus / error on error, 10px radius, 11/14 padding, Inter 14 text.
export function KInput({
  label,
  placeholder,
  error,
  note,
  variant = "default",
  disabled = false,
  value,
  onChangeText,
  autoFocus,
  onBlur,
  onFocus,
  style,
  testID,
}: KInputProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(variant === "password");

  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;
  const prefix = variant === "phone" ? "+62" : undefined;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: disabled ? colors.bgAlt : colors.surface,
          },
          style,
        ]}
      >
        {prefix ? (
          <>
            <Text style={styles.prefix}>{prefix}</Text>
            <View style={styles.divider} />
          </>
        ) : null}

        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={disabled ? undefined : onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          editable={!disabled}
          autoFocus={autoFocus}
          secureTextEntry={secure}
          keyboardType={variant === "phone" ? "phone-pad" : "default"}
          autoCapitalize={variant === "password" ? "none" : "sentences"}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />

        {variant === "password" ? (
          <Pressable
            onPress={() => setSecure((s) => !s)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={secure ? "Tampilkan kata sandi" : "Sembunyikan kata sandi"}
          >
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.textMid}
            />
          </Pressable>
        ) : null}
      </View>

      {error || note ? (
        <Text style={[styles.note, error ? styles.noteError : null]}>{error ?? note}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSec,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg - 2,
    gap: spacing.sm,
  },
  prefix: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textMid,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.text,
    padding: 0,
  },
  note: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  noteError: {
    color: colors.error,
  },
});

export default KInput;
