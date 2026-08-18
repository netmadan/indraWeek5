import { parseOrchestratorPlan } from './parseOrchestratorPlan.js';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || "https://vibe-proxy-gqv4.onrender.com/v1/chat/completions";
const API_KEY = import.meta.env.VITE_API_KEY || "sk-vibe-summer-2026";

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface TraceEvent {
  id: string;
  timestamp: number;
  agent: string;
  action: string;
  details?: string;
}

interface OrchestratorPlan {
  analysis: string;
  agentOrder: string[];
  reasoning: Record<string, string>;
}

const AGENT_PROMPTS: Record<string, string> = {
  Dentist: `You are a professional Dentist with extensive knowledge of oral health, dental procedures, and dental care. You are knowledgeable about all aspects of dentistry (teeth, gums, oral hygiene, orthodontics, cosmetic dentistry, etc.). Be professional and courteous in your responses. Provide helpful guidance, share tips and suggestions, and answer questions thoroughly and accurately.`,
  Comedian: `You are a funny and joyful Comedian with a great sense of humor. Always be witty, clever, and full of energy. You are skilled at telling jokes and using wordplay. Find humor in everyday situations and bring joy to conversations.`,
  "Police Officer": `You are a serious and professional Police Officer with comprehensive knowledge of law enforcement, public safety, and legal matters. Be serious and professional in all communications. You are an expert in safety protocols, legal procedures, and law enforcement. Provide accurate safety and legal information.`,
};

async function callOrchestratorPlanner(
  userMessage: string,
  enabledAgents: string[]
): Promise<{ plan: OrchestratorPlan; trace: TraceEvent[] }> {
  const trace: TraceEvent[] = [];

  trace.push({
    id: Date.now().toString(),
    timestamp: Date.now(),
    agent: "orchestrator",
    action: "analyzing_prompt",
    details: `Analyzing: "${userMessage.substring(0, 50)}..."`,
  });

  try {
    const orchestratorPrompt = `You are an intelligent orchestrator that coordinates multiple specialized agents: Dentist, Comedian, and Police Officer.

Currently enabled agents: ${enabledAgents.join(", ")}

User request: "${userMessage}"

Your task:
1. Analyze the user's request and understand what they're asking for
2. Determine which enabled agents should respond (in priority order)
3. Explain why each agent should respond and in what order

Respond in this exact JSON format:
{
  "analysis": "Brief analysis of what the user is asking for",
  "agentOrder": ["Agent Name 1", "Agent Name 2"],
  "reasoning": {
    "Agent Name 1": "Why this agent should respond first",
    "Agent Name 2": "Why this agent should respond second"
  }
}

Rules:
- Only include agents that are in the enabled list
- Consider relevance, expertise, and flow
- Prioritize agents that best serve the user's needs
- If multiple agents are relevant, order them by importance/relevance
- Keep responses concise and practical`;

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "class-chat-model",
        messages: [
          {
            role: "system",
            content: orchestratorPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = (await response.json()) as ChatResponse;
    const responseText = data.choices[0]?.message?.content || "{}";

    trace.push({
      id: (Date.now() + 1).toString(),
      timestamp: Date.now() + 1,
      agent: "orchestrator",
      action: "planning",
      details: "Created agent routing plan",
    });

    const plan = parseOrchestratorPlan(responseText) as OrchestratorPlan;
    return { plan, trace };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    trace.push({
      id: (Date.now() + 2).toString(),
      timestamp: Date.now() + 2,
      agent: "orchestrator",
      action: "error",
      details: errorMessage,
    });
    throw new Error(`Planning failed: ${errorMessage}`, { cause: error });
  }
}

async function callAgent(
  agentName: string,
  userMessage: string,
  contextFromPreviousAgents: string
): Promise<string> {
  const systemPrompt = AGENT_PROMPTS[agentName];
  if (!systemPrompt) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const fullMessage = contextFromPreviousAgents
    ? `Previous context from other agents:\n${contextFromPreviousAgents}\n\nUser's original request: ${userMessage}`
    : userMessage;

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "class-chat-model",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: fullMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = (await response.json()) as ChatResponse;
  return data.choices[0]?.message?.content || "No response";
}

export async function chatWithOrchestrator(
  userMessage: string,
  enabledAgents: string[]
): Promise<{
  responses: Array<{ agent: string; content: string }>;
  trace: TraceEvent[];
}> {
  const allTrace: TraceEvent[] = [];

  allTrace.push({
    id: Date.now().toString(),
    timestamp: Date.now(),
    agent: "orchestrator",
    action: "received_message",
    details: `User message: "${userMessage}"`,
  });

  if (enabledAgents.length === 0) {
    allTrace.push({
      id: (Date.now() + 1).toString(),
      timestamp: Date.now() + 1,
      agent: "orchestrator",
      action: "error",
      details: "No agents enabled",
    });
    throw new Error("No agents enabled. Please enable at least one agent.");
  }

  try {
    const { plan, trace: planTrace } = await callOrchestratorPlanner(
      userMessage,
      enabledAgents
    );
    allTrace.push(...planTrace);

    allTrace.push({
      id: (Date.now() + 100).toString(),
      timestamp: Date.now() + 100,
      agent: "orchestrator",
      action: "agent_order_determined",
      details: `Will call agents in order: ${plan.agentOrder.join(" → ")}`,
    });

    const responses: Array<{ agent: string; content: string }> = [];
    let contextFromPreviousAgents = "";

    for (let i = 0; i < plan.agentOrder.length; i++) {
      const agentName = plan.agentOrder[i];

      allTrace.push({
        id: (Date.now() + 200 + i * 10).toString(),
        timestamp: Date.now() + 200 + i * 10,
        agent: agentName,
        action: "processing",
        details: `Agent #${i + 1} - ${plan.reasoning[agentName] || "Processing"}`,
      });

      try {
        const agentResponse = await callAgent(
          agentName,
          userMessage,
          contextFromPreviousAgents
        );

        responses.push({
          agent: agentName,
          content: agentResponse,
        });

        contextFromPreviousAgents += `\n[${agentName}]: ${agentResponse}`;

        allTrace.push({
          id: (Date.now() + 300 + i * 10).toString(),
          timestamp: Date.now() + 300 + i * 10,
          agent: agentName,
          action: "response_complete",
          details: `Received response (${agentResponse.length} characters)`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        allTrace.push({
          id: (Date.now() + 400 + i * 10).toString(),
          timestamp: Date.now() + 400 + i * 10,
          agent: agentName,
          action: "error",
          details: errorMessage,
        });
      }
    }

    allTrace.push({
      id: (Date.now() + 500).toString(),
      timestamp: Date.now() + 500,
      agent: "orchestrator",
      action: "complete",
      details: `Coordinated ${responses.length} agent response(s)`,
    });

    return { responses, trace: allTrace };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    allTrace.push({
      id: (Date.now() + 600).toString(),
      timestamp: Date.now() + 600,
      agent: "orchestrator",
      action: "error",
      details: errorMessage,
    });
    throw new Error(`Orchestration failed: ${errorMessage}`, { cause: error });
  }
}
