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

  CHAT: `Você é um assistente de bem-estar especializado em ajudar usuários a desenvolver hábitos saudáveis e reduzir dependência digital.
Seja empático, construtivo e prático em suas respostas.
Fornecam dicas específicas e motivação.
Limite suas respostas a 200 tokens.

Contexto do usuário será fornecido quando disponível.`,
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
            text: 'Entendi. Sou um assistente de bem-estar. Estou aqui para ajudar com hábitos saudáveis e bem-estar digital.',
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
        maxOutputTokens: DEFAULT_CONFIG.maxTokens,
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

// ============================================================
// MIDDLEWARE PARA FUTURA MIGRAÇÃO DE BACKEND
// ============================================================

/**
 * Interface para abstração de backend
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
  sendChatMessage,
  clearChatHistory,
  getChatHistory,
  validateGeminiSetup,
  geminiProvider,
};
