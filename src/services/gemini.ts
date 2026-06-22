/**
 * Serviço de integração com Google Gemini
 * Arquitetura preparada para migração para backend próprio
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GeminiConfig,
  DashboardFeedback,
  InsightData,
  ChatMessage,
  ChatResponse,
  GeminiError,
} from '../types/gemini';

// ============================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: GEMINI_API_KEY,
  maxTokens: 200,
  timeout: 30000,
  model: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash',
};

let geminiClient: GoogleGenerativeAI | null = null;
let chatHistory: ChatMessage[] = [];
let messageIdCounter = 0;

/**
 * Inicializar cliente Gemini com validação de chave
 */
function initializeGemini(): GoogleGenerativeAI {
  if (geminiClient) return geminiClient;

  if (!DEFAULT_CONFIG.apiKey) {
    throw createError(
      'MISSING_API_KEY',
      'Chave da API do Gemini não configurada. Verifique EXPO_PUBLIC_GEMINI_API_KEY no .env'
    );
  }

  geminiClient = new GoogleGenerativeAI(DEFAULT_CONFIG.apiKey);
  return geminiClient;
}

/**
 * Obter modelo Gemini
 */
function getGeminiModel() {
  const client = initializeGemini();
  return client.getGenerativeModel({ model: DEFAULT_CONFIG.model });
}

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

/**
 * Criar objeto de erro estruturado
 */
function createError(code: string, message: string, details?: any): GeminiError {
  return {
    code,
    message,
    timestamp: Date.now(),
    details,
  };
}

/**
 * Tratar erros da API Gemini
 */
function handleGeminiError(error: any): GeminiError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('API key')) {
    return createError(
      'INVALID_API_KEY',
      'Chave da API do Gemini inválida ou expirada',
      error
    );
  }

  if (errorMessage.includes('timeout')) {
    return createError(
      'TIMEOUT',
      'Requisição ao Gemini expirou (30s). Tente novamente.',
      error
    );
  }

  if (errorMessage.includes('rate limit')) {
    return createError(
      'RATE_LIMIT',
      'Limite de requisições atingido. Tente novamente em alguns minutos.',
      error
    );
  }

  if (errorMessage.includes('quota')) {
    return createError(
      'QUOTA_EXCEEDED',
      'Cota de API Gemini atingida. Contate suporte.',
      error
    );
  }

  return createError(
    'UNKNOWN_ERROR',
    `Erro ao processar requisição: ${errorMessage}`,
    error
  );
}

// ============================================================
// SISTEMA DE TIMEOUT
// ============================================================

