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
import { KButton, KInput, KTopBar } from "../../components";
import { colors, spacing, typography } from "../../theme";

export interface RegisterFields {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface RegisterScreenProps {
  onBack: () => void;
  onSubmit: (fields: RegisterFields) => void;
  onNavigateLogin: () => void;
  loading?: boolean;
}

// Registration form (nama, phone, email, password). Mirrors the source
// prototype's RegisterScreen, including the +62 phone prefix via KInput's
// "phone" variant.
export function RegisterScreen({
  onBack,
  onSubmit,
  onNavigateLogin,
  loading = false,
}: RegisterScreenProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValid = Boolean(name.trim() && phone.trim() && email.trim() && password.trim());

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <KTopBar title="Daftar Akun" onBackPress={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>Buat akun untuk mulai cari & booking kost.</Text>

        <View style={styles.form}>
          <KInput label="Nama Lengkap" placeholder="Andi Saputra" value={name} onChangeText={setName} />
          <KInput
            label="Nomor HP"
            placeholder="812-XXXX-XXXX"
            variant="phone"
            value={phone}
            onChangeText={setPhone}
          />
          <KInput
            label="Email"
            placeholder="email@contoh.com"
            value={email}
            onChangeText={setEmail}
          />
          <KInput
            label="Kata Sandi"
            placeholder="Min. 8 karakter"
            variant="password"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <KButton
          label="Lanjut"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!isValid}
          onPress={() => onSubmit({ name, phone, email, password })}
          style={styles.submitButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sudah punya akun? </Text>
          <Pressable onPress={onNavigateLogin} hitSlop={8}>
            <Text style={styles.footerLink}>Masuk</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  intro: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
  },
  form: {
    gap: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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

export default RegisterScreen;
