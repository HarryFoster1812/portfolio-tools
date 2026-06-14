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
		id: "place-route",
		title: "Place & Route Visualiser",
		description:
			"Interactive exploration of placement, routing, and congestion in digital circuits.",
		href: "/place-route",
		tags: ["eda", "algorithms", "wasm", "hardware"],
		featured: true,
		status: "wip",
	},
];
