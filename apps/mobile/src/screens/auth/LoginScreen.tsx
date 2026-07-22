import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AntDesign } from "@expo/vector-icons";
import { KButton, KInput, KTopBar, KostinLogo } from "../../components";
import { colors, spacing, typography } from "../../theme";

export interface LoginScreenProps {
  onBack: () => void;
  onLogin: (identifier: string, password: string) => void;
  onForgotPassword?: () => void;
  onGoogleSignIn?: () => void;
  onNavigateRegister: () => void;
  loading?: boolean;
  error?: string;
}

// Email/phone + password login, with a Google SSO fallback and a link into
// RegisterScreen. Mirrors the source prototype's LoginScreen layout.
export function LoginScreen({
  onBack,
  onLogin,
  onForgotPassword,
  onGoogleSignIn,
  onNavigateRegister,
  loading = false,
  error,
}: LoginScreenProps): React.JSX.Element {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <KTopBar title="" onBackPress={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <KostinLogo size={28} variant="light" />
        <Text style={styles.title}>Masuk</Text>
        <Text style={styles.subtitle}>Lanjutkan pencarian kost-mu.</Text>

        <View style={styles.form}>
          <KInput
            label="Email atau No. HP"
            placeholder="email@contoh.com"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <KInput
            label="Kata Sandi"
            placeholder="••••••••"
            variant="password"
            value={password}
            onChangeText={setPassword}
            {...(error ? { error } : {})}
          />
          <Pressable
            onPress={onForgotPassword}
            hitSlop={8}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Lupa sandi?</Text>
          </Pressable>
        </View>

        <KButton
          label="Masuk"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!identifier || !password}
          onPress={() => onLogin(identifier, password)}
          style={styles.loginButton}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>atau</Text>
          <View style={styles.dividerLine} />
        </View>

        <KButton
          label="Lanjut dengan Google"
          variant="outline"
          size="lg"
          fullWidth
          icon={<AntDesign name="google" size={18} color={colors.text} />}
          {...(onGoogleSignIn ? { onPress: onGoogleSignIn } : {})}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Belum punya akun? </Text>
          <Pressable onPress={onNavigateRegister} hitSlop={8}>
            <Text style={styles.footerLink}>Daftar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    paddingBottom: spacing["3xl"],
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize["2xl"],
    color: colors.text,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textMid,
    marginTop: spacing.xs + 2,
    marginBottom: spacing["2xl"] + spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  forgotRow: {
    alignItems: "flex-end",
  },
  forgotText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  loginButton: {
    marginTop: spacing["2xl"],
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing["2xl"] - 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs + 1,
    color: colors.textLight,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: spacing["2xl"],
  },
  footerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 1,
    color: colors.textMid,
  },
  footerLink: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 1,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
});

export default LoginScreen;
