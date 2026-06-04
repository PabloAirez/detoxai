/**
 * Hook customizado para acessar Gemini
 * Fornece interface simples para usar IA em qualquer componente
 */

import { useContext } from 'react';
import { GeminiContext } from '../contexts/GeminiContext';

export function useGemini() {
  const context = useContext(GeminiContext);

  if (context === undefined) {
    throw new Error(
      'useGemini deve ser usado dentro de um GeminiProvider. ' +
      'Certifique-se que GeminiProvider envolve sua aplicação.'
    );
  }

  return context;
}

/**
 * Hook específico para dashboard feedback
 */
export function useDashboardFeedback() {
  const { generateDashboardFeedback, isLoading, error } = useGemini();

  return { generateDashboardFeedback, isLoading, error };
}

/**
 * Hook específico para insights
 */
export function useInsights() {
  const { generateInsights, isLoading, error } = useGemini();

  return { generateInsights, isLoading, error };
}

/**
 * Hook específico para chat
 */
export function useChat() {
  const { sendChatMessage, clearChatHistory, getChatHistory, isLoading, error } =
    useGemini();

  return {
    sendChatMessage,
    clearChatHistory,
    getChatHistory,
    isLoading,
    error,
  };
}
