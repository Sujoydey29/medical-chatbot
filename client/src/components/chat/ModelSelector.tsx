import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  recommended?: boolean;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
}: ModelSelectorProps) {
  const selected = models.find((m) => m.id === selectedModel);

  // Group models by category
  const searchModels = models.filter((m) => m.category === "search");
  const reasoningModels = models.filter((m) => m.category === "reasoning");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <span className="font-medium">{selected?.name || "Select Model"}</span>
          {selected?.recommended && (
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
          <ChevronDown className="ml-2 w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Search Models</DropdownMenuLabel>
        {searchModels.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-2 w-full">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.name}</span>
                  {model.recommended && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      ⭐
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {model.description}
                </p>
              </div>
              {selectedModel === model.id && (
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        {reasoningModels.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Reasoning Models</DropdownMenuLabel>
            {reasoningModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="flex-1">
                    <span className="font-medium">{model.name}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {model.description}
                    </p>
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

