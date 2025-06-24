import { Loader2Icon } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = "Processing...",
}: LoadingStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-default-100/50 backdrop-blur-[2px] rounded-lg border border-default-200">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-default-200">
        <Loader2Icon className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-foreground/80">{message}</span>
      </div>
    </div>
  );
}
