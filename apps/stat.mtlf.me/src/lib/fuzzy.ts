export const fuzzyScore = (query: string, text: string): number => {
  if (query === "") return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      streak++;
      score += 1 + streak;
      qi++;
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return 0;
  return score / (t.length + q.length);
};

export interface IndicatorSearchFields {
  readonly id: number;
  readonly name: string;
  readonly description: string;
}

const codeMatchScore = (query: string, code: string): number => {
  const q = query.toLowerCase();
  const c = code.toLowerCase();
  if (q === c) return 3;
  if (c.startsWith(q)) return 2;
  return 0;
};

export const scoreIndicator = (query: string, indicator: IndicatorSearchFields): number => {
  const trimmed = query.trim();
  if (trimmed === "") return fuzzyScore("", indicator.name);
  const code = `I${indicator.id}`;
  const idScore = codeMatchScore(trimmed, code);
  const nameScore = fuzzyScore(trimmed, indicator.name);
  const descScore = fuzzyScore(trimmed, indicator.description);
  return Math.max(idScore, nameScore * 1.5, descScore);
};
