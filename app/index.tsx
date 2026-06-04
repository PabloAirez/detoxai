import { StatusBar } from 'expo-status-bar';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.statusIcon}>&gt;</Text>
        <Text style={styles.headerText}>DETOX.AI // STATUS: ONLINE</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.spacer} />

        <View style={styles.form}>
          <Text style={styles.title}>IDENTIFIQUE-SE</Text>
          <Text style={styles.subtitle}>VOLTE PARA A SUA ROTINA DE DOPAMINA BARATA.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-MAIL DO ALVO</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="ALVO@DOMINIO.COM"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CHAVE DE ACESSO</Text>
            <TextInput
              placeholder="********"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Pressable style={styles.button} onPress={() => {}}>
            <Text style={styles.buttonText}>ACESSAR O VICIO</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => {}}>
            <Text style={styles.createAccount}>CRIAR NOVA CONTA &gt;</Text>
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
    minHeight: 210,
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
