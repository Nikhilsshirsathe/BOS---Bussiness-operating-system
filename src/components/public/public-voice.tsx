"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, Bot, Loader2 } from "lucide-react";
import type { Business, BrandSettings, VoiceTurn } from "@/types";
import { cn } from "@/lib/utils";

// Browser Speech API types (not always in TypeScript's DOM lib)
interface ISpeechRecognitionEvent {
  results: { length: number; [index: number]: { [index: number]: { transcript: string } } };
}
interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface Props {
  business: Business;
  brand: BrandSettings | null;
  onBack: () => void;
}

type CallState = "idle" | "connecting" | "active" | "speaking" | "listening" | "ended";

function getVisitorId() {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("agentos_visitor_id");
  if (!id) { id = `v_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; localStorage.setItem("agentos_visitor_id", id); }
  return id;
}

export default function PublicVoice({ business, brand, onBack }: Props) {
  const primaryColor = brand?.primary_color ?? "#6366f1";
  const botName = brand?.bot_name ?? "AI Assistant";

  const [callState, setCallState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState<VoiceTurn[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const callStartedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [transcript]);

  // Check browser support
  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synthRef.current.speak(utterance);
    });
  }, []);

  const sendToAI = useCallback(async (updatedTranscript: VoiceTurn[]) => {
    setCallState("speaking");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          call_id: callId,
          transcript: updatedTranscript,
          visitor_id: getVisitorId(),
        }),
      });
      const data = await res.json();
      const reply = data.reply as string;
      const newTranscript: VoiceTurn[] = [
        ...updatedTranscript,
        { role: "assistant", content: reply, ts: new Date().toISOString() },
      ];
      setTranscript(newTranscript);

      await speak(reply);

      if (data.call_ended) {
        setCallState("ended");
        stopRecognition();
      } else {
        setCallState("listening");
        startListening();
      }
    } catch {
      setError("Connection error. Please try again.");
      setCallState("ended");
    }
  }, [business.id, callId, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(() => {
    if (!speechSupported) return;
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      setCurrentSpeech(text);
    };

    recognition.onend = () => {
      if (currentSpeech.trim() && callState !== "ended") {
        const turn: VoiceTurn = { role: "user", content: currentSpeech.trim(), ts: new Date().toISOString() };
        const updated = [...transcript, turn];
        setTranscript(updated);
        setCurrentSpeech("");
        sendToAI(updated);
      }
    };

    recognition.onerror = () => {
      setCallState("listening");
    };

    recognition.start();
  }, [speechSupported, currentSpeech, callState, transcript, sendToAI]);

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startCall = async () => {
    if (callStartedRef.current) return;
    callStartedRef.current = true;
    setCallState("connecting");
    setError(null);

    synthRef.current = window.speechSynthesis;

    // Create call record
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: callRecord } = await supabase
      .from("voice_calls")
      .insert({
        business_id: business.id,
        visitor_id: getVisitorId(),
        status: "active",
        transcript: [],
      })
      .select("id")
      .single();

    if (callRecord) setCallId(callRecord.id);

    // Start with greeting
    const greeting = brand?.greeting_message ?? `Hello! Thank you for calling ${business.business_name}. How can I help you today?`;
    const initialTranscript: VoiceTurn[] = [
      { role: "assistant", content: greeting, ts: new Date().toISOString() },
    ];
    setTranscript(initialTranscript);
    setCallState("speaking");

    await speak(greeting);
    setCallState("listening");
    startListening();
  };

  const endCall = async () => {
    stopRecognition();
    synthRef.current?.cancel();
    setCallState("ended");

    if (callId) {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("voice_calls").update({
        status: "completed",
        transcript,
      }).eq("id", callId);
    }
  };

  const isCallActive = callState === "active" || callState === "speaking" || callState === "listening";

  return (
    <div className="h-screen flex flex-col bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white bg-emerald-600">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Phone size={16} />
        </div>
        <div>
          <p className="font-semibold text-sm">{botName}</p>
          <p className="text-xs text-white/80">Voice AI Receptionist</p>
        </div>
      </div>

      {/* Call state visual */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        {callState === "idle" && (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
              <Phone size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Call AI Receptionist</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Have a voice conversation with our AI. Ask about services, prices, or book an appointment.
            </p>
            {!speechSupported && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-4 py-2 rounded-lg">
                Your browser doesn&apos;t support voice. Please use Chrome or Edge.
              </p>
            )}
            <button
              onClick={startCall}
              disabled={!speechSupported}
              className="flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <Phone size={18} /> Start Call
            </button>
          </div>
        )}

        {callState === "connecting" && (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto animate-pulse">
              <Loader2 size={40} className="text-emerald-600 animate-spin" />
            </div>
            <p className="text-muted-foreground">Connecting…</p>
          </div>
        )}

        {(isCallActive || callState === "ended") && (
          <div className="w-full">
            {/* Transcript */}
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {transcript.map((turn, i) => (
                <div key={i} className={cn("flex gap-2", turn.role === "user" ? "justify-end" : "justify-start")}>
                  {turn.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    turn.role === "user" ? "bg-primary text-white rounded-br-sm" : "bg-muted rounded-bl-sm"
                  )}>
                    {turn.content}
                  </div>
                </div>
              ))}
              {currentSpeech && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm italic text-muted-foreground">
                    {currentSpeech}…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Status indicator */}
            <div className="text-center text-sm text-muted-foreground mb-4">
              {callState === "listening" && (
                <span className="flex items-center justify-center gap-2 text-emerald-600">
                  <Mic size={16} className="animate-pulse" /> Listening…
                </span>
              )}
              {callState === "speaking" && (
                <span className="flex items-center justify-center gap-2 text-blue-600">
                  <Bot size={16} className="animate-pulse" /> AI is speaking…
                </span>
              )}
              {callState === "ended" && (
                <span className="text-muted-foreground">Call ended</span>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>}
      </div>

      {/* Bottom controls */}
      <div className="p-6 flex justify-center gap-6 border-t">
        {isCallActive ? (
          <>
            <button className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-white",
              callState === "listening" ? "bg-emerald-500" : "bg-muted text-muted-foreground"
            )}>
              {callState === "listening" ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <button onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600">
              <PhoneOff size={22} />
            </button>
          </>
        ) : callState === "ended" ? (
          <button onClick={onBack}
            className="px-6 py-2.5 rounded-full border font-medium text-sm hover:bg-muted transition-colors">
            ← Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
