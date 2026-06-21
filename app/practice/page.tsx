import ChatPanel from "@/components/ChatPanel";
import VoiceChat from "@/components/VoiceChat";

export default function PracticePage() {
  return (
    <div>
      <div className="card mb-6 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Conversation practice</h1>
        <p className="mt-1 text-muted">
          Practice real Japanese with your AI tutor. Type for grammar feedback, or
          speak to practice pronunciation.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ChatPanel />
        <VoiceChat />
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Text tutoring is powered by Claude; voice practice by Grok. Without API
        keys the app runs in Demo mode with sample responses.
      </p>
    </div>
  );
}
