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
import { Plus, Cable as CableIcon, Network, Search } from "lucide-react";
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
  const [deletingCable, setDeletingCable] = useState<Cable | null>(null);
  const [cableSearchTerm, setCableSearchTerm] = useState("");

  const { data: cables = [], isLoading: cablesLoading } = useQuery<Cable[]>({
    queryKey: ["/api/cables"],
  });

  const { data: allCircuits = [], isLoading: circuitsLoading } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits"],
  });

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
      setDeletingCable(null);
      toast({ title: "Cable deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete cable", variant: "destructive" });
    },
  });

  const handleCableSubmit = (data: InsertCable) => {
    if (editingCable) {
      updateCableMutation.mutate({ id: editingCable.id, data });
    } else {
      createCableMutation.mutate(data);
    }
  };

  const filteredCables = useMemo(() => {
    if (!cableSearchTerm) return cables;
    const searchLower = cableSearchTerm.toLowerCase();
    return cables.filter(
      (cable) =>
        cable.name.toLowerCase().includes(searchLower) ||
        cable.type.toLowerCase().includes(searchLower)
    );
  }, [cables, cableSearchTerm]);

  const splicedCircuits = useMemo(() => {
    return allCircuits.filter((circuit) => circuit.isSpliced === 1);
  }, [allCircuits]);

  const selectedCable = cables.find((c) => c.id === selectedCableId);

  const feedCables = filteredCables.filter((c) => c.type === "Feed");
  const distributionCables = filteredCables.filter((c) => c.type === "Distribution");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Fiber Splice Manager</h1>
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
            <TabsTrigger value="splice" data-testid="tab-splice">
              <Network className="h-4 w-4 mr-2" />
              Splice
            </TabsTrigger>
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

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cables by name or type..."
                    value={cableSearchTerm}
                    onChange={(e) => setCableSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-cables"
                  />
                </div>

                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-2">
                    {cablesLoading ? (
                      <div className="text-center py-12 text-muted-foreground">Loading cables...</div>
                    ) : cables.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-cables">
                        No cables yet. Add a cable to get started.
                      </div>
                    ) : filteredCables.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-results">
                        No cables match your search.
                      </div>
                    ) : (
                      filteredCables.map((cable) => (
                        <CableCard
                          key={cable.id}
                          cable={cable}
                          isSelected={selectedCableId === cable.id}
                          onSelect={() => setSelectedCableId(cable.id)}
                          onEdit={() => {
                            setEditingCable(cable);
                            setCableDialogOpen(true);
                          }}
                          onDelete={() => setDeletingCable(cable)}
                        />
                      ))
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
                            <span className="text-muted-foreground">Fiber Count:</span>
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

          <TabsContent value="splice">
            <Card>
              <CardHeader>
                <CardTitle>Splice Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                {circuitsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading circuits...</div>
                ) : splicedCircuits.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-spliced-circuits">
                    No circuits marked as spliced yet. Check Distribution circuits in the InputData tab.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/3">Feed Cable | Ribbon | Strand</TableHead>
                          <TableHead className="w-1/3 text-center">Circuit</TableHead>
                          <TableHead className="w-1/3 text-right">Distribution Cable | Ribbon | Strand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {splicedCircuits.map((circuit) => {
                          const distributionCable = cables.find((c) => c.id === circuit.cableId);
                          const feedCable = circuit.feedCableId ? cables.find((c) => c.id === circuit.feedCableId) : undefined;
                          
                          // Calculate ribbon and strand for distribution circuit
                          const ribbonSize = 12;
                          const getRibbonNumber = (fiberStart: number) => Math.ceil(fiberStart / ribbonSize);
                          const getFiberPositionInRibbon = (fiber: number) => ((fiber - 1) % ribbonSize) + 1;
                          
                          const distStartRibbon = getRibbonNumber(circuit.fiberStart);
                          const distEndRibbon = getRibbonNumber(circuit.fiberEnd);
                          const distStartStrand = getFiberPositionInRibbon(circuit.fiberStart);
                          const distEndStrand = getFiberPositionInRibbon(circuit.fiberEnd);
                          
                          let distRibbonDisplay = "";
                          if (distStartRibbon === distEndRibbon) {
                            distRibbonDisplay = `R${distStartRibbon}: ${distStartStrand}-${distEndStrand}`;
                          } else {
                            const firstRibbonEnd = ribbonSize;
                            const lastRibbonStart = 1;
                            distRibbonDisplay = `R${distStartRibbon}:${distStartStrand}-${firstRibbonEnd} / R${distEndRibbon}:${lastRibbonStart}-${distEndStrand}`;
                          }
                          
                          // Parse circuit ID to get count
                          const circuitIdParts = circuit.circuitId.split(',');
                          const circuitPrefix = circuitIdParts[0] || "";
                          const fiberCount = circuit.fiberEnd - circuit.fiberStart + 1;
                          
                          return (
                            <TableRow key={circuit.id} data-testid={`row-spliced-circuit-${circuit.id}`}>
                              <TableCell className="font-mono text-sm" data-testid={`text-feed-info-${circuit.id}`}>
                                {feedCable ? (
                                  <div>
                                    <div className="font-medium">{feedCable.name}</div>
                                    <div className="text-muted-foreground text-xs mt-1">
                                      (Feed cable details)
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No feed cable</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center" data-testid={`text-circuit-info-${circuit.id}`}>
                                <div className="font-mono text-sm">
                                  <div className="font-medium">Circuit {circuitPrefix}</div>
                                  <div className="text-muted-foreground text-xs mt-1">{fiberCount} fibers</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm" data-testid={`text-dist-info-${circuit.id}`}>
                                <div>
                                  <div className="font-medium">{distributionCable?.name || "Unknown"}</div>
                                  <div className="text-muted-foreground text-xs mt-1">{distRibbonDisplay}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
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

      <AlertDialog open={!!deletingCable} onOpenChange={() => setDeletingCable(null)}>
        <AlertDialogContent data-testid="dialog-delete-cable">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCable?.name}"? This will also delete all
              associated circuits. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-cable">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCable && deleteCableMutation.mutate(deletingCable.id)}
              data-testid="button-confirm-delete-cable"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
