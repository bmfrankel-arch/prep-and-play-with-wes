// Generate fallback "Show Your Work" explanation when API doesn't return work_shown

export interface WorkShown {
  steps: string[];
  tts: string;
  equation_display?: string;
}

export function generateFallbackWorkShown(question: string, correctAnswer: string): WorkShown {
  const q = question.toLowerCase();
  const ans = correctAnswer;

  // Algebra: detect x, y, n variables
  if (/[xyn]\s*[+\-×÷=]|[+\-×÷=]\s*[xyn]/.test(question)) {
    // Try to parse: a + x = c
    const addMatch = question.match(/(\d+)\s*\+\s*[xyn]\s*=\s*(\d+)/);
    if (addMatch) {
      const a = addMatch[1], c = addMatch[2];
      return {
        steps: [`We need to find x`, `${a} + x = ${c}`, `x = ${c} - ${a}`, `x = ${ans}`],
        tts: `We need to find x. ${a} plus x equals ${c}. So x equals ${c} minus ${a}, which is ${ans}.`,
        equation_display: `${a} + ${ans} = ${c} ✓`,
      };
    }
    // x - b = c
    const subMatch = question.match(/[xyn]\s*-\s*(\d+)\s*=\s*(\d+)/);
    if (subMatch) {
      const b = subMatch[1], c = subMatch[2];
      return {
        steps: [`We need to find x`, `x - ${b} = ${c}`, `x = ${c} + ${b}`, `x = ${ans}`],
        tts: `We need to find x. x minus ${b} equals ${c}. So x equals ${c} plus ${b}, which is ${ans}.`,
        equation_display: `${ans} - ${b} = ${c} ✓`,
      };
    }
    // Generic algebra fallback
    return {
      steps: [`We need to find the missing number`, `The answer is ${ans}`],
      tts: `The answer is ${ans}.`,
    };
  }

  // Addition: look for "more", "altogether", "total", "and"
  if (q.includes('more') || q.includes('altogether') || q.includes('total') || q.includes('finds') || q.includes('gets') || q.includes('joins')) {
    const nums = question.match(/\d+/g);
    if (nums && nums.length >= 2) {
      const a = nums[0], b = nums[1];
      return {
        steps: [`We start with ${a}`, `We add ${b} more`, `${a} + ${b} = ${ans}`],
        tts: `We start with ${a}. Then we add ${b} more. ${a} plus ${b} equals ${ans}.`,
        equation_display: `${a} + ${b} = ${ans}`,
      };
    }
  }

  // Subtraction: look for "left", "away", "took", "gave", "fewer"
  if (q.includes('left') || q.includes('away') || q.includes('took') || q.includes('gave') || q.includes('fewer') || q.includes('ate') || q.includes('lost')) {
    const nums = question.match(/\d+/g);
    if (nums && nums.length >= 2) {
      const a = nums[0], b = nums[1];
      return {
        steps: [`We start with ${a}`, `We take away ${b}`, `${a} - ${b} = ${ans}`],
        tts: `We start with ${a}. Then we take away ${b}. ${a} minus ${b} equals ${ans}.`,
        equation_display: `${a} - ${b} = ${ans}`,
      };
    }
  }

  // Comparison: "which is more", "which is bigger"
  if (q.includes('which is more') || q.includes('which is bigger') || q.includes('which number')) {
    return {
      steps: [`Let's compare the numbers`, `The answer is ${ans}`],
      tts: `The answer is ${ans}. It is the bigger number!`,
    };
  }

  // Generic fallback
  return {
    steps: [`The answer is ${ans}`],
    tts: `The answer is ${ans}.`,
  };
}
