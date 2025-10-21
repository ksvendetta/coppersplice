import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Circuit, Cable, InsertCircuit } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, CheckCircle2, XCircle, Edit2, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CircuitManagementProps {
  cable: Cable;
}

export function CircuitManagement({ cable }: CircuitManagementProps) {
  const { toast } = useToast();
  const [circuitId, setCircuitId] = useState("");
  const [editingCircuitId, setEditingCircuitId] = useState<string | null>(null);
  const [editingCircuitValue, setEditingCircuitValue] = useState("");

  const { data: circuits = [], isLoading } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits/cable", cable.id],
  });

  const { data: allCables = [] } = useQuery<Cable[]>({
    queryKey: ["/api/cables"],
  });

  const { data: allCircuits = [] } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits"],
  });

  const createCircuitMutation = useMutation({
    mutationFn: async (data: InsertCircuit) => {
      return await apiRequest("POST", "/api/circuits", data);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
      setCircuitId("");
      toast({ title: "Circuit added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add circuit", 
        description: error.message || "Please check your input",
        variant: "destructive" 
      });
    },
  });

  const deleteCircuitMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/circuits/${id}`, undefined);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Circuit deleted successfully" });
    },
    onError: async (error: any) => {
      if (error?.message?.includes("not found") || error?.message?.includes("404")) {
        await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
        await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
        toast({ title: "Circuit removed from display" });
      } else {
        toast({ title: "Failed to delete circuit", variant: "destructive" });
      }
    },
  });

  const toggleSplicedMutation = useMutation({
    mutationFn: async ({ circuitId, feedCableId, feedFiberStart, feedFiberEnd }: { 
      circuitId: string; 
      feedCableId?: string;
      feedFiberStart?: number;
      feedFiberEnd?: number;
    }) => {
      return await apiRequest("PATCH", `/api/circuits/${circuitId}/toggle-spliced`, { 
        feedCableId, 
        feedFiberStart, 
        feedFiberEnd 
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
    },
    onError: async (error: any) => {
      if (error?.message?.includes("not found") || error?.message?.includes("404")) {
        await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
        await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
        toast({ title: "Circuit not found - display refreshed", variant: "destructive" });
      } else {
        toast({ 
          title: "Failed to toggle splice status",
          description: error.message || "An error occurred",
          variant: "destructive" 
        });
      }
    },
  });

  const updateCircuitIdMutation = useMutation({
    mutationFn: async ({ id, circuitId }: { id: string; circuitId: string }) => {
      return await apiRequest("PATCH", `/api/circuits/${id}/update-circuit-id`, { circuitId });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
      setEditingCircuitId(null);
      setEditingCircuitValue("");
      toast({ title: "Circuit ID updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update circuit ID", 
        description: error.message || "Please check your input",
        variant: "destructive" 
      });
    },
  });

  const moveCircuitMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      return await apiRequest("PATCH", `/api/circuits/${id}/move`, { direction });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Circuit moved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to move circuit", variant: "destructive" });
    },
  });

  const handleCheckboxChange = (circuit: Circuit, checked: boolean) => {
    if (cable.type === "Distribution" && checked) {
      const distParts = circuit.circuitId.split(',');
      if (distParts.length !== 2) {
        toast({
          title: "Invalid circuit ID format",
          variant: "destructive",
        });
        return;
      }
      
      const distributionPrefix = distParts[0].trim();
      const distRangeParts = distParts[1].trim().split('-');
      if (distRangeParts.length !== 2) {
        toast({
          title: "Invalid circuit ID range format",
          variant: "destructive",
        });
        return;
      }
      
      const distStart = parseInt(distRangeParts[0]);
      const distEnd = parseInt(distRangeParts[1]);
      
      const matchingFeedCircuit = allCircuits.find(c => {
        const feedCable = allCables.find(cable => cable.id === c.cableId);
        if (feedCable?.type !== "Feed") return false;
        
        const feedParts = c.circuitId.split(',');
        if (feedParts.length !== 2) return false;
        
        const feedPrefix = feedParts[0].trim();
        
        if (feedPrefix !== distributionPrefix) return false;
        
        const feedRangeParts = feedParts[1].trim().split('-');
        if (feedRangeParts.length !== 2) return false;
        
        const feedStart = parseInt(feedRangeParts[0]);
        const feedEnd = parseInt(feedRangeParts[1]);
        
        const isWithinRange = distStart >= feedStart && distEnd <= feedEnd;
        
        return isWithinRange;
      });

      if (!matchingFeedCircuit) {
        toast({
          title: "No matching Feed circuit found",
          description: `Could not find a Feed circuit with prefix "${distributionPrefix}" that contains the range ${distStart}-${distEnd}`,
          variant: "destructive",
        });
        return;
      }

      const feedCable = allCables.find(c => c.id === matchingFeedCircuit.cableId);
      
      const feedParts = matchingFeedCircuit.circuitId.split(',');
      const feedRangeParts = feedParts[1].trim().split('-');
      const feedStart = parseInt(feedRangeParts[0]);
      const feedEnd = parseInt(feedRangeParts[1]);
      
      const offsetFromFeedStart = distStart - feedStart;
      const offsetFromFeedEnd = distEnd - feedStart;
      
      const calculatedFeedPairStart = matchingFeedCircuit.fiberStart + offsetFromFeedStart;
      const calculatedFeedPairEnd = matchingFeedCircuit.fiberStart + offsetFromFeedEnd;
      
      toggleSplicedMutation.mutate({
        circuitId: circuit.id,
        feedCableId: feedCable?.id,
        feedFiberStart: calculatedFeedPairStart,
        feedFiberEnd: calculatedFeedPairEnd,
      });
    } else {
      toggleSplicedMutation.mutate({ circuitId: circuit.id });
    }
  };

  const handleStartEdit = (circuit: Circuit) => {
    setEditingCircuitId(circuit.id);
    setEditingCircuitValue(circuit.circuitId);
  };

  const handleCancelEdit = () => {
    setEditingCircuitId(null);
    setEditingCircuitValue("");
  };

  const parseAndCheckCircuitId = (newCircuitId: string, excludeCircuitId?: string) => {
    const parts = newCircuitId.split(',');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid circuit ID format. Expected format: "prefix,start-end"' };
    }
    
    const newPrefix = parts[0].trim();
    const newRange = parts[1].trim();
    const newRangeParts = newRange.split('-');
    
    if (newRangeParts.length !== 2) {
      return { valid: false, error: 'Invalid range format. Expected format: "start-end"' };
    }
    
    const newStart = parseInt(newRangeParts[0]);
    const newEnd = parseInt(newRangeParts[1]);
    
    if (isNaN(newStart) || isNaN(newEnd)) {
      return { valid: false, error: 'Range values must be numbers' };
    }
    
    for (const circuit of circuits) {
      if (excludeCircuitId && circuit.id === excludeCircuitId) continue;
      
      const existingParts = circuit.circuitId.split(',');
      if (existingParts.length !== 2) continue;
      
      const existingPrefix = existingParts[0].trim();
      const existingRange = existingParts[1].trim();
      const existingRangeParts = existingRange.split('-');
      
      if (existingRangeParts.length !== 2) continue;
      
      const existingStart = parseInt(existingRangeParts[0]);
      const existingEnd = parseInt(existingRangeParts[1]);
      
      if (isNaN(existingStart) || isNaN(existingEnd)) continue;
      
      if (newPrefix === existingPrefix) {
        if (newStart <= existingEnd && newEnd >= existingStart) {
          return { 
            valid: false, 
            error: `Circuit ID "${newCircuitId}" overlaps with existing circuit "${circuit.circuitId}". Ranges cannot overlap for the same prefix.` 
          };
        }
      }
    }
    
    return { valid: true };
  };

  const handleSaveEdit = (circuitId: string) => {
    if (!editingCircuitValue.trim()) {
      toast({
        title: "Circuit ID required",
        description: "Please enter a valid circuit ID",
        variant: "destructive",
      });
      return;
    }
    
    const validation = parseAndCheckCircuitId(editingCircuitValue.trim(), circuitId);
    if (!validation.valid) {
      toast({
        title: "Invalid Circuit ID",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }
    
    updateCircuitIdMutation.mutate({ id: circuitId, circuitId: editingCircuitValue });
  };

  const handleAddCircuit = () => {
    if (!circuitId.trim()) {
      toast({
        title: "Missing circuit ID",
        description: "Please enter a circuit ID (e.g., lg,33-36)",
        variant: "destructive",
      });
      return;
    }

    const validation = parseAndCheckCircuitId(circuitId.trim());
    if (!validation.valid) {
      toast({
        title: "Invalid Circuit ID",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    createCircuitMutation.mutate({
      cableId: cable.id,
      circuitId: circuitId.trim(),
    });
  };

  const totalAssignedPairs = useMemo(() => {
    return circuits.reduce((sum, circuit) => {
      return sum + (circuit.fiberEnd - circuit.fiberStart + 1);
    }, 0);
  }, [circuits]);

  const validationStatus = useMemo(() => {
    return totalAssignedPairs === cable.fiberCount;
  }, [totalAssignedPairs, cable.fiberCount]);

  // 25-pair copper cable color codes (tip/ring combinations with actual color values)
  const pairColors = [
    { tip: "white", ring: "blue", tipColor: "#64748b", ringColor: "#3b82f6" },
    { tip: "white", ring: "orange", tipColor: "#64748b", ringColor: "#f97316" },
    { tip: "white", ring: "green", tipColor: "#64748b", ringColor: "#16a34a" },
    { tip: "white", ring: "brown", tipColor: "#64748b", ringColor: "#b45309" },
    { tip: "white", ring: "slate", tipColor: "#64748b", ringColor: "#64748b" },
    { tip: "red", ring: "blue", tipColor: "#dc2626", ringColor: "#3b82f6" },
    { tip: "red", ring: "orange", tipColor: "#dc2626", ringColor: "#f97316" },
    { tip: "red", ring: "green", tipColor: "#dc2626", ringColor: "#16a34a" },
    { tip: "red", ring: "brown", tipColor: "#dc2626", ringColor: "#b45309" },
    { tip: "red", ring: "slate", tipColor: "#dc2626", ringColor: "#64748b" },
    { tip: "black", ring: "blue", tipColor: "#0f172a", ringColor: "#3b82f6" },
    { tip: "black", ring: "orange", tipColor: "#0f172a", ringColor: "#f97316" },
    { tip: "black", ring: "green", tipColor: "#0f172a", ringColor: "#16a34a" },
    { tip: "black", ring: "brown", tipColor: "#0f172a", ringColor: "#b45309" },
    { tip: "black", ring: "slate", tipColor: "#0f172a", ringColor: "#64748b" },
    { tip: "yellow", ring: "blue", tipColor: "#facc15", ringColor: "#3b82f6" },
    { tip: "yellow", ring: "orange", tipColor: "#facc15", ringColor: "#f97316" },
    { tip: "yellow", ring: "green", tipColor: "#facc15", ringColor: "#16a34a" },
    { tip: "yellow", ring: "brown", tipColor: "#facc15", ringColor: "#b45309" },
    { tip: "yellow", ring: "slate", tipColor: "#facc15", ringColor: "#64748b" },
    { tip: "violet", ring: "blue", tipColor: "#9333ea", ringColor: "#3b82f6" },
    { tip: "violet", ring: "orange", tipColor: "#9333ea", ringColor: "#f97316" },
    { tip: "violet", ring: "green", tipColor: "#9333ea", ringColor: "#16a34a" },
    { tip: "violet", ring: "brown", tipColor: "#9333ea", ringColor: "#b45309" },
    { tip: "violet", ring: "slate", tipColor: "#9333ea", ringColor: "#64748b" },
  ];

  const getColorForNumber = (num: number) => {
    if (num < 1) {
      console.error(`Invalid pair/binder number: ${num}`);
      return pairColors[0];
    }
    return pairColors[(num - 1) % 25];
  };

  const getBinderAndPairDisplay = (pairStart: number, pairEnd: number, binderSize: number) => {
    const startBinder = Math.ceil(pairStart / binderSize);
    const endBinder = Math.ceil(pairEnd / binderSize);
    
    const startPairInBinder = ((pairStart - 1) % binderSize) + 1;
    const endPairInBinder = ((pairEnd - 1) % binderSize) + 1;
    
    const ColoredBinder = ({ num }: { num: number }) => {
      const color = getColorForNumber(num);
      const gradientStyle = {
        background: `linear-gradient(to right, 
          ${color.tipColor} 0%, 
          ${color.tipColor} 33%, 
          ${color.ringColor} 33%, 
          ${color.ringColor} 67%, 
          ${color.tipColor} 67%, 
          ${color.tipColor} 100%)`
      };
      return (
        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={gradientStyle}>
          B{num}
        </span>
      );
    };
    
    const ColoredPair = ({ num }: { num: number }) => {
      const color = getColorForNumber(num);
      const gradientStyle = {
        background: `linear-gradient(to right, 
          ${color.tipColor} 0%, 
          ${color.tipColor} 33%, 
          ${color.ringColor} 33%, 
          ${color.ringColor} 67%, 
          ${color.tipColor} 67%, 
          ${color.tipColor} 100%)`
      };
      return (
        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={gradientStyle}>
          {num}
        </span>
      );
    };
    
    if (startBinder === endBinder) {
      return (
        <span className="flex items-center gap-1">
          <ColoredBinder num={startBinder} />
          <span>:</span>
          <ColoredPair num={startPairInBinder} />
          <span>-</span>
          <ColoredPair num={endPairInBinder} />
        </span>
      );
    } else {
      const parts = [];
      
      const startsWithPartialBinder = startPairInBinder !== 1;
      const endsWithPartialBinder = endPairInBinder !== binderSize;
      
      if (!startsWithPartialBinder && !endsWithPartialBinder) {
        if (startBinder === endBinder - 1) {
          return (
            <span className="flex items-center gap-1">
              <ColoredBinder num={startBinder} />
              <span>-</span>
              <ColoredBinder num={endBinder} />
            </span>
          );
        } else {
          return (
            <span className="flex items-center gap-1">
              <ColoredBinder num={startBinder} />
              <span>-</span>
              <ColoredBinder num={endBinder} />
            </span>
          );
        }
      }
      
      if (startsWithPartialBinder) {
        parts.push(
          <span key={`start-${startBinder}`} className="flex items-center gap-1">
            <ColoredBinder num={startBinder} />
            <span>:</span>
            <ColoredPair num={startPairInBinder} />
            <span>-</span>
            <ColoredPair num={binderSize} />
          </span>
        );
      }
      
      const firstFullBinder = startsWithPartialBinder ? startBinder + 1 : startBinder;
      const lastFullBinder = endsWithPartialBinder ? endBinder - 1 : endBinder;
      
      if (firstFullBinder <= lastFullBinder) {
        for (let r = firstFullBinder; r <= lastFullBinder; r++) {
          parts.push(
            <span key={`full-${r}`} className="flex items-center gap-1">
              <ColoredBinder num={r} />
              <span>:</span>
              <ColoredPair num={1} />
              <span>-</span>
              <ColoredPair num={binderSize} />
            </span>
          );
        }
      }
      
      if (endsWithPartialBinder) {
        parts.push(
          <span key={`end-${endBinder}`} className="flex items-center gap-1">
            <ColoredBinder num={endBinder} />
            <span>:</span>
            <ColoredPair num={1} />
            <span>-</span>
            <ColoredPair num={endPairInBinder} />
          </span>
        );
      }
      
      return (
        <span className="flex flex-col gap-1">
          {parts.map((part, index) => (
            <span key={index}>
              {part}
            </span>
          ))}
        </span>
      );
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading circuits...</div>;
  }

  return (
    <Card data-testid="card-circuit-management">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="text-lg">Circuit Details</CardTitle>
        <div className="flex items-center gap-2">
          {validationStatus ? (
            <Badge className="gap-1 bg-green-600 hover:bg-green-700" data-testid="badge-validation-pass">
              <CheckCircle2 className="h-3 w-3" />
              Pass
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1" data-testid="badge-validation-fail">
              <XCircle className="h-3 w-3" />
              Fail
            </Badge>
          )}
          <span className="text-sm text-muted-foreground" data-testid="text-cable-size">
            Total Pair Count: {totalAssignedPairs}/{cable.fiberCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="circuitId" className="text-xs">
              Circuit ID
            </Label>
            <Input
              id="circuitId"
              data-testid="input-circuit-id"
              value={circuitId}
              onChange={(e) => setCircuitId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCircuit()}
              placeholder="e.g., lg,33-36"
              className="text-sm"
            />
          </div>
          <Button
            size="icon"
            data-testid="button-add-circuit"
            onClick={handleAddCircuit}
            disabled={createCircuitMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {circuits.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {cable.type === "Distribution" && (
                    <TableHead className="w-[10%]">Splice</TableHead>
                  )}
                  <TableHead className={cable.type === "Distribution" ? "w-[30%]" : "w-[35%]"}>Circuit ID</TableHead>
                  <TableHead>Copper Pairs</TableHead>
                  <TableHead className="w-[12%]">Pair Count</TableHead>
                  <TableHead className="w-[15%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circuits.map((circuit, index) => {
                  const binderDisplay = getBinderAndPairDisplay(
                    circuit.fiberStart,
                    circuit.fiberEnd,
                    25
                  );
                  const isEditing = editingCircuitId === circuit.id;
                  
                  return (
                    <TableRow key={circuit.id} data-testid={`row-circuit-${circuit.id}`}>
                      {cable.type === "Distribution" && (
                        <TableCell>
                          <Checkbox
                            checked={circuit.isSpliced === 1}
                            onCheckedChange={(checked) => handleCheckboxChange(circuit, checked as boolean)}
                            data-testid={`checkbox-spliced-${circuit.id}`}
                            disabled={isEditing}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm" data-testid={`text-circuit-id-${circuit.id}`}>
                        {isEditing ? (
                          <Input
                            value={editingCircuitValue}
                            onChange={(e) => setEditingCircuitValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(circuit.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="text-sm font-mono h-8"
                            data-testid={`input-edit-circuit-${circuit.id}`}
                            autoFocus
                          />
                        ) : (
                          circuit.circuitId
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm" data-testid={`text-pair-range-${circuit.id}`}>
                        {binderDisplay}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-pair-count-${circuit.id}`}>
                        {circuit.fiberEnd - circuit.fiberStart + 1}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveEdit(circuit.id)}
                                disabled={updateCircuitIdMutation.isPending}
                                data-testid={`button-save-circuit-${circuit.id}`}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                data-testid={`button-cancel-edit-${circuit.id}`}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleStartEdit(circuit)}
                                data-testid={`button-edit-circuit-${circuit.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => moveCircuitMutation.mutate({ id: circuit.id, direction: "up" })}
                                disabled={index === 0 || moveCircuitMutation.isPending}
                                data-testid={`button-move-up-${circuit.id}`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => moveCircuitMutation.mutate({ id: circuit.id, direction: "down" })}
                                disabled={index === circuits.length - 1 || moveCircuitMutation.isPending}
                                data-testid={`button-move-down-${circuit.id}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-delete-circuit-${circuit.id}`}
                                onClick={() => deleteCircuitMutation.mutate(circuit.id)}
                                disabled={deleteCircuitMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {circuits.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No circuits defined. Add a circuit to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
