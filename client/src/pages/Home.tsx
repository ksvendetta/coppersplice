import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Cable, Circuit, InsertCable } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CableCard } from "@/components/CableCard";
import { CableForm } from "@/components/CableForm";
import { CableVisualization } from "@/components/CableVisualization";
import { CircuitManagement } from "@/components/CircuitManagement";
import { Plus, Cable as CableIcon, Workflow, Save, Upload, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Home() {
  const { toast } = useToast();
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [editingCable, setEditingCable] = useState<Cable | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const { data: cables = [], isLoading: cablesLoading } = useQuery<Cable[]>({
    queryKey: ["/api/cables"],
  });

  const { data: allCircuits = [], isLoading: circuitsLoading } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits"],
  });

  // Sort cables: Feed first, then Distribution (maintaining insertion order within each type)
  const sortedCables = useMemo(() => {
    const feedCables = cables.filter(c => c.type === "Feed");
    const distributionCables = cables.filter(c => c.type === "Distribution");
    return [...feedCables, ...distributionCables];
  }, [cables]);

  const createCableMutation = useMutation({
    mutationFn: async (data: InsertCable) => {
      return await apiRequest("POST", "/api/cables", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      setCableDialogOpen(false);
      toast({ title: "Cable created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create cable";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateCableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCable }) => {
      return await apiRequest("PUT", `/api/cables/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      setCableDialogOpen(false);
      setEditingCable(null);
      toast({ title: "Cable updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update cable";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const deleteCableMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/cables/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Cable deleted successfully" });
    },
    onError: (error: any) => {
      // If cable doesn't exist (404), still remove from UI
      if (error?.message?.includes("not found") || error?.message?.includes("404")) {
        queryClient.invalidateQueries({ queryKey: ["/api/cables"] });
        queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
        toast({ title: "Cable removed from display" });
      } else {
        toast({ title: "Failed to delete cable", variant: "destructive" });
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/reset", undefined);
    },
    onSuccess: async () => {
      // Force refetch to clear the UI
      await queryClient.refetchQueries({ queryKey: ["/api/cables"] });
      await queryClient.refetchQueries({ queryKey: ["/api/circuits"] });
      setSelectedCableId(null);
      setResetDialogOpen(false);
      toast({ title: "All data has been reset" });
    },
    onError: () => {
      toast({ title: "Failed to reset data", variant: "destructive" });
    },
  });

  const handleSaveClick = () => {
    setSaveFileName(""); // Clear previous filename
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    const projectData = {
      cables,
      circuits: allCircuits,
    };
    
    // Debug logging
    console.log('Saving project data:', {
      cablesCount: cables.length,
      circuitsCount: allCircuits.length,
      cables,
      circuits: allCircuits
    });
    
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Use user-provided filename or default
    const filename = saveFileName.trim() 
      ? `${saveFileName.trim()}.json`
      : `fiber-splice-project-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSaveDialogOpen(false);
    setSaveFileName("");
    
    toast({ 
      title: "Project saved", 
      description: `${cables.length} cable(s) and ${allCircuits.length} circuit(s) saved to file` 
    });
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        if (!projectData.cables || !projectData.circuits) {
          toast({ title: "Invalid project file format", variant: "destructive" });
          return;
        }
        
        console.log('Loading project data:', {
          cablesCount: projectData.cables.length,
          circuitsCount: projectData.circuits.length,
          cables: projectData.cables,
          circuits: projectData.circuits
        });
        
        // Clear ALL existing data first
        await apiRequest("DELETE", "/api/reset", undefined);
        
        // Use direct storage to restore exact state (preserving IDs, positions, etc.)
        const { storage } = await import("@/lib/storage");
        const { db } = await import("@/lib/db");
        
        // Restore cables and circuits with their original IDs and properties
        await db.cables.bulkAdd(projectData.cables);
        await db.circuits.bulkAdd(projectData.circuits);
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/cables"] });
        queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
        
        toast({ 
          title: "Project loaded successfully",
          description: `${projectData.cables.length} cable(s) and ${projectData.circuits.length} circuit(s) restored`
        });
      } catch (error) {
        console.error('Load error:', error);
        toast({ title: "Failed to load project file", variant: "destructive" });
      }
    };
    input.click();
  };

  const handleCableSubmit = (data: InsertCable) => {
    if (editingCable) {
      updateCableMutation.mutate({ id: editingCable.id, data });
    } else {
      createCableMutation.mutate(data);
    }
  };


  const splicedCircuits = useMemo(() => {
    return allCircuits.filter((circuit) => {
      const cable = cables.find(c => c.id === circuit.cableId);
      return circuit.isSpliced === 1 && cable?.type === "Distribution";
    });
  }, [allCircuits, cables]);

  // Get all Distribution cables for creating splice tabs
  const distributionCables = useMemo(() => {
    return cables.filter(c => c.type === "Distribution");
  }, [cables]);

  const selectedCable = cables.find((c) => c.id === selectedCableId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Copper Splice Manager</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoad}
                data-testid="button-load"
              >
                <Upload className="h-4 w-4 mr-2" />
                Load
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveClick}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Tabs defaultValue="input" className="w-full">
          <TabsList className="mb-6" data-testid="tabs-main">
            <TabsTrigger value="input" data-testid="tab-input-data">
              <CableIcon className="h-4 w-4 mr-2" />
              InputData
            </TabsTrigger>
            {distributionCables.map((distCable) => (
              <TabsTrigger 
                key={distCable.id} 
                value={`splice-${distCable.id}`} 
                data-testid={`tab-splice-${distCable.id}`}
              >
                <Workflow className="h-4 w-4 mr-2" />
                Splice {distCable.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Cables</h2>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCable(null);
                      setCableDialogOpen(true);
                    }}
                    data-testid="button-add-cable"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cable
                  </Button>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {cablesLoading ? (
                      <div className="text-center py-12 text-muted-foreground">Loading cables...</div>
                    ) : sortedCables.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-cables">
                        No cables yet. Add a cable to get started.
                      </div>
                    ) : (
                      sortedCables.map((cable) => {
                        const cableCircuits = allCircuits.filter(c => c.cableId === cable.id);
                        const totalAssignedFibers = cableCircuits.reduce((sum, circuit) => {
                          return sum + (circuit.fiberEnd - circuit.fiberStart + 1);
                        }, 0);
                        const isValid = totalAssignedFibers === cable.fiberCount;
                        
                        return (
                          <CableCard
                            key={cable.id}
                            cable={cable}
                            isSelected={selectedCableId === cable.id}
                            onSelect={() => setSelectedCableId(cable.id)}
                            onEdit={() => {
                              setEditingCable(cable);
                              setCableDialogOpen(true);
                            }}
                            onDelete={() => deleteCableMutation.mutate(cable.id)}
                            isValid={isValid}
                          />
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedCable ? `Cable: ${selectedCable.name}` : "Select a cable"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCable ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-2 font-medium">{selectedCable.type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cable Size:</span>
                            <span className="ml-2 font-mono font-medium">{selectedCable.fiberCount}</span>
                          </div>
                        </div>

                        <CircuitManagement cable={selectedCable} />
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        Select a cable from the list to view details
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {distributionCables.map((distCable) => {
            const cableSplicedCircuits = splicedCircuits.filter(c => c.cableId === distCable.id);
            
            // Check if all circuits use full binders (each circuit's pair count is a multiple of 25)
            const allFullBinders = cableSplicedCircuits.length > 0 && cableSplicedCircuits.every(circuit => {
              const pairCount = circuit.fiberEnd - circuit.fiberStart + 1;
              return pairCount % 25 === 0;
            });
            
            // Calculate total number of splice rows
            const totalSpliceRows = allFullBinders 
              ? cableSplicedCircuits.reduce((sum, circuit) => {
                  const pairCount = circuit.fiberEnd - circuit.fiberStart + 1;
                  return sum + (pairCount / 25);
                }, 0)
              : cableSplicedCircuits.reduce((sum, circuit) => {
                  return sum + (circuit.fiberEnd - circuit.fiberStart + 1);
                }, 0);
            
            return (
              <TabsContent key={distCable.id} value={`splice-${distCable.id}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>Splice Mapping - {distCable.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {circuitsLoading ? (
                      <div className="text-center py-12 text-muted-foreground">Loading circuits...</div>
                    ) : cableSplicedCircuits.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid={`text-no-spliced-circuits-${distCable.id}`}>
                        No circuits marked as spliced yet for {distCable.name}. Check circuits in the InputData tab.
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead colSpan={allFullBinders ? 2 : 3} className="text-center font-semibold bg-green-100 dark:bg-green-950/50">Feed</TableHead>
                              <TableHead className="text-center font-semibold">Splices : {totalSpliceRows}</TableHead>
                              <TableHead colSpan={allFullBinders ? 2 : 3} className="text-center font-semibold bg-blue-100 dark:bg-blue-950/50">Distribution</TableHead>
                            </TableRow>
                            <TableRow>
                              <TableHead className="text-center">Cable</TableHead>
                              <TableHead className="text-center">Binder</TableHead>
                              {!allFullBinders && <TableHead className="text-center">Pair</TableHead>}
                              <TableHead className="text-center"></TableHead>
                              {!allFullBinders && <TableHead className="text-center">Pair</TableHead>}
                              <TableHead className="text-center">Binder</TableHead>
                              <TableHead className="text-center">Cable</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cableSplicedCircuits.flatMap((circuit, circuitIndex) => {
                              const distributionCable = cables.find((c) => c.id === circuit.cableId);
                              const feedCable = circuit.feedCableId ? cables.find((c) => c.id === circuit.feedCableId) : undefined;
                              
                              // Alternate background color based on circuit index
                              const rowBgColor = circuitIndex % 2 === 0 
                                ? "bg-white dark:bg-background" 
                                : "bg-gray-200 dark:bg-muted/50";
                              
                              if (!feedCable) {
                                return [(
                                  <TableRow key={circuit.id} className={rowBgColor} data-testid={`row-spliced-circuit-${circuit.id}`}>
                                    <TableCell colSpan={allFullBinders ? 5 : 7} className="text-center text-muted-foreground">
                                      Circuit {circuit.circuitId} in {distributionCable?.name} - No feed cable selected. Please re-check the circuit.
                                    </TableCell>
                                  </TableRow>
                                )];
                              }
                              
                              // 25-pair copper cable color codes (tip/ring combinations with actual color values)
                              const pairColors = [
                                { pair: 1, tip: "white", ring: "blue", tipColor: "#64748b", ringColor: "#3b82f6" },
                                { pair: 2, tip: "white", ring: "orange", tipColor: "#64748b", ringColor: "#f97316" },
                                { pair: 3, tip: "white", ring: "green", tipColor: "#64748b", ringColor: "#16a34a" },
                                { pair: 4, tip: "white", ring: "brown", tipColor: "#64748b", ringColor: "#b45309" },
                                { pair: 5, tip: "white", ring: "slate", tipColor: "#64748b", ringColor: "#64748b" },
                                { pair: 6, tip: "red", ring: "blue", tipColor: "#dc2626", ringColor: "#3b82f6" },
                                { pair: 7, tip: "red", ring: "orange", tipColor: "#dc2626", ringColor: "#f97316" },
                                { pair: 8, tip: "red", ring: "green", tipColor: "#dc2626", ringColor: "#16a34a" },
                                { pair: 9, tip: "red", ring: "brown", tipColor: "#dc2626", ringColor: "#b45309" },
                                { pair: 10, tip: "red", ring: "slate", tipColor: "#dc2626", ringColor: "#64748b" },
                                { pair: 11, tip: "black", ring: "blue", tipColor: "#0f172a", ringColor: "#3b82f6" },
                                { pair: 12, tip: "black", ring: "orange", tipColor: "#0f172a", ringColor: "#f97316" },
                                { pair: 13, tip: "black", ring: "green", tipColor: "#0f172a", ringColor: "#16a34a" },
                                { pair: 14, tip: "black", ring: "brown", tipColor: "#0f172a", ringColor: "#b45309" },
                                { pair: 15, tip: "black", ring: "slate", tipColor: "#0f172a", ringColor: "#64748b" },
                                { pair: 16, tip: "yellow", ring: "blue", tipColor: "#facc15", ringColor: "#3b82f6" },
                                { pair: 17, tip: "yellow", ring: "orange", tipColor: "#facc15", ringColor: "#f97316" },
                                { pair: 18, tip: "yellow", ring: "green", tipColor: "#facc15", ringColor: "#16a34a" },
                                { pair: 19, tip: "yellow", ring: "brown", tipColor: "#facc15", ringColor: "#b45309" },
                                { pair: 20, tip: "yellow", ring: "slate", tipColor: "#facc15", ringColor: "#64748b" },
                                { pair: 21, tip: "violet", ring: "blue", tipColor: "#9333ea", ringColor: "#3b82f6" },
                                { pair: 22, tip: "violet", ring: "orange", tipColor: "#9333ea", ringColor: "#f97316" },
                                { pair: 23, tip: "violet", ring: "green", tipColor: "#9333ea", ringColor: "#16a34a" },
                                { pair: 24, tip: "violet", ring: "brown", tipColor: "#9333ea", ringColor: "#b45309" },
                                { pair: 25, tip: "violet", ring: "slate", tipColor: "#9333ea", ringColor: "#64748b" },
                              ];
                              
                              const binderSize = 25;
                              const getBinderNumber = (pair: number) => Math.ceil(pair / binderSize);
                              const getPairPositionInBinder = (pair: number) => ((pair - 1) % binderSize) + 1;
                              const getColorForPair = (pairNum: number) => pairColors[(pairNum - 1) % 25];
                              const getColorForBinder = (binder: number) => pairColors[(binder - 1) % 25];
                              
                              // Parse circuit ID to get the circuit numbers
                              const circuitIdParts = circuit.circuitId.split(',');
                              const circuitPrefix = circuitIdParts[0] || "";
                              const circuitRange = circuitIdParts[1] || "";
                              const rangeParts = circuitRange.split('-');
                              
                              // Safety check for valid circuit ID format
                              if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
                                return [(
                                  <TableRow key={circuit.id} className={rowBgColor} data-testid={`row-spliced-circuit-${circuit.id}`}>
                                    <TableCell colSpan={allFullBinders ? 5 : 7} className="text-center text-muted-foreground">
                                      Circuit {circuit.circuitId} in {distributionCable?.name} - Invalid circuit ID format.
                                    </TableCell>
                                  </TableRow>
                                )];
                              }
                              
                              const rangeStart = parseInt(rangeParts[0].trim());
                              const rangeEnd = parseInt(rangeParts[1].trim());
                              
                              // Safety check for valid numbers
                              if (isNaN(rangeStart) || isNaN(rangeEnd)) {
                                return [(
                                  <TableRow key={circuit.id} className={rowBgColor} data-testid={`row-spliced-circuit-${circuit.id}`}>
                                    <TableCell colSpan={allFullBinders ? 5 : 7} className="text-center text-muted-foreground">
                                      Circuit {circuit.circuitId} in {distributionCable?.name} - Invalid circuit number range.
                                    </TableCell>
                                  </TableRow>
                                )];
                              }
                              
                              if (allFullBinders) {
                                // Full binder view: show based on actual pair positions
                                // Need to handle circuits that may span multiple binders
                                const binderRows = [];
                                
                                // Group pairs by binder for both feed and distribution
                                const distPairStart = circuit.fiberStart;
                                const distPairEnd = circuit.fiberEnd;
                                const feedPairStart = circuit.feedFiberStart || circuit.fiberStart;
                                const feedPairEnd = circuit.feedFiberEnd || circuit.fiberEnd;
                                
                                // Safety check for valid pair positions
                                if (!distPairStart || !distPairEnd || !feedPairStart || !feedPairEnd ||
                                    isNaN(distPairStart) || isNaN(distPairEnd) || isNaN(feedPairStart) || isNaN(feedPairEnd)) {
                                  return [(
                                    <TableRow key={circuit.id} className={rowBgColor} data-testid={`row-spliced-circuit-${circuit.id}`}>
                                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        Circuit {circuit.circuitId} in {distributionCable?.name} - Invalid pair positions.
                                      </TableCell>
                                    </TableRow>
                                  )];
                                }
                                
                                // Find which binders this circuit spans on distribution side
                                const distStartBinder = getBinderNumber(distPairStart);
                                const distEndBinder = getBinderNumber(distPairEnd);
                                
                                // Find which binders this circuit spans on feed side
                                const feedStartBinder = getBinderNumber(feedPairStart);
                                const feedEndBinder = getBinderNumber(feedPairEnd);
                                
                                // Process each group of pairs that share the same binder pair
                                let currentDistPair = distPairStart;
                                let currentFeedPair = feedPairStart;
                                
                                while (currentDistPair <= distPairEnd) {
                                  const currentDistBinder = getBinderNumber(currentDistPair);
                                  const currentFeedBinder = getBinderNumber(currentFeedPair);
                                  
                                  // Find end of current binder segment for distribution
                                  const distBinderEnd = currentDistBinder * binderSize;
                                  const distSegmentEnd = Math.min(distBinderEnd, distPairEnd);
                                  
                                  // Find end of current binder segment for feed
                                  const feedBinderEnd = currentFeedBinder * binderSize;
                                  const feedSegmentEnd = Math.min(feedBinderEnd, feedPairEnd);
                                  
                                  // Calculate how many pairs in this segment
                                  const distPairCount = distSegmentEnd - currentDistPair + 1;
                                  const feedPairCount = feedSegmentEnd - currentFeedPair + 1;
                                  const segmentPairCount = Math.min(distPairCount, feedPairCount);
                                  
                                  // Calculate circuit IDs for this segment
                                  const pairOffset = currentDistPair - distPairStart;
                                  const circuitStart = rangeStart + pairOffset;
                                  const circuitEnd = circuitStart + segmentPairCount - 1;
                                  
                                  // Get pair positions in binder
                                  const distPairPosStart = getPairPositionInBinder(currentDistPair);
                                  const distPairPosEnd = getPairPositionInBinder(currentDistPair + segmentPairCount - 1);
                                  const feedPairPosStart = getPairPositionInBinder(currentFeedPair);
                                  const feedPairPosEnd = getPairPositionInBinder(currentFeedPair + segmentPairCount - 1);
                                  
                                  const feedBinderColor = getColorForBinder(currentFeedBinder);
                                  const distBinderColor = getColorForBinder(currentDistBinder);
                                  
                                  const feedBinderGradient = {
                                    background: `linear-gradient(to right, 
                                      ${feedBinderColor.tipColor} 0%, 
                                      ${feedBinderColor.tipColor} 33%, 
                                      ${feedBinderColor.ringColor} 33%, 
                                      ${feedBinderColor.ringColor} 67%, 
                                      ${feedBinderColor.tipColor} 67%, 
                                      ${feedBinderColor.tipColor} 100%)`
                                  };
                                  const distBinderGradient = {
                                    background: `linear-gradient(to right, 
                                      ${distBinderColor.tipColor} 0%, 
                                      ${distBinderColor.tipColor} 33%, 
                                      ${distBinderColor.ringColor} 33%, 
                                      ${distBinderColor.ringColor} 67%, 
                                      ${distBinderColor.tipColor} 67%, 
                                      ${distBinderColor.tipColor} 100%)`
                                  };
                                  
                                  binderRows.push(
                                    <TableRow key={`${circuit.id}-segment-${currentDistPair}`} className={rowBgColor} data-testid={`row-binder-${circuit.id}-${currentDistPair}`}>
                                      <TableCell className="text-center font-mono text-sm">{feedCable.name} - {feedCable.fiberCount}</TableCell>
                                      <TableCell className="text-center font-mono font-semibold">
                                        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={feedBinderGradient}>
                                          B{currentFeedBinder}
                                        </span>
                                        :{feedPairPosStart}{feedPairPosStart !== feedPairPosEnd ? `-${feedPairPosEnd}` : ''}
                                      </TableCell>
                                      <TableCell className="text-center font-mono font-semibold">{circuitPrefix},{circuitStart}-{circuitEnd}</TableCell>
                                      <TableCell className="text-center font-mono font-semibold">
                                        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={distBinderGradient}>
                                          B{currentDistBinder}
                                        </span>
                                        :{distPairPosStart}{distPairPosStart !== distPairPosEnd ? `-${distPairPosEnd}` : ''}
                                      </TableCell>
                                      <TableCell className="text-center font-mono text-sm">{distributionCable?.name} - {distributionCable?.fiberCount}</TableCell>
                                    </TableRow>
                                  );
                                  
                                  // Move to next segment
                                  currentDistPair += segmentPairCount;
                                  currentFeedPair += segmentPairCount;
                                }
                                
                                return binderRows;
                              } else {
                                // Pair view: show one row per pair (original behavior)
                                const pairRows = [];
                                
                                // Safety check for valid pair positions
                                if (!circuit.fiberStart || !circuit.fiberEnd || isNaN(circuit.fiberStart) || isNaN(circuit.fiberEnd)) {
                                  return [(
                                    <TableRow key={circuit.id} className={rowBgColor} data-testid={`row-spliced-circuit-${circuit.id}`}>
                                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        Circuit {circuit.circuitId} in {distributionCable?.name} - Invalid pair positions.
                                      </TableCell>
                                    </TableRow>
                                  )];
                                }
                                
                                for (let i = 0; i < circuit.fiberEnd - circuit.fiberStart + 1; i++) {
                                  const distPair = circuit.fiberStart + i;
                                  const feedPair = (circuit.feedFiberStart || circuit.fiberStart) + i;
                                  
                                  const distBinder = getBinderNumber(distPair);
                                  const distPairInBinder = getPairPositionInBinder(distPair);
                                  const feedBinder = getBinderNumber(feedPair);
                                  const feedPairInBinder = getPairPositionInBinder(feedPair);
                                  
                                  const circuitNumber = rangeStart + i;
                                  const feedColor = getColorForPair(feedPairInBinder);
                                  const distColor = getColorForPair(distPairInBinder);
                                  const feedBinderColor = getColorForBinder(feedBinder);
                                  const distBinderColor = getColorForBinder(distBinder);
                                  
                                  const feedGradient = {
                                    background: `linear-gradient(to right, 
                                      ${feedColor.tipColor} 0%, 
                                      ${feedColor.tipColor} 33%, 
                                      ${feedColor.ringColor} 33%, 
                                      ${feedColor.ringColor} 67%, 
                                      ${feedColor.tipColor} 67%, 
                                      ${feedColor.tipColor} 100%)`
                                  };
                                  const distGradient = {
                                    background: `linear-gradient(to right, 
                                      ${distColor.tipColor} 0%, 
                                      ${distColor.tipColor} 33%, 
                                      ${distColor.ringColor} 33%, 
                                      ${distColor.ringColor} 67%, 
                                      ${distColor.tipColor} 67%, 
                                      ${distColor.tipColor} 100%)`
                                  };
                                  const feedBinderGradient = {
                                    background: `linear-gradient(to right, 
                                      ${feedBinderColor.tipColor} 0%, 
                                      ${feedBinderColor.tipColor} 33%, 
                                      ${feedBinderColor.ringColor} 33%, 
                                      ${feedBinderColor.ringColor} 67%, 
                                      ${feedBinderColor.tipColor} 67%, 
                                      ${feedBinderColor.tipColor} 100%)`
                                  };
                                  const distBinderGradient = {
                                    background: `linear-gradient(to right, 
                                      ${distBinderColor.tipColor} 0%, 
                                      ${distBinderColor.tipColor} 33%, 
                                      ${distBinderColor.ringColor} 33%, 
                                      ${distBinderColor.ringColor} 67%, 
                                      ${distBinderColor.tipColor} 67%, 
                                      ${distBinderColor.tipColor} 100%)`
                                  };
                                  
                                  pairRows.push(
                                    <TableRow key={`${circuit.id}-pair-${i}`} className={rowBgColor} data-testid={`row-pair-${circuit.id}-${i}`}>
                                      <TableCell className="text-center font-mono text-sm">{feedCable.name} - {feedCable.fiberCount}</TableCell>
                                      <TableCell className="text-center font-mono font-semibold">
                                        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={feedBinderGradient}>
                                          B{feedBinder}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="inline-block px-3 py-1 rounded border-2 border-black text-black font-mono font-semibold" style={feedGradient}>
                                          {feedPairInBinder}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center font-mono font-semibold">{circuitPrefix},{circuitNumber}</TableCell>
                                      <TableCell className="text-center">
                                        <div className="inline-block px-3 py-1 rounded border-2 border-black text-black font-mono font-semibold" style={distGradient}>
                                          {distPairInBinder}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center font-mono font-semibold">
                                        <span className="inline-block px-2 py-0.5 rounded border-2 border-black text-black font-mono font-semibold text-xs" style={distBinderGradient}>
                                          B{distBinder}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center font-mono text-sm">{distributionCable?.name} - {distributionCable?.fiberCount}</TableCell>
                                    </TableRow>
                                  );
                                }
                                
                                return pairRows;
                              }
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      <Dialog open={cableDialogOpen} onOpenChange={setCableDialogOpen}>
        <DialogContent data-testid="dialog-cable-form">
          <DialogHeader>
            <DialogTitle>{editingCable ? "Edit Cable" : "Add New Cable"}</DialogTitle>
          </DialogHeader>
          <CableForm
            cable={editingCable || undefined}
            onSubmit={handleCableSubmit}
            onCancel={() => {
              setCableDialogOpen(false);
              setEditingCable(null);
            }}
            isLoading={createCableMutation.isPending || updateCableMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent data-testid="dialog-reset-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all cables and circuits without saving. 
              This action cannot be undone.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-reset-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              data-testid="button-reset-confirm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent data-testid="dialog-save-filename">
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="filename" className="text-sm font-medium">
                Project Name (optional)
              </label>
              <Input
                id="filename"
                placeholder="e.g., Main Street Splice"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveConfirm();
                  }
                }}
                data-testid="input-save-filename"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use automatic timestamp
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setSaveFileName("");
              }}
              data-testid="button-save-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfirm}
              data-testid="button-save-confirm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
