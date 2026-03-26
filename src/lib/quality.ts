export type QualityGrade = "good" | "fair" | "poor" | "ungraded";

export function mosToGrade(mos: number | null | undefined): QualityGrade {
  if (mos == null) return "ungraded";
  if (mos >= 3.5) return "good";
  if (mos >= 3.0) return "fair";
  return "poor";
}

export function gradeColor(grade: QualityGrade): string {
  switch (grade) {
    case "good":
      return "text-green-500";
    case "fair":
      return "text-yellow-500";
    case "poor":
      return "text-red-500";
    case "ungraded":
      return "text-muted-foreground";
  }
}

export function gradeBadgeVariant(
  grade: QualityGrade,
): "default" | "secondary" | "destructive" | "outline" {
  switch (grade) {
    case "good":
      return "default";
    case "fair":
      return "secondary";
    case "poor":
      return "destructive";
    case "ungraded":
      return "outline";
  }
}
