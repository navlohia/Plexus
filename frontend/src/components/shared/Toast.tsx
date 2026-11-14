import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface ToastMessage {
  tone: "success" | "error";
  text: string;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const success = message.tone === "success";
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
      <div
        className={`flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
          success
            ? "border-emerald-500/30 bg-[#0D1B18]/95"
            : "border-red-500/30 bg-[#1B0F12]/95"
        }`}
      >
        {success ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={1.8} />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={1.8} />
        )}
        <p className="text-[12px] leading-relaxed text-slate-200">{message.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
