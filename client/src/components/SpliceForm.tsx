import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSpliceSchema, type InsertSplice, type Splice, type Cable } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpliceFormProps {
  cables: Cable[];
  splice?: Splice;
  onSubmit: (data: InsertSplice) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SpliceForm({ cables, splice, onSubmit, onCancel, isLoading }: SpliceFormProps) {
  const form = useForm<InsertSplice>({
    resolver: zodResolver(insertSpliceSchema),
    defaultValues: splice || {
      sourceCableId: "",
      destinationCableId: "",
      sourceRibbon: 1,
      sourceStartFiber: 1,
      sourceEndFiber: 25,
      destinationRibbon: 1,
      destinationStartFiber: 1,
      destinationEndFiber: 25,
      ponStart: undefined,
      ponEnd: undefined,
      isCompleted: 0,
    },
  });

  const sourceCableId = form.watch("sourceCableId");
  const destCableId = form.watch("destinationCableId");

  const sourceCable = cables.find((c) => c.id === sourceCableId);
  const destCable = cables.find((c) => c.id === destCableId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sourceCableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Cable</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-source-cable">
                      <SelectValue placeholder="Select cable" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cables.map((cable) => (
                      <SelectItem key={cable.id} value={cable.id} data-testid={`option-source-cable-${cable.id}`}>
                        {cable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destinationCableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Cable</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-destination-cable">
                      <SelectValue placeholder="Select cable" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cables.map((cable) => (
                      <SelectItem key={cable.id} value={cable.id} data-testid={`option-dest-cable-${cable.id}`}>
                        {cable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Source Pairs</h4>
            <FormField
              control={form.control}
              name="sourceRibbon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Binder</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={sourceCable ? Math.ceil(sourceCable.fiberCount / sourceCable.ribbonSize) : 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-source-binder"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceStartFiber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Pair</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={sourceCable?.fiberCount || 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-source-start-pair"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceEndFiber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Pair</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={sourceCable?.fiberCount || 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-source-end-pair"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Destination Pairs</h4>
            <FormField
              control={form.control}
              name="destinationRibbon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Binder</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={destCable ? Math.ceil(destCable.fiberCount / destCable.ribbonSize) : 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-dest-binder"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinationStartFiber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Pair</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={destCable?.fiberCount || 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-dest-start-pair"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinationEndFiber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Pair</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={destCable?.fiberCount || 1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-dest-end-pair"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ponStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PON Start (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 249"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-pon-start"
                  />
                </FormControl>
                <FormDescription>PON count range for this splice</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ponEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PON End (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 288"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-pon-end"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-splice"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-save-splice">
            {isLoading ? "Saving..." : splice ? "Update Splice" : "Create Splice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
