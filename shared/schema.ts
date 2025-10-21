import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 25-pair copper cable color codes (tip/ring combinations)
// Tip colors: White, Red, Black, Yellow, Violet
// Ring colors: Blue, Orange, Green, Brown, Slate
export const pairColors = [
  { pair: 1, tip: "white", ring: "blue" },
  { pair: 2, tip: "white", ring: "orange" },
  { pair: 3, tip: "white", ring: "green" },
  { pair: 4, tip: "white", ring: "brown" },
  { pair: 5, tip: "white", ring: "slate" },
  { pair: 6, tip: "red", ring: "blue" },
  { pair: 7, tip: "red", ring: "orange" },
  { pair: 8, tip: "red", ring: "green" },
  { pair: 9, tip: "red", ring: "brown" },
  { pair: 10, tip: "red", ring: "slate" },
  { pair: 11, tip: "black", ring: "blue" },
  { pair: 12, tip: "black", ring: "orange" },
  { pair: 13, tip: "black", ring: "green" },
  { pair: 14, tip: "black", ring: "brown" },
  { pair: 15, tip: "black", ring: "slate" },
  { pair: 16, tip: "yellow", ring: "blue" },
  { pair: 17, tip: "yellow", ring: "orange" },
  { pair: 18, tip: "yellow", ring: "green" },
  { pair: 19, tip: "yellow", ring: "brown" },
  { pair: 20, tip: "yellow", ring: "slate" },
  { pair: 21, tip: "violet", ring: "blue" },
  { pair: 22, tip: "violet", ring: "orange" },
  { pair: 23, tip: "violet", ring: "green" },
  { pair: 24, tip: "violet", ring: "brown" },
  { pair: 25, tip: "violet", ring: "slate" },
] as const;

export type PairColor = typeof pairColors[number];

// Cable types
export const cableTypes = ["Feed", "Distribution"] as const;
export type CableType = typeof cableTypes[number];

// Cable table
export const cables = pgTable("cables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fiberCount: integer("fiber_count").notNull(), // Now represents pair count
  ribbonSize: integer("ribbon_size").notNull().default(25), // Now represents binder size (25 pairs per binder)
  type: text("type").notNull(),
});

// Circuits table - represents circuit IDs and pair assignments within a cable
// fiberStart and fiberEnd are auto-calculated based on circuit order (still named fiber for DB compatibility)
export const circuits = pgTable("circuits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cableId: varchar("cable_id").notNull(),
  circuitId: text("circuit_id").notNull(),
  position: integer("position").notNull(), // Order in the cable (0-indexed)
  fiberStart: integer("fiber_start").notNull(), // Auto-calculated (represents pair start)
  fiberEnd: integer("fiber_end").notNull(), // Auto-calculated (represents pair end)
  isSpliced: integer("is_spliced").notNull().default(0), // 0 = not spliced, 1 = spliced
  feedCableId: varchar("feed_cable_id"), // For Distribution cables: which Feed cable this maps to
  feedFiberStart: integer("feed_fiber_start"), // Which pair in feed cable (start)
  feedFiberEnd: integer("feed_fiber_end"), // Which pair in feed cable (end)
});

// Splice table - represents a connection between pairs of two cables
export const splices = pgTable("splices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceCableId: varchar("source_cable_id").notNull(),
  destinationCableId: varchar("destination_cable_id").notNull(),
  sourceRibbon: integer("source_ribbon").notNull(), // Now represents binder
  sourceStartFiber: integer("source_start_fiber").notNull(), // Now represents pair start
  sourceEndFiber: integer("source_end_fiber").notNull(), // Now represents pair end
  destinationRibbon: integer("destination_ribbon").notNull(), // Now represents binder
  destinationStartFiber: integer("destination_start_fiber").notNull(), // Now represents pair start
  destinationEndFiber: integer("destination_end_fiber").notNull(), // Now represents pair end
  ponStart: integer("pon_start"),
  ponEnd: integer("pon_end"),
  isCompleted: integer("is_completed").notNull().default(0),
});

// Saves table - stores project snapshots with date/time stamped names
export const saves = pgTable("saves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Date/time stamp (e.g., "2025-10-18 20:15:30")
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  data: text("data").notNull(), // JSON string containing cables and circuits
});

