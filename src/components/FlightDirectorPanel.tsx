import React, { useState, useRef, useEffect } from 'react';
import { MissionTelemetryState, AdvisorMessage, SessionMissionLogEntry } from '../types';
import { DEFAULT_MISSION_LOGS } from '../services/mockBackend';
import { requestFlightDirectorBriefing } from '../services/flightDirectorService';
import {
  Bot,
  Send,
  Sparkles,
  Radio,
  RefreshCw,
  Mic,
  MicOff,
  BookOpen,
  Copy,
  Check,
  Trash2,
  Download,
  Search,
  ArrowRight,
  Layers,
  Gauge,
} from 'lucide-react';

interface FlightDirectorPanelProps {
  missionState: MissionTelemetryState;
  persistedMessages?: AdvisorMessage[];
  onChangeMessages?: (msgs: AdvisorMessage[]) => void;
  persistedLogs?: SessionMissionLogEntry[];
  onChangeLogs?: (logs: SessionMissionLogEntry[]) => void;
}

function buildGreetingMessage(missionState: MissionTelemetryState): AdvisorMessage {
  return {
    id: 'init-1',
    sender: 'commander-x',
    content: `[COMMANDER X // NASA FLIGHT DIRECTOR ONLINE]
Telemetry locked on ${missionState.planet.toUpperCase()} (${missionState.era}) | Mission Viability: ${missionState.missionViabilityScore}/100.
Monitoring ${missionState.activeFeatureLayers.length} active 3D feature layers (${missionState.activeFeatureLayers.slice(0, 3).join(', ')}${missionState.activeFeatureLayers.length > 3 ? '...' : ''}).

Ask me anything about landing safety, radiation hazards, gravity kinematics, or how to improve your mission viability score.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export const FlightDirectorPanel: React.FC<FlightDirectorPanelProps> = ({
  missionState,
  persistedMessages,
  onChangeMessages,
  persistedLogs,
  onChangeLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'comms' | 'log'>('comms');
  const [messages, setMessages] = useState<AdvisorMessage[]>(() =>
    persistedMessages && persistedMessages.length > 0
      ? persistedMessages
      : [buildGreetingMessage(missionState)]
  );

  const [sessionLogs, setSessionLogs] = useState<SessionMissionLogEntry[]>(() =>
    persistedLogs && persistedLogs.length > 0 ? persistedLogs : DEFAULT_MISSION_LOGS
  );

  // Sync outward & recover if persisted state was externally reset
  useEffect(() => {
    if (persistedMessages && persistedMessages.length === 0 && messages.some((m) => m.id !== 'init-1')) {
      setMessages([buildGreetingMessage(missionState)]);
    } else if (
      persistedMessages &&
      persistedMessages.length > 0 &&
      persistedMessages.length !== messages.length
    ) {
      setMessages(persistedMessages);
    }
  }, [persistedMessages]);

  useEffect(() => {
    if (persistedLogs && persistedLogs.length !== sessionLogs.length) {
      setSessionLogs(persistedLogs);
    }
  }, [persistedLogs]);

  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logPlanetFilter, setLogPlanetFilter] = useState<string>('all');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const viabilityScore = missionState.missionViabilityScore;
  const threatLevel: 'NOMINAL' | 'MODERATE' | 'CRITICAL' =
    viabilityScore >= 80 ? 'NOMINAL' : viabilityScore >= 60 ? 'MODERATE' : 'CRITICAL';

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice input is not supported in this browser. Please type your query.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening to flight engineer directive...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputQuery(transcript);
        setVoiceNotice(`Transcribed: "${transcript}"`);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceNotice(`Voice capture notice: ${event.error}`);
        setTimeout(() => setVoiceNotice(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setVoiceNotice(null), 3000);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Could not start microphone listener.');
      setTimeout(() => setVoiceNotice(null), 3000);
    }
  };

  const handleSendCommand = async (customQuery?: string) => {
    const queryToSend = customQuery || inputQuery.trim();
    if (!queryToSend || isStreaming) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `cmdx-${Date.now()}`;

    const userMsg: AdvisorMessage = {
      id: userMessageId,
      sender: 'user',
      content: queryToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const botPlaceholder: AdvisorMessage = {
      id: botMessageId,
      sender: 'commander-x',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    const nextWithPlaceholder = [...messages, userMsg, botPlaceholder];
    setMessages(nextWithPlaceholder);

    if (!customQuery) setInputQuery('');
    setIsStreaming(true);

    const finalizeConversation = (finalText: string, offlineMode: boolean) => {
      const finalized = nextWithPlaceholder.map((msg) =>
        msg.id === botMessageId
          ? { ...msg, content: finalText, isStreaming: false, offlineMode }
          : msg
      );
      setMessages(finalized);
      onChangeMessages?.(finalized);

      const newLogEntry: SessionMissionLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        planetId: missionState.planetId,
        planetName: missionState.planet,
        query: queryToSend,
        recommendation: finalText,
        threatLevel,
        successRate: viabilityScore,
        targetSite: missionState.selectedMarker ? missionState.selectedMarker.name : 'Global Survey Orbit',
        tags: [missionState.planet.toUpperCase(), `${viabilityScore}/100`],
      };

      const nextLogs = [newLogEntry, ...sessionLogs];
      setSessionLogs(nextLogs);
      onChangeLogs?.(nextLogs);
    };

    try {
      const response = await requestFlightDirectorBriefing(missionState, queryToSend);

      if (!response.ok || !response.body) {
        throw new Error('Holographic stream unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let isOffline = false;
      let shouldUseClientFallback = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) {
                fullContent += data.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId ? { ...msg, content: fullContent } : msg
                  )
                );
              }
              if (data.offlineMode) {
                isOffline = true;
              }
              if (data.useClientFallback) {
                shouldUseClientFallback = true;
              }
            } catch {
              // Ignore partial SSE split chunks
            }
          }
        }
      }

      if ((shouldUseClientFallback || !fullContent.trim()) && !fullContent) {
        fullContent = generateClientCommanderBriefing(missionState, queryToSend);
        isOffline = true;
      }

      finalizeConversation(fullContent, isOffline);
    } catch {
      const fallbackContent = generateClientCommanderBriefing(missionState, queryToSend);
      finalizeConversation(fallbackContent, true);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyLog = (log: SessionMissionLogEntry) => {
    const textToCopy = `--- ORBIT-X MISSION DIRECTIVE ---
Planet: ${log.planetName} (${log.timestamp})
Target Site: ${log.targetSite || 'Global'}
Threat: ${log.threatLevel} | Viability: ${log.successRate}/100
Inquiry: ${log.query}

${log.recommendation}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2500);
  };

  const handleExportLogs = () => {
    const exportData = {
      title: 'Orbit-X Commander X Mission Log',
      sessionDate: new Date().toISOString(),
      activePlanet: missionState.planet,
      logs: sessionLogs,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-x-commander-x-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = sessionLogs.filter((log) => {
    const matchesPlanet = logPlanetFilter === 'all' || log.planetId.toLowerCase() === logPlanetFilter.toLowerCase();
    const matchesSearch =
      !logSearchQuery.trim() ||
      log.query.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.recommendation.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.targetSite && log.targetSite.toLowerCase().includes(logSearchQuery.toLowerCase()));
    return matchesPlanet && matchesSearch;
  });

  return (
    <div className="p-3 sm:p-3.5 flex flex-col h-full min-w-0 overflow-x-hidden relative bg-[#040a1c]/80 backdrop-blur-2xl">
      {/* Header with Live Context Telemetry Pills & Tabs */}
      <div className="border-b border-cyan-500/25 pb-2 mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('comms')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'comms'
                ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'text-slate-300 border-slate-700 hover:text-cyan-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>FLIGHT DIRECTOR CHAT</span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'log'
                ? 'bg-purple-500/30 text-purple-100 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-300 border-slate-700 hover:text-purple-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-300" />
            <span>MISSION LOG</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-200 border border-purple-600">
              {sessionLogs.length}
            </span>
          </button>
        </div>

        {/* Live Sync Telemetry Summary */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-cyan-500/35 text-cyan-200 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            VIABILITY: <strong className="text-white">{viabilityScore}/100</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-purple-500/35 text-purple-200 flex items-center gap-1 hidden sm:flex">
            <Layers className="w-3 h-3 text-purple-400" />
            LAYERS: <strong className="text-white">{missionState.activeFeatureLayers.length} ACTIVE</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded border font-bold ${
              threatLevel === 'NOMINAL'
                ? 'bg-emerald-950/70 text-emerald-200 border-emerald-500/50'
                : threatLevel === 'MODERATE'
                ? 'bg-amber-950/70 text-amber-200 border-amber-500/50'
                : 'bg-red-950/70 text-red-200 border-red-500/50'
            }`}
          >
            {threatLevel}
          </span>

          {activeTab === 'log' && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportLogs}
                className="px-2 py-1 rounded text-[10px] font-mono bg-cyan-950/70 text-cyan-200 border border-cyan-600/50 hover:bg-cyan-900/70 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>EXPORT</span>
              </button>
              <button
                onClick={() => {
                  setSessionLogs([]);
                  onChangeLogs?.([]);
                }}
                className="p-1 rounded text-slate-400 hover:text-red-400"
                title="Clear log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: FLIGHT DIRECTOR CHAT */}
      {activeTab === 'comms' && (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 mb-2.5 pr-1 min-h-0 min-w-0 holo-scrollbar">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col min-w-0 max-w-full ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5 text-[10px] font-mono text-slate-300 max-w-full">
                    <span className="font-semibold text-cyan-300">
                      {isUser ? 'ORBIT-X ENGINEER' : 'COMMANDER X'}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.offlineMode && (
                      <span className="text-amber-300 text-[10px] bg-amber-950/70 px-1.5 rounded border border-amber-700/50">
                        TACTICAL CORE
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-2.5 sm:p-3 rounded-xl text-xs sm:text-[13px] leading-relaxed max-w-full sm:max-w-[92%] font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                      isUser
                        ? 'bg-cyan-950/85 text-cyan-50 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                        : 'bg-[#071329]/90 text-slate-100 border border-cyan-500/35 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                    }`}
                  >
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Tactical Directives */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3" />
              QUICK PROMPTS:
            </span>
            <button
              disabled={isStreaming}
              onClick={() =>
                handleSendCommand(
                  `Analyze selected landing site (${
                    missionState.selectedMarker ? missionState.selectedMarker.name : 'Global Sector'
                  }) on ${missionState.planet} given suitability ${
                    missionState.selectedMarker ? `${missionState.selectedMarker.safetyScore}%` : 'N/A'
                  } and viability ${viabilityScore}/100.`
                )
              }
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-cyan-950/60 text-cyan-200 border border-cyan-700/50 hover:border-cyan-400 transition-all"
            >
              Analyze selected landing site
            </button>
            <button
              disabled={isStreaming}
              onClick={() =>
                handleSendCommand(
                  `Compare gravity with Earth (9.81 m/s²) for ${missionState.userWeight} kg mass at ${missionState.gravity} m/s² on ${missionState.planet} using W = m*g and h = v^2/(2g).`
                )
              }
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-amber-950/60 text-amber-200 border border-amber-700/50 hover:border-amber-400 transition-all"
            >
              Compare gravity with Earth
            </button>
            <button
              disabled={isStreaming}
              onClick={() =>
                handleSendCommand(
                  `Explain core layers and geological structure of ${missionState.planet} (${
                    missionState.explodedView ? 'Exploded Core active' : 'Nominal view'
                  }), including where interior pressure/temperature data are model-dependent.`
                )
              }
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-purple-950/60 text-purple-200 border border-purple-700/50 hover:border-purple-400 transition-all"
            >
              Explain core layers
            </button>
            <button
              disabled={isStreaming}
              onClick={() =>
                handleSendCommand(
                  `Our mission viability score on ${missionState.planet} (${missionState.era}) is ${viabilityScore}/100. How can we improve crew safety and readiness?`
                )
              }
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-200 border border-emerald-600/50 hover:border-emerald-400 transition-all"
            >
              Improve viability score
            </button>
          </div>
        </>
      )}

      {/* VIEW 2: SESSION MISSION LOG */}
      {activeTab === 'log' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 mb-2">
          <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-cyan-500/20">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-[#050b1a] border border-cyan-500/35 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-cyan-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
              {[
                'all',
                'mercury',
                'venus',
                'earth',
                'moon',
                'mars',
                'jupiter',
                'europa',
                'saturn',
                'uranus',
                'neptune',
              ].map((pId) => (
                <button
                  key={pId}
                  onClick={() => setLogPlanetFilter(pId)}
                  className={`px-2 py-1 rounded uppercase transition-all ${
                    logPlanetFilter === pId
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}
                >
                  {pId}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-300 font-mono text-xs">
                <BookOpen className="w-7 h-7 text-slate-500 mb-2" />
                <p>No mission logs match your filter.</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-purple-500/35 bg-[#071329]/90 font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] border-b border-purple-500/20 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded font-bold bg-purple-950 text-purple-200 border border-purple-700">
                        {log.planetName.toUpperCase()}
                      </span>
                      <span className="text-slate-300">{log.timestamp}</span>
                    </div>
                    <span className="text-cyan-200 font-bold">{log.successRate}/100</span>
                  </div>
                  <div className="text-xs text-cyan-200 font-semibold flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{log.query}</span>
                  </div>
                  <div className="text-xs text-slate-200 whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-black/40 p-2 rounded border border-cyan-500/15">
                    {log.recommendation}
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleCopyLog(log)}
                      className="px-2 py-1 rounded text-[10px] bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400 flex items-center gap-1"
                    >
                      {copiedLogId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLogId === log.id ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Voice Notice */}
      {voiceNotice && (
        <div className="mb-2 px-3 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/60 text-[11px] font-mono text-cyan-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{voiceNotice}</span>
          </div>
          {isListening && (
            <button onClick={handleToggleVoice} className="text-red-300 font-bold shrink-0">
              STOP
            </button>
          )}
        </div>
      )}

      {/* Command Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendCommand();
        }}
        className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-cyan-500/25 min-w-0"
      >
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`p-2 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-red-600 text-white border-red-400'
              : 'holo-panel text-cyan-300 border-cyan-500/40 hover:text-white hover:border-cyan-300'
          }`}
          title="Voice command input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isStreaming}
          placeholder={`Ask Commander X about ${missionState.planet}...`}
          className="flex-1 min-w-0 bg-[#050b1a] border border-cyan-500/40 rounded-lg px-2.5 sm:px-3 py-2 text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300"
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || isStreaming}
          className="holo-panel px-2.5 sm:px-3.5 py-2 rounded-lg border border-cyan-400/60 bg-cyan-950/60 text-cyan-100 hover:bg-cyan-900/70 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
        >
          {isStreaming ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
          ) : (
            <Send className="w-3.5 h-3.5 text-cyan-300" />
          )}
          <span className="font-mono text-xs font-semibold hidden sm:inline">TRANSMIT</span>
        </button>
      </form>
    </div>
  );
};
