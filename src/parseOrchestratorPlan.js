export function parseOrchestratorPlan(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('No plan returned by orchestrator');
  }

  const cleaned = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');

  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Orchestrator plan is not valid JSON');
  }

  return parsed;
}
