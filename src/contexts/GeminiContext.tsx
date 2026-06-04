/**
 * Contexto global para Gemini
 * Fornece acesso centralizado aos serviços de IA
 */

import React, { createContext, useState, useCallback } from 'react';
import {
  generateDashboardFeedback,
  generateInsights,
  sendChatMessage,
  clearChatHistory,
  getChatHistory,
} from '../services/gemini';
import {
  GeminiContextType,
  GeminiError,
  DashboardFeedback,
  InsightData,
  ChatResponse,
} from '../types/gemini';

export const GeminiContext = createContext<GeminiContextType | undefined>(
  undefined
);

export function GeminiProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);

  // Dashboard Feedback
  const handleGenerateDashboardFeedback = useCallback(
    async (userData: any): Promise<DashboardFeedback> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await generateDashboardFeedback(userData);
        return result;
      } catch (err) {
        const geminiError = err as GeminiError;
        setError(geminiError);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Generate Insights
  const handleGenerateInsights = useCallback(
    async (analysisData: any): Promise<InsightData[]> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await generateInsights(analysisData);
        return result;
      } catch (err) {
        const geminiError = err as GeminiError;
        setError(geminiError);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Send Chat Message
  const handleSendChatMessage = useCallback(
    async (message: string, context?: any): Promise<ChatResponse> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await sendChatMessage(message, context);
        return result;
      } catch (err) {
        const geminiError = err as GeminiError;
        setError(geminiError);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const value: GeminiContextType = {
    isLoading,
    error,
    generateDashboardFeedback: handleGenerateDashboardFeedback,
    generateInsights: handleGenerateInsights,
    sendChatMessage: handleSendChatMessage,
    clearChatHistory,
    getChatHistory,
  };

  return (
    <GeminiContext.Provider value={value}>
      {children}
    </GeminiContext.Provider>
  );
}