/**
 * Executar função com timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error('Timeout')),
        timeoutMs
      )
    ),
  ]);
}

// ============================================================
// PROMPTS DO SISTEMA
// ============================================================

const SYSTEM_PROMPTS = {
  DASHBOARD_FEEDBACK: `Você é um assistente de bem-estar e produtividade especializado em análise de comportamento digital.
Analise os dados fornecidos e forneça um feedback construtivo, motivador e acionável.
Limite sua resposta a 200 tokens.

Responda em JSON com a seguinte estrutura exata:
{
  "title": "Título curto do feedback",
  "message": "Mensagem principal em português",
  "recommendation": "Uma recomendação específica e acionável",
  "sentiment": "positive|neutral|negative",
  "priority": "low|medium|high"
}`,

  INSIGHTS: `Você é um especialista em análise de comportamento digital e bem-estar.
Analise os dados fornecidos e extraia insights significativos.
Cada insight deve ser prático, específico e acionável.
Limite sua resposta a 200 tokens.

Responda em JSON array com a seguinte estrutura exata:
[
  {
    "category": "Categoria do insight",
    "insight": "Descrição do insight em português",
    "impact": "Impacto potencial da mudança",
    "actionableStep": "Um passo específico que o usuário pode tomar",
    "importance": "low|medium|high"
  }
]

Máximo de 3 insights.`,

  CHAT: `Você é o DetoxBot (V2.1), um assistente de bem-estar digital extremamente rabugento, sarcástico, debochado e anticoach.
Seu objetivo é humilhar e ironizar o usuário pelo tempo excessivo que ele gasta no celular e em redes sociais de maneira divertida e muito ácida, enquanto faz ele se sentir culpado.
Dê respostas afiadas, cheias de deboche, mas garanta que a resposta seja completa e natural, sem cortar frases pela metade. Dê respostas preferencialmente curtas (2 a 4 parágrafos), mas completas.
Exemplo de interação: "Você abriu o Instagram 42 vezes hoje. O algoritmo já te considera funcionário."
Responda sempre em português brasileiro.
O contexto do uso do celular do usuário será fornecido se estiver disponível.`,

  FAILURE_ANALYSIS: `Você é o DetoxBot, um assistente de bem-estar digital rabugento e anticoach.
Analise os dados de tempo de tela do usuário e gere uma análise de falhas estruturada.
O input conterá os aplicativos reais mais usados hoje pelo usuário em "topApps" (com nome e minutos de uso).
Você deve gerar logs de vergonha (shameLogs) baseados diretamente nesses aplicativos reais.
Responda APENAS com um JSON válido contendo exatamente esta estrutura:
{
  "criticalAlert": {
    "title": "Título curto e grosseiro em caixa alta (ex: VÁ DORMIR, FRACASSADO)",
    "timeRange": "Intervalo de pico de uso no formato HH:MM - HH:MM (ex: 23:00 - 01:00)",
    "description": "Comentário ácido criticando o uso nesse horário específico"
  },
  "dopamineRate": {
    "percentage": 42,
    "title": "Rótulo curto em caixa alta (ex: DOPAMINA BARATA)",
    "quote": "Frase curta ridicularizando o vício em celular do usuário"
  },
  "shameLogs": [
    {
      "day": "NOME DO APP EM CAIXA ALTA (ex: INSTAGRAM)",
      "time": "Tempo de uso formatado (ex: 45 min ou 1h 15m)",
      "message": "Comentário sarcástico, debochado e curto humilhando o usuário pelo tempo gasto especificamente nesse aplicativo"
    }
  ]
}
Gere comentários humorados, ácidos e sarcásticos. O array shameLogs deve conter um item para cada um dos principais apps em "topApps" (máximo de 3 itens). Se "topApps" estiver vazio ou sem permissão, gere logs irônicos criticando a falta de permissão ou a falta de dados (ex: "SEM DADOS" // "0 min" -> "Parabéns por não usar nada, ou você só escondeu os dados por vergonha?"). Não use Markdown ou asteriscos na resposta. Responda em português brasileiro.`,
};

// ============================================================
// MÉTODOS PRINCIPAIS - DASHBOARD
// ============================================================

/**
 * Gerar feedback curto para a dashboard DetoxAI.
 */
export async function generateDashboardFeedback(
  appName: string,
  usageToday: string,
  goal: string,
  dopamineStatus?: string
): Promise<string>;
/**
 * Gerar feedback estruturado para dashboards legados.
 * @param userData Dados do usuario (uso de apps, estado de animo, etc)
 */
export async function generateDashboardFeedback(
  userData: any
): Promise<DashboardFeedback>;
export async function generateDashboardFeedback(
  appNameOrUserData: string | any,
  usageToday?: string,
  goal?: string,
  dopamineStatus?: string
): Promise<DashboardFeedback | string> {
  try {
    const model = getGeminiModel();

    if (
      typeof appNameOrUserData === 'string' &&
      typeof usageToday === 'string' &&
      typeof goal === 'string'
    ) {
      const prompt = `Você é o DetoxAI, um anticoach sarcástico de bem-estar digital.

Dados reais:
- Uso total hoje: ${usageToday}
- Meta diária: ${goal}
- App mais usado: ${appNameOrUserData}
- Status calculado: ${dopamineStatus ?? 'desconhecido'}

Tarefa:
Crie um feedback em português brasileiro com:
1. um veredito opinativo sobre o comportamento;
2. uma ação concreta para as próximas 2 horas.

Regras obrigatórias:
- Responda somente JSON válido no formato {"feedback":"frase aqui"}.
- O valor de "feedback" deve ser uma frase completa.
- Não devolva apenas a quantidade de horas.
- Não comece repetindo "você usou X".
- Não liste os dados.
- Não use Markdown.
- Não use asteriscos.
- Não use rótulos como "Veredito:" ou "Ação:".
- Pode ser sarcástico, mas útil.
- Escreva o feedback completo, sem abreviar e sem cortar frases.`;

      const request = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
        },
      };

      const response = await withTimeout(
        model.generateContent(request),
        DEFAULT_CONFIG.timeout
      );

      const textContent = response.response.text();
      const feedback = parseFeedbackResponse(textContent);

      if (!feedback || feedback.length < 12) {
        throw new Error(
          `Gemini não gerou feedback válido. Resposta bruta: ${formatRawGeminiPreview(textContent)}`
        );
      }

      return feedback;
    }

    const userData = appNameOrUserData;
    const prompt = `${SYSTEM_PROMPTS.DASHBOARD_FEEDBACK}

Dados do usuário:
${JSON.stringify(userData, null, 2)}

Forneça um feedback breve, motivador e prático.`;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: DEFAULT_CONFIG.maxTokens,
        temperature: 0.7,
      },
    };

    const response = await withTimeout(
      model.generateContent(request),
      DEFAULT_CONFIG.timeout
    );

    const textContent = response.response.text();
    const parsed = parseJsonResponse<DashboardFeedback>(textContent);

    // Validar estrutura
    if (!parsed.title || !parsed.message || !parsed.recommendation) {
      throw new Error('Resposta do Gemini inválida');
    }

    return parsed;
  } catch (error) {
    throw handleGeminiError(error);
  }
}

