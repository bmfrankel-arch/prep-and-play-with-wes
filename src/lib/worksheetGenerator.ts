export interface WorksheetProblem {
  display: string;
  tts: string;
  answer: number;
  hint: string;
  type: 'addition' | 'subtraction';
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const numWord = (n: number): string => {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  return words[n] || String(n);
};

export function generateAdditionWorksheet(level: 1 | 2 | 3, count: number): WorksheetProblem[] {
  const problems: WorksheetProblem[] = [];
  const used = new Set<string>();

  while (problems.length < count) {
    let a: number, b: number, answer: number, display: string, tts: string, hint: string;

    if (level === 1) {
      a = rand(0, 9); b = rand(0, 9);
      if (a + b > 10) continue;
      answer = a + b;
      display = `${a} + ${b} = __`;
      tts = `${numWord(a)} plus ${numWord(b)} equals what?`;
      hint = `Count up ${b} from ${a}!`;
    } else if (level === 2) {
      const variant = rand(0, 2);
      if (variant === 0) {
        a = rand(1, 12); b = rand(1, 12);
        if (a + b > 20) continue;
        answer = a + b;
        display = `${a} + ${b} = __`;
        tts = `${numWord(a)} plus ${numWord(b)} equals what?`;
        hint = `Count up from ${a}!`;
      } else if (variant === 1) {
        answer = rand(5, 20); a = rand(1, answer - 1); b = answer - a;
        display = `${a} + __ = ${answer}`;
        tts = `${numWord(a)} plus what equals ${numWord(answer)}?`;
        hint = `${answer} minus ${a} equals?`;
      } else {
        answer = rand(5, 20); b = rand(1, answer - 1); a = answer - b;
        display = `__ + ${b} = ${answer}`;
        tts = `What plus ${numWord(b)} equals ${numWord(answer)}?`;
        hint = `${answer} minus ${b} equals?`;
      }
    } else {
      const variant = rand(0, 3);
      if (variant === 0) {
        a = rand(1, 12); b = rand(1, 12);
        if (a + b > 20) continue;
        answer = a + b;
        display = `${a} + ${b} = __`;
        tts = `${numWord(a)} plus ${numWord(b)} equals what?`;
        hint = `Count up from ${a}!`;
      } else if (variant === 1) {
        answer = rand(5, 20); a = rand(1, answer - 1); b = answer - a;
        display = `${a} + __ = ${answer}`;
        tts = `${numWord(a)} plus what equals ${numWord(answer)}?`;
        hint = `${answer} minus ${a}!`;
      } else if (variant === 2) {
        a = rand(1, 8); b = rand(1, 8);
        const c = rand(1, Math.min(5, 20 - a - b));
        answer = a + b + c;
        if (answer > 20) continue;
        display = `${a} + ${b} + ${c} = __`;
        tts = `${numWord(a)} plus ${numWord(b)} plus ${numWord(c)} equals what?`;
        hint = `Add them one at a time!`;
      } else {
        a = rand(1, 12); b = rand(1, 12);
        if (a + b > 20) continue;
        answer = a + b;
        display = `__ = ${a} + ${b}`;
        tts = `What equals ${numWord(a)} plus ${numWord(b)}?`;
        hint = `Same as ${a} + ${b}!`;
      }
    }

    const key = display;
    if (used.has(key)) continue;
    used.add(key);
    problems.push({ display, tts, answer, hint, type: 'addition' });
  }

  return shuffle(problems);
}

export function generateSubtractionWorksheet(level: 1 | 2 | 3, count: number): WorksheetProblem[] {
  const problems: WorksheetProblem[] = [];
  const used = new Set<string>();

  while (problems.length < count) {
    let a: number, b: number, answer: number, display: string, tts: string, hint: string;

    if (level === 1) {
      a = rand(1, 10); b = rand(0, a);
      answer = a - b;
      display = `${a} - ${b} = __`;
      tts = `${numWord(a)} minus ${numWord(b)} equals what?`;
      hint = `Count back ${b} from ${a}!`;
    } else if (level === 2) {
      const variant = rand(0, 2);
      if (variant === 0) {
        a = rand(5, 20); b = rand(1, a);
        answer = a - b;
        display = `${a} - ${b} = __`;
        tts = `${numWord(a)} minus ${numWord(b)} equals what?`;
        hint = `Count back from ${a}!`;
      } else if (variant === 1) {
        a = rand(8, 20); answer = rand(1, a - 1); b = a - answer;
        display = `${a} - __ = ${answer}`;
        tts = `${numWord(a)} minus what equals ${numWord(answer)}?`;
        hint = `${a} minus ${answer} equals?`;
      } else {
        b = rand(1, 10); answer = rand(1, 10); a = answer + b;
        if (a > 20) continue;
        display = `__ - ${b} = ${answer}`;
        tts = `What minus ${numWord(b)} equals ${numWord(answer)}?`;
        hint = `${answer} plus ${b} equals?`;
      }
    } else {
      const variant = rand(0, 3);
      if (variant === 0) {
        a = rand(5, 20); b = rand(1, a);
        answer = a - b;
        display = `${a} - ${b} = __`;
        tts = `${numWord(a)} minus ${numWord(b)} equals what?`;
        hint = `Count back from ${a}!`;
      } else if (variant === 1) {
        a = rand(8, 20); answer = rand(1, a - 1); b = a - answer;
        display = `${a} - __ = ${answer}`;
        tts = `${numWord(a)} minus what equals ${numWord(answer)}?`;
        hint = `${a} minus ${answer}!`;
      } else if (variant === 2) {
        a = rand(5, 20); b = rand(1, a);
        answer = a - b;
        display = `__ = ${a} - ${b}`;
        tts = `What equals ${numWord(a)} minus ${numWord(b)}?`;
        hint = `Same as ${a} minus ${b}!`;
      } else {
        a = rand(10, 20); b = rand(1, 5); const c = rand(1, Math.min(5, a - b));
        answer = a - b - c;
        if (answer < 0) continue;
        display = `${a} - ${b} - ${c} = __`;
        tts = `${numWord(a)} minus ${numWord(b)} minus ${numWord(c)} equals what?`;
        hint = `Subtract one at a time!`;
      }
    }

    const key = display;
    if (used.has(key)) continue;
    used.add(key);
    problems.push({ display, tts, answer, hint, type: 'subtraction' });
  }

  return shuffle(problems);
}

export function generateMixedWorksheet(level: 3, count: number): WorksheetProblem[] {
  const half = Math.ceil(count / 2);
  const add = generateAdditionWorksheet(level, half);
  const sub = generateSubtractionWorksheet(level, count - half);
  return shuffle([...add, ...sub]);
}
