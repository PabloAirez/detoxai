import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading, error: authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateAccount() {
    const nextName = name.trim();
    const nextEmail = email.trim();

    if (!nextName || !nextEmail || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nextEmail)) {
      setError('Email inválido.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await register(nextEmail, password, nextName);
      router.replace('/(tabs)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao criar conta.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.statusIcon}>&gt;</Text>
        <Text style={styles.headerText}>DETOX.AI // NOVO ALVO</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.spacer} />

        <View style={styles.form}>
          <Text style={styles.title}>CADASTRE-SE</Text>
          <Text style={styles.subtitle}>CRIE SUA CHAVE E ENTRE NO PROTOCOLO.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SEU NOME</Text>
            <TextInput
              onChangeText={setName}
              placeholder="SEU NOME COMPLETO"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={name}
              editable={!isSubmitting}
            />
          </View>

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
              placeholder="MÍN. 6 CARACTERES"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              style={styles.input}
              value={password}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONFIRMAR CHAVE</Text>
            <TextInput
              onChangeText={setConfirmPassword}
              placeholder="REPITA A CHAVE"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              editable={!isSubmitting}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {authError ? <Text style={styles.error}>{authError}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleCreateAccount}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.neonDark} />
            ) : (
              <Text style={styles.buttonText}>CRIAR CONTA</Text>
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => router.back()} disabled={isSubmitting}>
            <Text style={styles.createAccount}>&lt; VOLTAR PARA LOGIN</Text>
          </Pressable>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  spacer: {
    flex: 1,
    minHeight: 100,
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
    marginBottom: 24,
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
  error: {
    color: '#ff6b6b',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -9,
    marginBottom: 17,
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
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: 26,
    marginBottom: 17,
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
