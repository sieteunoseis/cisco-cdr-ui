import { Button } from "@/components/ui/button";
import type { SavedQuery } from "@/hooks/useSavedQueries";

interface SavedQueriesProps {
  queries: SavedQuery[];
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
}

export function SavedQueries({
  queries,
  onSelect,
  onDelete,
}: SavedQueriesProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Saved Queries
      </h3>
      <div className="overflow-y-auto max-h-[600px]">
        <div className="space-y-1">
          {queries.map((q) => (
            <div
              key={q.id}
              className="group flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
              onClick={() => onSelect(q.query)}
            >
              <span className="text-sm truncate">{q.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(q.id);
                }}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
