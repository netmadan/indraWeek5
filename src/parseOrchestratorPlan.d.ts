export function parseOrchestratorPlan(responseText: string): {
  analysis: string;
  agentOrder: string[];
  reasoning: Record<string, string>;
};
