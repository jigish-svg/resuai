'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Sparkles, CheckCircle2, Target, Volume2, VolumeX } from 'lucide-react';
import { getScoreColor } from '@/lib/utils';
import { MockInterviewSession as MockInterviewSessionType, MockInterviewTranscriptEntry } from '@/types/mock-interview';

interface MockInterviewSessionProps {
  jobId: string;
  jobTitle: string;
  company: string | null;
}

type CallState = 'idle' | 'connecting' | 'live' | 'finalizing';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MockInterviewSession({ jobId, jobTitle, company }: MockInterviewSessionProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<MockInterviewTranscriptEntry[]>([]);
  const [completedSession, setCompletedSession] = useState<MockInterviewSessionType | null>(null);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAssistantTextRef = useRef('');
  const currentAssistantIndexRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  const cleanupConnection = () => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRealtimeEvent = (e: MessageEvent) => {
    let event: { type?: string; delta?: string; transcript?: string };
    try {
      event = JSON.parse(e.data);
    } catch {
      return;
    }
    const type = event.type || '';

    if (type.includes('audio_transcript') && (type.endsWith('.delta') || type.endsWith('.done'))) {
      if (type.endsWith('.delta') && typeof event.delta === 'string') {
        setInterviewerSpeaking(true);
        currentAssistantTextRef.current += event.delta;
        const text = currentAssistantTextRef.current;
        setTranscript((prev) => {
          const next = [...prev];
          const idx = currentAssistantIndexRef.current;
          if (idx !== null && next[idx]?.role === 'interviewer') {
            next[idx] = { role: 'interviewer', text };
          } else {
            next.push({ role: 'interviewer', text });
            currentAssistantIndexRef.current = next.length - 1;
          }
          return next;
        });
      } else {
        setInterviewerSpeaking(false);
        currentAssistantTextRef.current = '';
        currentAssistantIndexRef.current = null;
      }
      return;
    }

    if (type.includes('input_audio_transcription') && type.endsWith('.completed') && typeof event.transcript === 'string') {
      setTranscript((prev) => [...prev, { role: 'candidate', text: event.transcript as string }]);
    }
  };

  const startCall = async () => {
    setError(null);
    setCompletedSession(null);
    setTranscript([]);
    currentAssistantTextRef.current = '';
    currentAssistantIndexRef.current = null;
    setCallState('connecting');

    try {
      const res = await fetch('/api/mock-interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start session');
      sessionIdRef.current = data.sessionId;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (ev) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = ev.streams[0];
        }
      };
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      const dc = pc.createDataChannel('oai-events');
      dc.onmessage = handleRealtimeEvent;
      dcRef.current = dc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${data.ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });
      if (!sdpResponse.ok) throw new Error('Failed to connect to the live interview');
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setCallState('live');
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } catch (err) {
      cleanupConnection();
      setError(err instanceof Error ? err.message : 'Failed to start the live interview');
      setCallState('idle');
    }
  };

  const endCall = async () => {
    const finalTranscript = transcript;
    cleanupConnection();

    if (!sessionIdRef.current || finalTranscript.length === 0) {
      setCallState('idle');
      return;
    }

    setCallState('finalizing');
    try {
      const res = await fetch('/api/mock-interview/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, transcript: finalTranscript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate feedback');
      setCompletedSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback');
    } finally {
      setCallState('idle');
    }
  };

  const toggleMicMute = () => {
    const next = !micMuted;
    setMicMuted(next);
    micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  const toggleSpeakerMute = () => {
    const next = !speakerMuted;
    setSpeakerMuted(next);
    if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
  };

  if (completedSession && completedSession.overall_feedback) {
    return (
      <div className="animate-fade-up rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 relative">
          <h3 className="font-bold text-lg">Session Summary</h3>
          <span className={`text-2xl font-bold ${getScoreColor(completedSession.overall_feedback.readiness_score)}`}>
            {completedSession.overall_feedback.readiness_score}%
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-4 relative">{completedSession.overall_feedback.summary}</p>

        <div className="grid sm:grid-cols-2 gap-4 relative">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Strengths
            </p>
            <ul className="space-y-1.5">
              {completedSession.overall_feedback.strengths.map((s, i) => (
                <li key={i} className="text-xs text-gray-600">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600" /> Focus Areas
            </p>
            <ul className="space-y-1.5">
              {completedSession.overall_feedback.focus_areas.map((f, i) => (
                <li key={i} className="text-xs text-gray-600">{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 relative">
          <button
            onClick={startCall}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-5 py-2.5 rounded-full font-medium text-sm text-white"
          >
            <Sparkles className="w-4 h-4" />
            Practice Again
          </button>
        </div>
      </div>
    );
  }

  if (callState === 'idle' && transcript.length === 0) {
    return (
      <div className="animate-fade-up glass rounded-2xl p-10 border border-black/[0.06] text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg relative">
          <Mic className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2 relative">Ready to practice?</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
          You&apos;ll have a real, live voice conversation with an AI interviewer about this {jobTitle} role
          {company ? ` at ${company}` : ''} — just talk, no typing. 5 questions, then a full readiness report.
        </p>
        {error && <p className="text-sm text-red-600 mb-4 relative">{error}</p>}
        <button
          onClick={startCall}
          className="relative inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-7 py-3 rounded-full font-semibold shadow-lg text-white"
        >
          <Sparkles className="w-4 h-4" />
          Start Practice Session
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up glass rounded-2xl border border-black/[0.06] overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay hidden />

      <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-brand-primary">
        <div className="flex items-center gap-2 text-white">
          <span className={`w-2 h-2 rounded-full ${callState === 'live' ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
          <p className="font-semibold text-sm">
            {callState === 'connecting' ? 'Connecting…' : callState === 'finalizing' ? 'Generating feedback…' : 'Live Interview'}
          </p>
        </div>
        {callState === 'live' && <p className="text-white/80 text-xs font-medium">{formatDuration(elapsedSeconds)}</p>}
      </div>

      <div ref={scrollRef} className="max-h-[28rem] overflow-y-auto p-6 space-y-3">
        {transcript.length === 0 && callState === 'connecting' && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {transcript.map((b, i) => (
          <div key={i} className={`flex ${b.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                b.role === 'candidate'
                  ? 'bg-brand-primary text-white rounded-br-sm'
                  : 'bg-black/[0.04] text-gray-800 rounded-bl-sm'
              }`}
            >
              {b.text}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="px-6 text-sm text-red-600 pb-2">{error}</p>}

      {(callState === 'live' || callState === 'connecting') && (
        <div className="border-t border-black/[0.06] p-4 flex items-center justify-center gap-3">
          <p className="text-xs text-gray-500 mr-2">
            {callState === 'connecting' ? 'Setting up…' : interviewerSpeaking ? 'Interviewer speaking…' : 'Your turn — just talk'}
          </p>
          <button
            onClick={toggleMicMute}
            disabled={callState !== 'live'}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
              micMuted ? 'bg-red-500 text-white' : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.08]'
            }`}
            title={micMuted ? 'Unmute mic' : 'Mute mic'}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleSpeakerMute}
            disabled={callState !== 'live'}
            className="w-11 h-11 rounded-xl bg-black/[0.04] text-gray-600 hover:bg-black/[0.08] flex items-center justify-center transition-all disabled:opacity-40"
            title={speakerMuted ? 'Unmute interviewer' : 'Mute interviewer'}
          >
            {speakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={endCall}
            disabled={callState !== 'live'}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-all px-5 py-2.5 rounded-xl font-medium text-sm text-white"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
          </button>
        </div>
      )}

      {callState === 'finalizing' && (
        <div className="border-t border-black/[0.06] p-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating your readiness report…
        </div>
      )}
    </div>
  );
}
