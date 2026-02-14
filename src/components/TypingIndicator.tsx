export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-message-in" role="status" aria-live="polite">
      <span className="text-xs text-goshiwon-text-muted">서문조 is typing</span>
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-goshiwon-accent rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-goshiwon-accent rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-goshiwon-accent rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}
