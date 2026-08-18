import { useState } from 'react';
import { chatWithOrchestrator } from './api';
import './App.css';

interface Agent {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

interface TraceEvent {
  id: string;
  timestamp: number;
  agent: string;
  action: string;
  details?: string;
}

interface Message {
  role: string;
  content: string;
  agent?: string;
  timestamp?: number;
}

function App() {
  const [agents, setAgents] = useState<Agent[]>([
    { id: 'dentist', name: 'Dentist', color: '#ADD8E6', enabled: true },
    { id: 'comedian', name: 'Comedian', color: '#FFFF00', enabled: true },
    { id: 'police-officer', name: 'Police Officer', color: '#00008B', enabled: true },
  ]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentSequence, setAgentSequence] = useState<string[]>([]);

  const toggleAgent = (agentId: string) => {
    setAgents(agents.map(agent =>
      agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent
    ));
  };

  const getAgentColor = (agentName: string) => {
    const agent = agents.find(a => a.name === agentName);
    return agent?.color || '#667eea';
  };

  const getAgentEmoji = (agentName: string) => {
    if (agentName === 'Dentist') return '🦷';
    if (agentName === 'Comedian') return '🎭';
    if (agentName === 'Police Officer') return '👮';
    return '🤖';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue;
    setInputValue('');
    setMessages([...messages, { role: 'user', content: userMessage, timestamp: Date.now() }]);
    setLoading(true);
    setAgentSequence([]);

    try {
      const enabledAgentNames = agents.filter(a => a.enabled).map(a => a.name);
      const { responses, trace: newTrace } = await chatWithOrchestrator(
        userMessage,
        enabledAgentNames
      );

      // Extract agent sequence from trace
      const sequence = responses.map(r => r.agent);
      setAgentSequence(sequence);

      // Add orchestrator coordination message
      setMessages(prev => [
        ...prev,
        {
          role: 'orchestrator',
          content: `Coordinating responses from: ${sequence.join(' → ')}`,
          timestamp: Date.now(),
        },
      ]);

      // Add each agent's response
      responses.forEach((response, idx) => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: response.content,
            agent: response.agent,
            timestamp: Date.now() + idx,
          },
        ]);
      });

      setTrace(newTrace);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setMessages(prev => [...prev, { role: 'error', content: errorMessage, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Left Panel - Agents */}
      <div className="panel left-panel">
        <div className="panel-header">
          <h2>🤖 Agents</h2>
        </div>
        <div className="agents-list">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`agent-item ${agentSequence.includes(agent.name) ? 'active' : ''}`}
            >
              <div
                className="agent-indicator"
                style={{
                  backgroundColor: agent.color,
                  opacity: agent.enabled ? 1 : 0.3,
                }}
              />
              <span className="agent-name">{agent.name}</span>
              <button
                className={`toggle-btn ${agent.enabled ? 'active' : 'inactive'}`}
                onClick={() => toggleAgent(agent.id)}
                style={{
                  borderColor: agent.color,
                  backgroundColor: agent.enabled ? agent.color : 'transparent',
                  color: agent.enabled ? (agent.id === 'comedian' ? '#000' : '#fff') : agent.color,
                }}
              >
                {agent.enabled ? '✓' : '○'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Panel - Chat Orchestrator */}
      <div className="panel center-panel">
        <div className="panel-header">
          <h2>💬 Orchestrator Chat</h2>
          {agentSequence.length > 0 && (
            <div className="active-agent-indicator">
              <span className="agent-sequence">
                {agentSequence.map((agent, idx) => (
                  <span key={idx} className="sequence-badge" style={{ backgroundColor: getAgentColor(agent) }}>
                    {idx + 1}. {agent.split(' ')[0]}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="emoji-bounce">🎭</div>
              <p>Start a conversation with the orchestrator!</p>
              <p className="subtitle">Enable agents and ask anything. The orchestrator will decide the best order.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role}`}
              style={{
                animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                ...(msg.role === 'assistant' && msg.agent && {
                  borderLeftColor: getAgentColor(msg.agent),
                }),
              }}
            >
              <div
                className="message-avatar"
                style={msg.role === 'assistant' && msg.agent ? {
                  backgroundColor: getAgentColor(msg.agent),
                } : msg.role === 'orchestrator' ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                } : {}}
              >
                {msg.role === 'user'
                  ? '👤'
                  : msg.role === 'error'
                    ? '❌'
                    : msg.role === 'orchestrator'
                      ? '🎯'
                      : getAgentEmoji(msg.agent || '')}
              </div>
              <div className="message-content">
                {msg.role === 'assistant' && msg.agent && (
                  <div className="message-agent-label">{msg.agent}</div>
                )}
                {msg.role === 'orchestrator' && (
                  <div className="message-orchestrator-label">🤖 Orchestrator</div>
                )}
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                🎯
              </div>
              <div className="message-content">
                <div className="typing-animation">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={loading}
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim() || agents.filter(a => a.enabled).length === 0}
            className="send-btn"
          >
            {loading ? '📤 Sending...' : '✈️ Send'}
          </button>
        </div>
      </div>

      {/* Right Panel - Trace */}
      <div className="panel right-panel">
        <div className="panel-header">
          <h2>🔍 Trace</h2>
        </div>
        <div className="trace-container">
          {trace.length === 0 ? (
            <div className="empty-trace">
              <p>Trace events will appear here</p>
            </div>
          ) : (
            <div className="trace-timeline">
              {trace.map((event, idx) => (
                <div
                  key={event.id}
                  className="trace-event"
                  style={{
                    animation: `slideInRight 0.3s ease-out ${idx * 0.1}s both`,
                    borderLeftColor:
                      event.agent === 'Dentist'
                        ? '#ADD8E6'
                        : event.agent === 'Comedian'
                          ? '#FFFF00'
                          : event.agent === 'Police Officer'
                            ? '#00008B'
                            : '#667eea',
                  }}
                >
                  <div
                    className="trace-dot"
                    style={{
                      backgroundColor:
                        event.agent === 'Dentist'
                          ? '#ADD8E6'
                          : event.agent === 'Comedian'
                            ? '#FFFF00'
                            : event.agent === 'Police Officer'
                              ? '#00008B'
                              : '#667eea',
                    }}
                  ></div>
                  <div className="trace-content">
                    <div className="trace-agent">{event.agent}</div>
                    <div className="trace-action">{event.action}</div>
                    {event.details && <div className="trace-details">{event.details}</div>}
                    <div className="trace-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
