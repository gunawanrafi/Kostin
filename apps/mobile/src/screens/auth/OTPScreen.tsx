import React, { useEffect, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { KTopBar } from "../../components";
import { borderRadius, colors, spacing, typography } from "../../theme";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

export interface OTPScreenProps {
  onBack: () => void;
  /** Phone number to display, already formatted (e.g. "+62 812-3456-7890"). */
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  error?: string;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 6-digit OTP input with auto-focus-advance, backspace-to-previous, and a
// 60s resend cooldown. Auto-verifies once all digits are filled (mirrors the
// source prototype's auto-submit behavior).
export function OTPScreen({ onBack, phone, onVerify, onResend, error }: OTPScreenProps): React.JSX.Element {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const hasVerified = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const code = digits.join("");
    if (code.length === OTP_LENGTH && !hasVerified.current) {
      hasVerified.current = true;
      onVerify(code);
    }
    if (code.length < OTP_LENGTH) {
      hasVerified.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleChange = (index: number, value: string): void => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ): void => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  };

  const handleResend = (): void => {
    if (cooldown > 0) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    setCooldown(RESEND_COOLDOWN_SEC);
    inputRefs.current[0]?.focus();
    onResend();
  };

  const canResend = cooldown <= 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KTopBar title="Verifikasi" onBackPress={onBack} />

      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>📱</Text>
        </View>
        <Text style={styles.title}>Masukkan Kode OTP</Text>
        <Text style={styles.subtitle}>Kami kirim {OTP_LENGTH} digit ke {phone}.</Text>

        <View style={styles.digitsRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={digit}
              onChangeText={(v) => handleChange(i, v)}
              onKeyPress={(e) => handleKeyPress(i, e)}
              inputMode="numeric"
              maxLength={1}
              style={[
                styles.digitBox,
                {
                  borderColor: error ? colors.error : digit ? colors.accent : colors.border,
                  backgroundColor: error ? colors.errorSoft : digit ? colors.accentSoft : colors.surface,
                },
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Tidak menerima kode? </Text>
          <Pressable onPress={handleResend} disabled={!canResend} hitSlop={8}>
            <Text style={[styles.resendAction, !canResend && styles.resendActionDisabled]}>
              {canResend ? "Kirim ulang" : `Kirim ulang (${formatCountdown(cooldown)})`}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    alignItems: "center",
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: borderRadius["3xl"],
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.xl,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  digitsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing["2xl"] + spacing.xs,
  },
  digitBox: {
    width: 44,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: "center",
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    padding: 0,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing["2xl"] + spacing.xs,
  },
  resendPrompt: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
  },
  resendAction: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  resendActionDisabled: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default OTPScreen;
