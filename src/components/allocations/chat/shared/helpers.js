// ─── Fuzzy name matcher ───────────────────────────────────────────────────────
// Tries exact match first, then starts-with, then any word contains.
// Works for teachers, grades, and subjects.
export const matchName = (query, list) => {
  const q = query.toLowerCase().trim();

  let found = list.find((item) => item.name.toLowerCase() === q);
  if (found) return found;

  found = list.find((item) => item.name.toLowerCase().startsWith(q));
  if (found) return found;

  const words = q.split(/\s+/);
  found = list.find((item) =>
    words.some((w) => w.length > 2 && item.name.toLowerCase().includes(w)),
  );

  return found || null;
};

// ─── Get a teacher's current total load from allocations ──────────────────────
export const getLoad = (teacherId, allocations) =>
  allocations
    .filter((a) => a.teacherId === teacherId)
    .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

// ─── Get a teacher's maximum allowed load ─────────────────────────────────────
// Falls back to 30 if maxLoad is not set on the teacher document.
export const getMax = (teacher) => parseInt(teacher?.maxLoad) || 30;