// Insert schemas
export const insertCableSchema = createInsertSchema(cables).omit({ 
  id: true,
  ribbonSize: true, // Always default to 25
}).extend({
  type: z.enum(cableTypes),
  circuitIds: z.array(z.string()).optional(), // Circuit IDs to create with cable
});
export const insertCircuitSchema = createInsertSchema(circuits).omit({ 
  id: true,
  position: true, // Auto-calculated
  fiberStart: true, // Auto-calculated
  fiberEnd: true, // Auto-calculated
  isSpliced: true, // Defaults to 0
  feedCableId: true, // Set when toggling splice status
});
export const insertSpliceSchema = createInsertSchema(splices).omit({ id: true }).refine(
  (data) => data.sourceStartFiber <= data.sourceEndFiber,
  {
    message: "Source start pair must be less than or equal to end pair",
    path: ["sourceEndFiber"],
  }
).refine(
  (data) => data.destinationStartFiber <= data.destinationEndFiber,
  {
    message: "Destination start pair must be less than or equal to end pair",
    path: ["destinationEndFiber"],
  }
).refine(
  (data) => {
    const sourceCount = data.sourceEndFiber - data.sourceStartFiber + 1;
    const destCount = data.destinationEndFiber - data.destinationStartFiber + 1;
    return sourceCount === destCount;
  },
  {
    message: "Source and destination pair ranges must be equal in size",
    path: ["destinationEndFiber"],
  }
);
export const insertSaveSchema = createInsertSchema(saves).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type InsertCable = z.infer<typeof insertCableSchema>;
export type Cable = typeof cables.$inferSelect;
export type InsertCircuit = z.infer<typeof insertCircuitSchema>;
export type Circuit = typeof circuits.$inferSelect;
export type InsertSplice = z.infer<typeof insertSpliceSchema>;
export type Splice = typeof splices.$inferSelect;
export type InsertSave = z.infer<typeof insertSaveSchema>;
export type Save = typeof saves.$inferSelect;

// Helper function to get pair color by index (0-24 for standard 25-pair binder)
export function getPairColor(pairIndex: number): PairColor {
  return pairColors[pairIndex % 25];
}

// Helper to get binder number for a given pair (1-indexed)
export function getBinderNumber(pairNumber: number, binderSize: number = 25): number {
  return Math.ceil(pairNumber / binderSize);
}

// Helper to get position within binder (0-24)
export function getPairPositionInBinder(pairNumber: number, binderSize: number = 25): number {
  return ((pairNumber - 1) % binderSize);
}

// Helper to parse circuit ID and extract pair count
// Examples: "lg,33-36" = 4 pairs, "b,1-2" = 2 pairs, "ks,219-228" = 10 pairs
export function parseCircuitId(circuitId: string): number {
  const match = circuitId.match(/(\d+)-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid circuit ID format: ${circuitId}`);
  }
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return end - start + 1;
}

// Helper to extract prefix and range from circuit ID
// Examples: "pon,1-8" => { prefix: "pon", rangeStart: 1, rangeEnd: 8 }
export function parseCircuitIdParts(circuitId: string): { prefix: string; rangeStart: number; rangeEnd: number } {
  const parts = circuitId.split(',');
  if (parts.length !== 2) {
    throw new Error(`Invalid circuit ID format: ${circuitId}`);
  }
  const prefix = parts[0].trim();
  const rangeMatch = parts[1].trim().match(/^(\d+)-(\d+)$/);
  if (!rangeMatch) {
    throw new Error(`Invalid circuit ID range format: ${circuitId}`);
  }
  return {
    prefix,
    rangeStart: parseInt(rangeMatch[1], 10),
    rangeEnd: parseInt(rangeMatch[2], 10),
  };
}

// Helper to check if two circuit IDs overlap
// Two circuits overlap if they have the same prefix AND their ranges overlap
// Examples: "pon,1-8" and "pon,8-12" overlap (both include 8)
//           "pon,1-8" and "pon,9-12" do NOT overlap
//           "pon,1-8" and "lg,1-8" do NOT overlap (different prefix)
export function circuitIdsOverlap(circuitId1: string, circuitId2: string): boolean {
  try {
    const parts1 = parseCircuitIdParts(circuitId1);
    const parts2 = parseCircuitIdParts(circuitId2);
    
    // Different prefixes = no overlap
    if (parts1.prefix !== parts2.prefix) {
      return false;
    }
    
    // Check if ranges overlap: range1 overlaps range2 if start1 <= end2 AND start2 <= end1
    return parts1.rangeStart <= parts2.rangeEnd && parts2.rangeStart <= parts1.rangeEnd;
  } catch {
    return false;
  }
}

// Helper to get CSS color class for tip/ring colors
export function getPairColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    white: "white",
    red: "red",
    black: "black",
    yellow: "yellow",
    violet: "violet",
    blue: "blue",
    orange: "orange",
    green: "green",
    brown: "brown",
    slate: "slate",
  };
  return colorMap[color] || color;
}
