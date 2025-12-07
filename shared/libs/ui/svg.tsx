export function getEdgeStyle(kind: BuildGraph.GraphEdgeKind): {
  stroke: string;
  dashed?: boolean;
  markerId: string;
} {
  switch (kind) {
    case "flow":
      return {
        stroke: "#0e8a05",
        dashed: false, // ← 전부 false
        markerId: "arrow-solid",
      };
    case "state-dependency":
      return {
        stroke: "#EC4115",
        dashed: false,
        markerId: "arrow-muted",
      };
    case "state-mutation":
      return {
        stroke: "#8b5cf6",
        dashed: false,
        markerId: "arrow-accent",
      };
    case "state-link":
      return {
        stroke: "#4686df",
        dashed: false,
        markerId: "arrow-gray",
      };
    case "external":
    default:
      return {
        stroke: "#EC4115",
        dashed: false,
        markerId: "arrow-muted",
      };
  }
}
