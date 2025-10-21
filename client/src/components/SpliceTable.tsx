import { Splice, Cable } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";

interface SpliceTableProps {
  splices: Splice[];
  cables: Cable[];
  onEdit: (splice: Splice) => void;
  onDelete: (splice: Splice) => void;
  onToggleComplete: (splice: Splice) => void;
}

export function SpliceTable({ splices, cables, onEdit, onDelete, onToggleComplete }: SpliceTableProps) {
  const getCableName = (cableId: string) => {
    return cables.find((c) => c.id === cableId)?.name || "Unknown";
  };

  if (splices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-splices">
        No splices configured yet. Add a splice to connect pairs between cables.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Done</TableHead>
            <TableHead>Source Cable</TableHead>
            <TableHead>Source Pairs</TableHead>
            <TableHead>Destination Cable</TableHead>
            <TableHead>Destination Pairs</TableHead>
            <TableHead>PON Range</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {splices.map((splice) => (
            <TableRow key={splice.id} data-testid={`row-splice-${splice.id}`}>
              <TableCell>
                <Checkbox
                  checked={splice.isCompleted === 1}
                  onCheckedChange={() => onToggleComplete(splice)}
                  data-testid={`checkbox-splice-complete-${splice.id}`}
                />
              </TableCell>
              <TableCell className="font-mono text-sm" data-testid={`text-splice-source-${splice.id}`}>
                {getCableName(splice.sourceCableId)}
              </TableCell>
              <TableCell className="font-mono text-sm" data-testid={`text-splice-source-pairs-${splice.id}`}>
                B{splice.sourceRibbon}: {splice.sourceStartFiber}-{splice.sourceEndFiber}
              </TableCell>
              <TableCell className="font-mono text-sm" data-testid={`text-splice-dest-${splice.id}`}>
                {getCableName(splice.destinationCableId)}
              </TableCell>
              <TableCell className="font-mono text-sm" data-testid={`text-splice-dest-pairs-${splice.id}`}>
                B{splice.destinationRibbon}: {splice.destinationStartFiber}-{splice.destinationEndFiber}
              </TableCell>
              <TableCell className="font-mono text-sm" data-testid={`text-splice-pon-${splice.id}`}>
                {splice.ponStart && splice.ponEnd ? `${splice.ponStart}-${splice.ponEnd}` : "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(splice)}
                    data-testid={`button-edit-splice-${splice.id}`}
                    className="h-7 w-7"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(splice)}
                    data-testid={`button-delete-splice-${splice.id}`}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
