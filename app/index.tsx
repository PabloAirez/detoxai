import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, user, loading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  });

  // Efeito para processar resposta do Google
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  // Redirecionar se já autenticado
  useEffect(() => {
    if (user && !loading) {
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  async function handleLogin() {
    const nextEmail = email.trim();

    if (!nextEmail || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await login(nextEmail, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao acessar.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin(idToken: string) {
    try {
      setError('');
      setIsSubmitting(true);
      await loginWithGoogle(idToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao acessar com Google.';
      setError(errorMessage);
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.statusIcon}>&gt;</Text>
        <Text style={styles.headerText}>DETOX.AI // STATUS: ONLINE</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <Text style={styles.title}>IDENTIFIQUE-SE</Text>
            <Text style={styles.subtitle}>VOLTE PARA A SUA ROTINA DE DOPAMINA BARATA.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-MAIL DO ALVO</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="ALVO@DOMINIO.COM"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                value={email}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CHAVE DE ACESSO</Text>
              <TextInput
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                style={styles.input}
                value={password}
                editable={!isSubmitting}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {authError ? <Text style={styles.error}>{authError}</Text> : null}

            <Pressable
              disabled={isSubmitting}
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleLogin}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.neonDark} />
              ) : (
                <Text style={styles.buttonText}>ACESSAR O VICIO</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setShowForgotPassword(!showForgotPassword)} style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>ESQUECEU SUA SENHA?</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              disabled={isSubmitting || !request}
              onPress={() => promptAsync()}
              style={[styles.googleButton, (isSubmitting || !request) && styles.buttonDisabled]}
            >
              <Feather name="mail" size={20} color={colors.text} />
              <Text style={styles.googleButtonText}>ENTRAR COM GOOGLE</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={() => router.push('/register')} disabled={isSubmitting}>
              <Text style={styles.createAccount}>CRIAR NOVA CONTA &gt;</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = {
  background: '#0d1110',
  line: '#2b302e',
  muted: '#8f9893',
  placeholder: '#3e4542',
  text: '#efffe9',
  neon: '#2cff12',
  neonDark: '#082d05',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  statusIcon: {
    width: 19,
    height: 19,
    borderWidth: 2,
    borderColor: colors.text,
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '900',
  },
  headerText: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 28,
  },
  form: {
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 12,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 36,
  },
  fieldGroup: {
    marginBottom: 33,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 2.6,
    marginBottom: 10,
  },
  input: {
    height: 34,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 1.2,
    padding: 0,
  },
  button: {
    height: 55,
    backgroundColor: colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
    shadowColor: colors.neon,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  buttonText: {
    color: colors.neonDark,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  googleButton: {
    height: 55,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neon,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -13,
    marginBottom: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: 26,
    marginBottom: 17,
  },
  forgotPasswordButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  createAccount: {
    color: colors.text,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
});