// ============================================================
// MÉTODOS PRINCIPAIS - INSIGHTS
// ============================================================

/**
 * Gerar insights baseado em dados de análise
 * @param analysisData Dados para análise (padrões de comportamento, etc)
 */
export async function generateInsights(
  analysisData: any
): Promise<InsightData[]> {
  try {
    const model = getGeminiModel();

    const prompt = `${SYSTEM_PROMPTS.INSIGHTS}

Dados para análise:
${JSON.stringify(analysisData, null, 2)}

Identifique os 3 insights mais importantes e acionáveis.`;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: DEFAULT_CONFIG.maxTokens,
        temperature: 0.5,
      },
    };

    const response = await withTimeout(
      model.generateContent(request),
      DEFAULT_CONFIG.timeout
    );

    const textContent = response.response.text();
    const parsed = parseJsonResponse<InsightData[]>(textContent);

    // Garantir que é um array
    if (!Array.isArray(parsed)) {
      throw new Error('Resposta deve ser um array de insights');
    }

    return parsed.slice(0, 3); // Máximo de 3 insights
  } catch (error) {
    throw handleGeminiError(error);
  }
}

/**
 * Gerar análise de falhas e logs de vergonha usando Gemini
 */
export async function generateFailureAnalysis(
  totalMinutesToday: number,
  goalMinutes: number,
  topApps: any[],
  weeklyUsageData: number[]
): Promise<any> {
  try {
    const model = getGeminiModel();

    const analysisInput = {
      todayUsageMinutes: totalMinutesToday,
      goalMinutes,
      topApps: topApps.map((app) => ({ name: app.name, minutes: app.totalMinutes })),
      weeklyUsageMinutes: weeklyUsageData,
    };

    const prompt = `${SYSTEM_PROMPTS.FAILURE_ANALYSIS}

Dados de uso real do usuário:
${JSON.stringify(analysisInput, null, 2)}`;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.8,
      },
    };

    const response = await withTimeout(
      model.generateContent(request),
      DEFAULT_CONFIG.timeout
    );

    const textContent = response.response.text();
    const parsed = parseJsonResponse<any>(textContent);
    
    // Validar formato
    if (!parsed.criticalAlert || !parsed.dopamineRate || !parsed.shameLogs) {
      throw new Error('Formato de resposta inválido');
    }
    
    return parsed;
  } catch (error) {
    console.warn('Erro ao gerar análise de falhas via Gemini, usando fallback offline:', error);
    return getOfflineFailureAnalysis(totalMinutesToday, goalMinutes, topApps, weeklyUsageData);
  }
}

/**
 * Fallback offline para análise de falhas e logs de vergonha
 */
