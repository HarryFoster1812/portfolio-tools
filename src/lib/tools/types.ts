export type Tool = {
  id: string;
  title: string;
  description: string;
  href: string;
  featured: boolean=false;
  tags?: string[];
  status?: "live" | "wip" | "beta";
};
