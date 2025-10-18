import { Cable } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface CableCardProps {
  cable: Cable;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CableCard({ cable, isSelected, onSelect, onEdit, onDelete }: CableCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover-elevate ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
      data-testid={`card-cable-${cable.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-semibold text-sm truncate" data-testid={`text-cable-name-${cable.id}`}>
            {cable.name}
          </h3>
          <p className="text-xs text-muted-foreground" data-testid={`text-cable-type-${cable.id}`}>
            {cable.type}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            data-testid={`button-edit-cable-${cable.id}`}
            className="h-7 w-7"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-cable-${cable.id}`}
            className="h-7 w-7"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Cable Size:</span>
            <span className="ml-1 font-mono font-medium" data-testid={`text-cable-fiber-count-${cable.id}`}>
              {cable.fiberCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