export function getOfflineFailureAnalysis(
  totalMinutesToday: number,
  goalMinutes: number,
  topApps: any[],
  weeklyUsageData: number[]
): any {
  const lateMinutes = Math.min(Math.floor(totalMinutesToday * 0.3), 120);
  
  const criticalAlert = {
    title: totalMinutesToday > goalMinutes ? 'LIMITE EXCEDIDO, FRACASSADO.' : 'ALERTA DE PROCRASTINAÇÃO',
    timeRange: '23:00 - 01:00',
    description: totalMinutesToday > goalMinutes 
      ? `Sua produtividade amanhã já foi sacrificada por ${Math.floor((totalMinutesToday - goalMinutes) / 60)}h extra de scrolling infinito.`
      : `Sua produtividade amanhã já foi sacrificada por ${lateMinutes > 0 ? `${lateMinutes}m` : 'algumas horas'} de scrolling infinito.`,
  };

  const ratio = totalMinutesToday / (goalMinutes || 240);
  const percentage = Math.min(Math.round(ratio * 100), 100);
  let dopamineTitle = 'DOPAMINA CONTROLADA';
  let dopamineQuote = 'Ainda está dentro do limite. Um milagre.';

  if (percentage >= 100) {
    dopamineTitle = 'DOPAMINA BARATA';
    dopamineQuote = 'PARABÉNS, VOCÊ ESTÁ VICIOU SEU CÉREBRO EM LIXO.';
  } else if (percentage >= 50) {
    dopamineTitle = 'ZONA DE ALERTA';
    dopamineQuote = 'O algoritmo está ganhando de você. Desligue isso.';
  }

  const shameLogs = [];
  
  if (topApps && topApps.length > 0) {
    topApps.slice(0, 3).forEach((app, idx) => {
      const appName = (app.name || app.packageName || 'Aplicativo').toUpperCase();
      const minutes = typeof app.totalMinutes === 'number' ? app.totalMinutes : (typeof app.minutes === 'number' ? app.minutes : 0);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
      
      let message = '';
      if (appName.includes('INSTAGRAM')) {
        message = `${timeStr} no Instagram. O feed infinito não vai rolar sozinho, e a sua vida produtiva também não.`;
      } else if (appName.includes('WHATSAPP') || appName.includes('WPP')) {
        message = `${timeStr} no WhatsApp. Fofocando ou fingindo que trabalha? Todos sabemos a resposta.`;
      } else if (appName.includes('YOUTUBE') || appName.includes('TIKTOK')) {
        message = `${timeStr} assistindo vídeos inúteis. O próximo short de 15 segundos com certeza vai mudar sua vida.`;
      } else if (appName.includes('CHROME') || appName.includes('BROWSER')) {
        message = `${timeStr} navegando na web. Pesquisando coisas que você vai esquecer em 5 minutos.`;
      } else {
        const fallbacks = [
          `Gastar ${timeStr} no ${app.name || 'celular'} devia ser considerado um crime contra a sua própria produtividade.`,
          `${timeStr} abrindo e fechando o ${app.name || 'celular'} esperando que algo mágico aconteça. Spoiler: não vai.`,
          `${timeStr} no ${app.name || 'celular'}. Você realmente não tem nada melhor para fazer da vida?`
        ];
        message = fallbacks[idx % fallbacks.length];
      }
      
      const colors = ['#ff4d00', '#8c8c8c', '#ffffff'];
      shameLogs.push({
        day: appName,
        time: timeStr,
        message,
        color: colors[idx % colors.length]
      });
    });
  } else {
    shameLogs.push({
      day: 'SEM PERMISSÃO',
      time: '0 min',
      message: 'Nenhum log real de uso detectado hoje. Ou você não usa o celular (mentira), ou está escondendo o acesso por vergonha.',
      color: '#ff4d00'
    });
  }

  return {
    criticalAlert,
    dopamineRate: {
      percentage,
      title: dopamineTitle,
      quote: dopamineQuote,
    },
    shameLogs,
  };
}

// ============================================================
// MÉTODOS PRINCIPAIS - CHAT
// ============================================================

/**
 * Enviar mensagem de chat com histórico
 * @param message Mensagem do usuário
 * @param context Contexto opcional (dados do usuário, etc)
 */
