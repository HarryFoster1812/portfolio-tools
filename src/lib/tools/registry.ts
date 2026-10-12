import type { Tool } from "./types";

export const tools: Tool[] = [
  {
    id: "obdd",
    title: "OBDD Visualiser",
    description: "Interactive visualisation of Ordered Binary Decision Diagrams.",
    href: "/obdd",
    tags: ["visualisation", "algorithms", "wasm"],
    featured: false,
    status: "live",
	},
	{
		id: "cambio",
		title: "Cambio Probability Tool",
		description: "Track live game knowledge and calculate your probability of winning in Cambio",
		href: "/cambio",
		tags: ["games", "statistics", "probability", "visualisation"],
		featured: true,
		status: "live",
	},
];
