import { View, Text, TextInput, Button } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>IDENTIFIQUE-SE</Text>
      <Text>VOLTE PARA A SUA ROTINA DE DOPAMINA BARATA.</Text>
      <TextInput placeholder="Email" />
      <TextInput placeholder="Senha" secureTextEntry />
      <Button title="Acessar o vício" onPress={() => {}} />
      <Text>Criar nova conta</Text>

    </View>
  );
}