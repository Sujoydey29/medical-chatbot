import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TemporaryChatToggleProps {
  isTemporary: boolean;
  onToggle: (enabled: boolean) => void;
}

export function TemporaryChatToggle({ isTemporary, onToggle }: TemporaryChatToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isTemporary ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(!isTemporary)}
            className={`relative ${isTemporary ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : ''}`}
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isTemporary ? 'animate-pulse' : ''}`} />
            Temporary Chat
            {isTemporary && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-white/20 rounded">
                ACTIVE
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-semibold mb-1">Temporary Chat Mode</p>
          <p className="text-xs text-muted-foreground">
            {isTemporary 
              ? "Currently active. Messages won't be saved to database." 
              : "Click to enable. Your conversation will not be saved or appear in history."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
