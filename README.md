# DetoxAI 📱🤖

**DetoxAI** é um aplicativo de bem-estar digital e produtividade com uma proposta única: ele conta com um assistente virtual (o **DetoxBot**) extremamente rabugento, debochado, sarcástico e "anticoach". Em vez de te parabenizar com mensagens motivacionais vazias, o DetoxBot vai te ironizar e te fazer sentir culpado pelo tempo excessivo desperdiçado rolando feeds infinitos, com o objetivo final de convencer você a desligar o celular e focar no que realmente importa.

---

## 🛠️ Como Rodar o Aplicativo

Este é um projeto construído com **React Native**, **Expo (v54)**, e **TypeScript**.

### Pré-requisitos
* Node.js instalado (v18+ recomendado).
* Conta ou simulador configurado para desenvolvimento mobile:
  * **Android**: Android Studio com um emulador ou um aparelho real com depuração USB ativa.
  * **iOS** (apenas macOS): Xcode e simulador iOS.

### Passo a Passo de Inicialização

1. **Instalar Dependências**:
   No terminal, na raiz do projeto, instale as dependências executando:
   ```bash
   npm install
   ```

2. **Configurar as Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Abra o `.env` e preencha as credenciais necessárias, em especial as de Firebase e do Gemini:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
   ```

3. **Executar o App**:
   Para buildar e iniciar a aplicação no emulador ou dispositivo conectado:

   * **Android** (Recomendado para telemetria de aplicativos):
     ```bash
     npx expo run:android
     ```
   * **iOS**:
     ```bash
     npx expo run:ios
     ```
   * **Servidor Metro** (apenas para iniciar o bundler sem compilar novamente o código nativo):
     ```bash
     npx expo start
     ```

---

## 📊 Como funciona a Leitura de Tempo de Uso

A leitura de uso de aplicativos é realizada de forma nativa para garantir precisão e privacidade:

1. **Módulo Nativo Customizado (`detox-usage-stats`)**:
   Localizado sob a pasta [modules/detox-usage-stats](file:///d:/Pandry/Documents/detoxai/modules/detox-usage-stats), este módulo expõe a ponte nativa (`expo-modules-core`) para acessar APIs do sistema operacional.

2. **No Android**:
   * O aplicativo solicita ao usuário a permissão especial de **Acesso ao Uso** (`android.permission.PACKAGE_USAGE_STATS`).
   * Quando autorizada, a classe nativa utiliza o `UsageStatsManager` do Android para recuperar estatísticas precisas de tempo de tela de cada aplicativo instalado no período selecionado (do início do dia atual até o momento da consulta).
   * O tempo é convertido de milissegundos para minutos.

3. **No iOS**:
   * Devido às restrições de privacidade da Apple (sandbox estrito e falta de APIs públicas equivalentes), a leitura de tempo de uso por aplicativo instalado não é suportada por apps comuns na App Store. Nesses casos, o app detecta a indisponibilidade e cai em um estado simplificado de leitura.

4. **Normalização dos Dados**:
   O arquivo [src/services/usageStats.ts](file:///d:/Pandry/Documents/detoxai/src/services/usageStats.ts) é responsável por mapear os pacotes nativos para uma estrutura limpa e tipada de dados (`AppUsageStat[]`), ordenando do aplicativo mais utilizado para o menos utilizado.

---

## 🤖 Integração com o Google Gemini

A inteligência e personalidade ácida do DetoxBot vêm de sua integração direta com a API do **Google Gemini** através do pacote oficial `@google/generative-ai`.

A integração está centralizada no serviço [src/services/gemini.ts](file:///d:/Pandry/Documents/detoxai/src/services/gemini.ts):

### 1. Principais Funcionalidades de IA
* **Feedback da Dashboard (`generateDashboardFeedback`)**: Cria uma análise opinativa rápida em texto com base no aplicativo mais utilizado hoje, o tempo de tela total e a meta configurada, dando um veredito e uma ação prática para as próximas 2 horas.
* **Análise de Falhas e Logs da Vergonha (`generateFailureAnalysis`)**: Processa o tempo de uso diário, histórico semanal e a lista de aplicativos reais utilizados no dia para gerar um JSON estruturado com:
  - Um **Alerta Crítico** focado em hábitos noturnos prejudiciais.
  - Um indicador de **Dopamina** (ex: "Dopamina barata" com uma frase debochada).
  - Os **Logs de Vergonha** contendo mensagens personalizadas e sarcásticas para cada aplicativo aberto no dia.
* **Chat Interativo Anticoach (`sendChatMessage`)**: Permite ao usuário tentar justificar seu vício em tempo real. O assistente mantém um histórico das últimas 10 interações (5 mensagens do usuário e 5 da IA) e utiliza dados de telemetria de uso como contexto para responder de forma afiada e personalizada.

### 2. Tratamento e Robustez Offline
* **Fallback Local (`getOfflineFailureAnalysis`)**: Caso o usuário esteja offline, a API key não esteja configurada ou ocorra alguma falha na requisição ao Gemini, o serviço reage fornecendo uma análise estruturada baseada em algoritmos locais, gerando mensagens ácidas mockadas bem-humoradas e coerentes com o uso real de aplicativos.
* **Validação de Token e Erros**: Possui mecanismos internos que validam o setup inicial, tratam erros comuns da API do Gemini (limites de cota, timeout de 30s) e garantem que as respostas da IA sejam retornadas em sua totalidade (limite estendido para 1000 tokens no chat), impedindo cortes no meio de frases.
