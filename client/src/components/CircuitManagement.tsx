import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Circuit, Cable, InsertCircuit } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [feedSelectionDialog, setFeedSelectionDialog] = useState<{ open: boolean; circuitId: string | null }>({
    open: false,
    circuitId: null,
  });
  const [selectedFeedCableId, setSelectedFeedCableId] = useState<string>("");
  const [feedRibbon, setFeedRibbon] = useState<string>("");
  const [feedStrandStart, setFeedStrandStart] = useState<string>("");
  const [feedStrandEnd, setFeedStrandEnd] = useState<string>("");

  const { data: circuits = [], isLoading } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits/cable", cable.id],
    queryFn: async () => {
      const response = await fetch(`/api/circuits/cable/${cable.id}`);
      if (!response.ok) throw new Error("Failed to fetch circuits");
      return response.json();
    },
  });

  const { data: allCables = [] } = useQuery<Cable[]>({
    queryKey: ["/api/cables"],
  });

  const feedCables = useMemo(() => {
    return allCables.filter((c) => c.type === "Feed");
  }, [allCables]);

  const createCircuitMutation = useMutation({
    mutationFn: async (data: InsertCircuit) => {
      return await apiRequest("POST", "/api/circuits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits/cable", cable.id] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      toast({ title: "Circuit deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete circuit", variant: "destructive" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits/cable", cable.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      setFeedSelectionDialog({ open: false, circuitId: null });
      setSelectedFeedCableId("");
      setFeedRibbon("");
      setFeedStrandStart("");
      setFeedStrandEnd("");
    },
    onError: () => {
      toast({ title: "Failed to toggle splice status", variant: "destructive" });
    },
  });

  const handleCheckboxChange = (circuit: Circuit, checked: boolean) => {
    if (cable.type === "Distribution" && checked) {
      // Opening splice dialog - need to select Feed cable and fiber range
      setFeedSelectionDialog({ open: true, circuitId: circuit.id });
      setSelectedFeedCableId(circuit.feedCableId || "");
      
      // Pre-populate feed fiber range if already set
      if (circuit.feedFiberStart && circuit.feedFiberEnd) {
        const ribbonSize = 12;
        const getRibbonNumber = (fiber: number) => Math.ceil(fiber / ribbonSize);
        const getFiberPositionInRibbon = (fiber: number) => ((fiber - 1) % ribbonSize) + 1;
        
        setFeedRibbon(getRibbonNumber(circuit.feedFiberStart).toString());
        setFeedStrandStart(getFiberPositionInRibbon(circuit.feedFiberStart).toString());
        setFeedStrandEnd(getFiberPositionInRibbon(circuit.feedFiberEnd).toString());
      }
    } else {
      // Unchecking - just toggle without feed cable selection
      toggleSplicedMutation.mutate({ circuitId: circuit.id });
    }
  };

  const handleConfirmFeedSelection = () => {
    if (!selectedFeedCableId) {
      toast({
        title: "Feed cable required",
        description: "Please select a Feed cable for this splice",
        variant: "destructive",
      });
      return;
    }

    if (!feedRibbon || !feedStrandStart || !feedStrandEnd) {
      toast({
        title: "Feed fiber range required",
        description: "Please specify ribbon and strand range in the Feed cable",
        variant: "destructive",
      });
      return;
    }

    // Calculate feed fiber start and end from ribbon and strand
    const ribbonSize = 12;
    const ribbon = parseInt(feedRibbon);
    const strandStart = parseInt(feedStrandStart);
    const strandEnd = parseInt(feedStrandEnd);
    
    const feedFiberStart = (ribbon - 1) * ribbonSize + strandStart;
    const feedFiberEnd = (ribbon - 1) * ribbonSize + strandEnd;

    if (feedSelectionDialog.circuitId) {
      toggleSplicedMutation.mutate({
        circuitId: feedSelectionDialog.circuitId,
        feedCableId: selectedFeedCableId,
        feedFiberStart,
        feedFiberEnd,
      });
    }
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

    createCircuitMutation.mutate({
      cableId: cable.id,
      circuitId: circuitId.trim(),
    });
  };

  const totalAssignedFibers = useMemo(() => {
    return circuits.reduce((sum, circuit) => {
      return sum + (circuit.fiberEnd - circuit.fiberStart + 1);
    }, 0);
  }, [circuits]);

  const validationStatus = useMemo(() => {
    return totalAssignedFibers === cable.fiberCount;
  }, [totalAssignedFibers, cable.fiberCount]);

  const getRibbonAndStrandDisplay = (fiberStart: number, fiberEnd: number, ribbonSize: number) => {
    const startRibbon = Math.ceil(fiberStart / ribbonSize);
    const endRibbon = Math.ceil(fiberEnd / ribbonSize);
    
    const startStrand = ((fiberStart - 1) % ribbonSize) + 1;
    const endStrand = ((fiberEnd - 1) % ribbonSize) + 1;
    
    if (startRibbon === endRibbon) {
      return `R${startRibbon}: ${startStrand}-${endStrand}`;
    } else {
      const firstRibbonEnd = ribbonSize;
      const lastRibbonStart = 1;
      
      let result = `R${startRibbon}: ${startStrand}-${firstRibbonEnd}`;
      
      for (let ribbon = startRibbon + 1; ribbon < endRibbon; ribbon++) {
        result += ` / R${ribbon}: 1-${ribbonSize}`;
      }
      
      result += ` / R${endRibbon}: ${lastRibbonStart}-${endStrand}`;
      
      return result;
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
            <Badge variant="default" className="gap-1" data-testid="badge-validation-pass">
              <CheckCircle2 className="h-3 w-3" />
              Pass
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1" data-testid="badge-validation-fail">
              <XCircle className="h-3 w-3" />
              Fail
            </Badge>
          )}
          <span className="text-sm text-muted-foreground" data-testid="text-fiber-count">
            {totalAssignedFibers} / {cable.fiberCount} fibers
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
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
            <p className="text-xs text-muted-foreground mt-1">
              Fiber positions auto-calculated from circuit order
            </p>
          </div>
          <div className="flex items-end">
            <Button
              size="icon"
              data-testid="button-add-circuit"
              onClick={handleAddCircuit}
              disabled={createCircuitMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {circuits.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {cable.type === "Distribution" && (
                    <TableHead className="w-[10%]">Splice</TableHead>
                  )}
                  <TableHead className={cable.type === "Distribution" ? "w-[30%]" : "w-[40%]"}>Circuit ID</TableHead>
                  <TableHead className={cable.type === "Distribution" ? "w-[45%]" : "w-[45%]"}>Fiber Strands</TableHead>
                  <TableHead className="w-[15%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circuits.map((circuit) => {
                  const ribbonDisplay = getRibbonAndStrandDisplay(
                    circuit.fiberStart,
                    circuit.fiberEnd,
                    cable.ribbonSize
                  );
                  
                  return (
                    <TableRow key={circuit.id} data-testid={`row-circuit-${circuit.id}`}>
                      {cable.type === "Distribution" && (
                        <TableCell>
                          <Checkbox
                            checked={circuit.isSpliced === 1}
                            onCheckedChange={(checked) => handleCheckboxChange(circuit, checked as boolean)}
                            data-testid={`checkbox-spliced-${circuit.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm" data-testid={`text-circuit-id-${circuit.id}`}>
                        {circuit.circuitId}
                      </TableCell>
                      <TableCell className="font-mono text-sm" data-testid={`text-fiber-range-${circuit.id}`}>
                        {ribbonDisplay}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-delete-circuit-${circuit.id}`}
                          onClick={() => deleteCircuitMutation.mutate(circuit.id)}
                          disabled={deleteCircuitMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <Dialog open={feedSelectionDialog.open} onOpenChange={(open) => !open && setFeedSelectionDialog({ open: false, circuitId: null })}>
        <DialogContent data-testid="dialog-feed-selection">
          <DialogHeader>
            <DialogTitle>Select Feed Cable and Fiber Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feed-cable">Feed Cable</Label>
              <Select value={selectedFeedCableId} onValueChange={setSelectedFeedCableId}>
                <SelectTrigger id="feed-cable" data-testid="select-feed-cable">
                  <SelectValue placeholder="Select a Feed cable" />
                </SelectTrigger>
                <SelectContent>
                  {feedCables.map((feedCable) => (
                    <SelectItem key={feedCable.id} value={feedCable.id} data-testid={`option-feed-${feedCable.id}`}>
                      {feedCable.name} ({feedCable.fiberCount} fibers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-ribbon">Feed Ribbon</Label>
              <Input
                id="feed-ribbon"
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={feedRibbon}
                onChange={(e) => setFeedRibbon(e.target.value)}
                data-testid="input-feed-ribbon"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feed-strand-start">Start Strand</Label>
                <Input
                  id="feed-strand-start"
                  type="number"
                  min="1"
                  max="12"
                  placeholder="e.g., 9"
                  value={feedStrandStart}
                  onChange={(e) => setFeedStrandStart(e.target.value)}
                  data-testid="input-feed-strand-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-strand-end">End Strand</Label>
                <Input
                  id="feed-strand-end"
                  type="number"
                  min="1"
                  max="12"
                  placeholder="e.g., 12"
                  value={feedStrandEnd}
                  onChange={(e) => setFeedStrandEnd(e.target.value)}
                  data-testid="input-feed-strand-end"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFeedSelectionDialog({ open: false, circuitId: null });
                setSelectedFeedCableId("");
                setFeedRibbon("");
                setFeedStrandStart("");
                setFeedStrandEnd("");
              }}
              data-testid="button-cancel-feed-selection"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFeedSelection}
              disabled={toggleSplicedMutation.isPending}
              data-testid="button-confirm-feed-selection"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
