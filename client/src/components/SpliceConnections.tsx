import { useEffect, useRef, useState } from "react";
import { Cable, Splice, getPairColor, getPairPositionInBinder } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { getPairColorVariable } from "@/lib/fiberColors";

interface SpliceConnectionsProps {
  cables: Cable[];
  splices: Splice[];
  containerRef: React.RefObject<HTMLDivElement>;
  onToggleComplete: (splice: Splice) => void;
}

interface ConnectionPath {
  splice: Splice;
  path: string;
  color: string;
  midPoint: { x: number; y: number };
}

export function SpliceConnections({ cables, splices, containerRef, onToggleComplete }: SpliceConnectionsProps) {
  const [connections, setConnections] = useState<ConnectionPath[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const calculatePaths = () => {
      if (!containerRef.current) return;

      const newConnections: ConnectionPath[] = [];
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      splices.forEach((splice) => {
        const sourceCable = cables.find((c) => c.id === splice.sourceCableId);
        const destCable = cables.find((c) => c.id === splice.destinationCableId);
        
        if (!sourceCable || !destCable) return;

        const sourcePairElement = container.querySelector(
          `[data-testid="pair-${splice.sourceCableId}-${splice.sourceStartFiber}"]`
        );
        const destPairElement = container.querySelector(
          `[data-testid="pair-${splice.destinationCableId}-${splice.destinationStartFiber}"]`
        );

        if (!sourcePairElement || !destPairElement) return;

        const sourceRect = sourcePairElement.getBoundingClientRect();
        const destRect = destPairElement.getBoundingClientRect();

        const startX = sourceRect.right - containerRect.left;
        const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const endX = destRect.left - containerRect.left;
        const endY = destRect.top + destRect.height / 2 - containerRect.top;

        const controlX1 = startX + (endX - startX) * 0.3;
        const controlX2 = startX + (endX - startX) * 0.7;

        const path = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;

        const midX = startX + (endX - startX) / 2;
        const midY = startY + (endY - startY) / 2;

        const pairPosition = getPairPositionInBinder(splice.sourceStartFiber, sourceCable.ribbonSize);
        const pairColor = getPairColor(pairPosition);
        const colorVar = getPairColorVariable(pairColor.tip, pairColor.ring);

        newConnections.push({
          splice,
          path,
          color: colorVar.replace('pair-', ''),
          midPoint: { x: midX, y: midY },
        });
      });

      setConnections(newConnections);
    };

    calculatePaths();
    
    const resizeObserver = new ResizeObserver(calculatePaths);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [cables, splices, containerRef]);

  if (!containerRef.current || connections.length === 0) return null;

  const containerRect = containerRef.current.getBoundingClientRect();

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      style={{
        width: containerRect.width,
        height: containerRect.height,
        pointerEvents: "none",
      }}
    >
      <defs>
        {connections.map((conn, i) => (
          <marker
            key={`arrow-${i}`}
            id={`arrowhead-${i}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill={`hsl(var(--pair-${conn.color}))`}
              opacity="0.7"
            />
          </marker>
        ))}
      </defs>
      
      {connections.map((conn, i) => (
        <g key={conn.splice.id}>
          <path
            d={conn.path}
            stroke={`hsl(var(--pair-${conn.color}))`}
            strokeWidth="2"
            fill="none"
            opacity={conn.splice.isCompleted ? "0.9" : "0.4"}
            strokeDasharray={conn.splice.isCompleted ? "0" : "4 2"}
            markerEnd={`url(#arrowhead-${i})`}
            className="transition-all hover:opacity-100 hover:stroke-[3px]"
          />
          
          <foreignObject
            x={conn.midPoint.x - 12}
            y={conn.midPoint.y - 12}
            width="24"
            height="24"
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-center">
              <Checkbox
                checked={conn.splice.isCompleted === 1}
                onCheckedChange={() => onToggleComplete(conn.splice)}
                data-testid={`checkbox-splice-viz-${conn.splice.id}`}
                className="bg-background border-2"
              />
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}