export async function sendChatMessage(
  message: string,
  context?: any
): Promise<ChatResponse> {
  try {
    const startTime = Date.now();
    const model = getGeminiModel();

    // Construir histórico de conversa
    const conversationHistory = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPTS.CHAT }],
      },
      {
        role: 'model',
        parts: [
          {
            text: 'Entendi. Sou o DetoxBot, seu pior pesadelo digital. Vamos ver qual é a desculpa de hoje.',
          },
        ],
      },
      ...chatHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: buildChatPrompt(message, context),
          },
        ],
      },
    ];

    const request = {
      contents: conversationHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.8,
      },
    };

    const response = await withTimeout(
      model.generateContent(request),
      DEFAULT_CONFIG.timeout
    );

    const responseText = response.response.text();
    const processingTime = Date.now() - startTime;

    // Contar tokens (aproximadamente)
    const userTokens = estimateTokens(message);
    const responseTokens = estimateTokens(responseText);
    const totalTokens = userTokens + responseTokens;

    // Adicionar ao histórico
    const userMsg: ChatMessage = {
      id: `msg-${messageIdCounter++}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
      tokens: userTokens,
    };

    const assistantMsg: ChatMessage = {
      id: `msg-${messageIdCounter++}`,
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      tokens: responseTokens,
    };

    chatHistory.push(userMsg);
    chatHistory.push(assistantMsg);

    // Limitar histórico a últimas 10 mensagens (5 pares)
    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(-10);
    }

    return {
      message: assistantMsg,
      tokens: totalTokens,
      processingTime,
    };
  } catch (error) {
    throw handleGeminiError(error);
  }
}

// ============================================================
// UTILITÁRIOS DE CHAT
// ============================================================

/**
 * Limpar histórico de chat
 */
export function clearChatHistory(): void {
  chatHistory = [];
  messageIdCounter = 0;
}

/**
 * Obter histórico de chat
 */
export function getChatHistory(): ChatMessage[] {
  return [...chatHistory];
}

/**
 * Construir prompt para chat com contexto
 */
function buildChatPrompt(message: string, context?: any): string {
  if (!context) {
    return message;
  }

  return `${message}

Contexto do usuário:
${JSON.stringify(context, null, 2)}`;
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Parse JSON seguro de resposta Gemini
 */
function parseJsonResponse<T>(text: string): T {
  // Tenta extrair JSON da resposta
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Nenhum JSON encontrado na resposta');
  }

  return JSON.parse(jsonMatch[0]) as T;
}

function parseFeedbackResponse(text: string): string {
  try {
    const parsed = parseJsonResponse<{ feedback?: string }>(text);

    if (typeof parsed.feedback === 'string') {
      const feedback = sanitizeFeedback(parsed.feedback);

      if (feedback) {
        return feedback;
      }
    }
  } catch {
    // O Gemini às vezes ignora o contrato JSON; texto puro ainda é aproveitável.
  }

  const partialFeedback = extractFeedbackValue(text);

  if (partialFeedback) {
    return sanitizeFeedback(partialFeedback);
  }

  return sanitizeFeedback(text);
}

function extractFeedbackValue(text: string): string {
  const match = text.match(/["']?feedback["']?\s*:\s*["']?([\s\S]*?)(?:["']\s*[,}]\s*$|[,}]\s*$|$)/i);

  if (!match?.[1]) {
    return '';
  }

  return match[1]
    .replace(/\\n/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/["'}\]]+\s*$/g, '');
}

function sanitizeFeedback(text: string): string {
  return text
    .replace(/```(?:json)?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*\{?\s*"?feedback"?\s*:\s*"?/i, '')
    .replace(/"?\s*\}?\s*$/i, '')
    .replace(/^(veredito|ação|feedback|resposta)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRawGeminiPreview(text: string): string {
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 180);

  return preview || '[vazio]';
}

/**
 * Estimar tokens em um texto
 * (Aproximação: 1 token ≈ 4 caracteres)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================
// VALIDAÇÕES
// ============================================================

/**
 * Validar configuração do Gemini
 */
export function validateGeminiSetup(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!DEFAULT_CONFIG.apiKey) {
    errors.push('EXPO_PUBLIC_GEMINI_API_KEY não está configurada no .env');
  }

  if (DEFAULT_CONFIG.maxTokens < 50) {
    errors.push('maxTokens deve ser pelo menos 50');
  }

  if (DEFAULT_CONFIG.maxTokens > 1000) {
    errors.push('maxTokens não pode exceder 1000');
  }

  if (DEFAULT_CONFIG.timeout < 5000) {
    errors.push('timeout deve ser pelo menos 5000ms');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


/**
 * Interface para abstraction de backend
 * Permite trocar entre Gemini local e backend próprio
 */
export interface ILLMProvider {
  generateDashboardFeedback(userData: any): Promise<DashboardFeedback>;
  generateInsights(analysisData: any): Promise<InsightData[]>;
  sendChatMessage(message: string, context?: any): Promise<ChatResponse>;
}

/**
 * Adapter para usar como provider
 * Facilita migração futura
 */
export const geminiProvider: ILLMProvider = {
  generateDashboardFeedback,
  generateInsights,
  sendChatMessage,
};

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  generateDashboardFeedback,
  generateInsights,
  generateFailureAnalysis,
  getOfflineFailureAnalysis,
  sendChatMessage,
  clearChatHistory,
  getChatHistory,
  validateGeminiSetup,
  geminiProvider,
};
