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
