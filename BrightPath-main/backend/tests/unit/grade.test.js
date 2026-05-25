const {
  scoreToLetter,
  letterToGpa,
  calculateGpa,
  toPercentage,
} = require('../../src/utils/grade');

describe('scoreToLetter', () => {
  it('returns A+ for 95% and above', () => {
    expect(scoreToLetter(95)).toBe('A+');
    expect(scoreToLetter(100)).toBe('A+');
  });

  it('returns A for 90–94%', () => {
    expect(scoreToLetter(90)).toBe('A');
    expect(scoreToLetter(94)).toBe('A');
  });

  it('returns F for below 60%', () => {
    expect(scoreToLetter(59)).toBe('F');
    expect(scoreToLetter(0)).toBe('F');
  });

  it('handles custom maxScore', () => {
    expect(scoreToLetter(47.5, 50)).toBe('A+');
    expect(scoreToLetter(30, 50)).toBe('D');
  });
});

describe('letterToGpa', () => {
  it('returns 4.0 for A and A+', () => {
    expect(letterToGpa('A+')).toBe(4.0);
    expect(letterToGpa('A')).toBe(4.0);
  });

  it('returns 0.0 for F', () => {
    expect(letterToGpa('F')).toBe(0.0);
  });

  it('returns 0 for unknown letter', () => {
    expect(letterToGpa('X')).toBe(0);
  });
});

describe('calculateGpa', () => {
  it('returns 0 when no grades', () => {
    expect(calculateGpa([])).toBe(0);
  });

  it('correctly averages multiple grades', () => {
    const grades = [{ score: 95 }, { score: 85 }]; // A+ (4.0) and B+ (3.5)
    expect(calculateGpa(grades)).toBe(3.75);
  });
});

describe('toPercentage', () => {
  it('calculates correct percentage', () => {
    expect(toPercentage(40, 50)).toBe(80);
  });

  it('handles zero max', () => {
    expect(toPercentage(5, 0)).toBe(0);
  });
});
