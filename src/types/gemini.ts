/**
 * Tipos para integração com Google Gemini
 */

export interface GeminiConfig {
  apiKey: string;
  maxTokens: number;
  timeout: number;
  model: string;
}

export interface DashboardFeedback {
  title: string;
  message: string;
  recommendation: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'low' | 'medium' | 'high';
}

export interface InsightData {
  category: string;
  insight: string;
  impact: string;
  actionableStep: string;
  importance: 'low' | 'medium' | 'high';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  tokens: number;
  processingTime: number;
}

export interface GeminiError {
  code: string;
  message: string;
  timestamp: number;
  details?: any;
}

export interface GeminiContextType {
  isLoading: boolean;
  error: GeminiError | null;
  
  // Dashboard
  generateDashboardFeedback: (userData: any) => Promise<DashboardFeedback>;
  
  // Insights
  generateInsights: (analysisData: any) => Promise<InsightData[]>;
  
  // Chat
  sendChatMessage: (message: string, context?: any) => Promise<ChatResponse>;
  clearChatHistory: () => void;
  getChatHistory: () => ChatMessage[];
}

export interface GenerateContentRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    maxOutputTokens: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  };
}

export interface GenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
