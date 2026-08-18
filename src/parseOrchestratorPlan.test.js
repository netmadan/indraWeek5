import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrchestratorPlan } from './parseOrchestratorPlan.js';

test('parses fenced JSON from the model output', () => {
  const raw = `\n\`\`\`json
  {
    "analysis": "The user wants health guidance.",
    "agentOrder": ["Dentist", "Comedian"],
    "reasoning": {
      "Dentist": "Dental advice is most relevant.",
      "Comedian": "Humor can help keep the tone light."
    }
  }
\`\`\`\n`;

  assert.deepEqual(parseOrchestratorPlan(raw), {
    analysis: 'The user wants health guidance.',
    agentOrder: ['Dentist', 'Comedian'],
    reasoning: {
      Dentist: 'Dental advice is most relevant.',
      Comedian: 'Humor can help keep the tone light.',
    },
  });
});
