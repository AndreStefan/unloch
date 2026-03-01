export default function TypingIndicator() {
  return (
    <div className="flex justify-start my-3 px-4">
      <div className="bg-rule-bubble rounded-2xl rounded-bl-md px-4 py-3">
        <p className="text-[10px] font-medium text-sage-dark mb-1 uppercase tracking-wide">
          Reviewing your care plan...
        </p>
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-2 h-2 bg-sage rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-sage rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-sage rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
