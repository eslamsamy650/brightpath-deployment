/**
 * Letter-grade helpers (same algorithm as TS original).
 */

function scoreToLetter(score, maxScore = 100) {
  const pct = (score / maxScore) * 100;
  if (pct >= 95) return 'A+';
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'B+';
  if (pct >= 80) return 'B';
  if (pct >= 75) return 'C+';
  if (pct >= 70) return 'C';
  if (pct >= 65) return 'D+';
  if (pct >= 60) return 'D';
  return 'F';
}

function letterToGpa(letter) {
  const map = {
    'A+': 4.0,
    A: 4.0,
    'B+': 3.5,
    B: 3.0,
    'C+': 2.5,
    C: 2.0,
    'D+': 1.5,
    D: 1.0,
    F: 0.0,
  };
  return map[letter] ?? 0;
}

function calculateGpa(grades) {
  if (grades.length === 0) return 0;
  const letters = grades.map(g => scoreToLetter(g.score, g.maxScore));
  const total = letters.reduce((sum, l) => sum + letterToGpa(l), 0);
  return Math.round((total / grades.length) * 100) / 100;
}

function toPercentage(score, maxScore) {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100 * 10) / 10;
}

module.exports = { scoreToLetter, letterToGpa, calculateGpa, toPercentage };
