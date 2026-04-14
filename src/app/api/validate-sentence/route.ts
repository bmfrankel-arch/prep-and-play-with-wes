import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sentence, wordBank, targetSentence, acceptableAlternatives, level = 1 } = await req.json();
    const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    if (!anthropic) {
      // Fallback: generate basic grammar breakdown client-side style
      return NextResponse.json({ valid: true, feedback: 'Great sentence!', grammar_breakdown: generateBasicBreakdown(sentence, wordBank) });
    }

    const levelTerms = level === 1 ? 'Use simple terms: "thing word" for noun, "action word" for verb, "describing word" for adjective, "helper word" for article.' :
      level === 2 ? 'Use both proper terms and simple terms: "NOUN — a thing word", "VERB — an action word".' :
      'Use proper grammatical terms as primary labels.';

    const prompt = `A 5-year-old child named Wes built this sentence: "${sentence}"

Target: "${targetSentence}"
${acceptableAlternatives?.length ? `Also acceptable: ${acceptableAlternatives.join(', ')}` : ''}
Words available: ${wordBank.map((w: { word: string }) => w.word).join(', ')}

1. Is this sentence grammatically correct? Reply with valid: true/false and feedback.
2. If valid, provide a grammar_breakdown array for each word with:
   - word, type (noun/verb/adjective/adverb/article/preposition/conjunction)
   - child_explanation (1-2 sentences explaining what this word does, addressed to Wes)
   - why_here (1 sentence explaining why this word goes in this position)

${levelTerms}

Reply with ONLY a JSON object:
{
  "valid": true/false,
  "feedback": "encouraging text",
  "grammar_breakdown": [
    {"word": "The", "type": "article", "child_explanation": "...", "why_here": "..."},
    ...
  ],
  "sentence_summary": "Our sentence has a WHO, a DOES WHAT, and a HOW!"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { valid: false, feedback: 'Try rearranging the words!' };

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ valid: false, feedback: 'Try rearranging the words!' });
  }
}

// Basic fallback breakdown when API is unavailable
function generateBasicBreakdown(sentence: string, wordBank: { word: string; type: string }[]) {
  const words = sentence.split(' ');
  return words.map(w => {
    const bankEntry = wordBank.find((b: { word: string }) => b.word.toLowerCase() === w.toLowerCase());
    const type = bankEntry?.type || 'article';
    const explanations: Record<string, string> = {
      noun: `${w} is a NOUN — a thing word! It's what our sentence is about!`,
      verb: `${w} is a VERB — an action word! It tells us what is happening!`,
      adjective: `${w} is an ADJECTIVE — a describing word! It paints a picture!`,
      article: `${w} is a helper word! It introduces the next word.`,
      adverb: `${w} is an ADVERB — it tells us HOW something happens!`,
      preposition: `${w} is a PREPOSITION — it tells us WHERE or WHEN!`,
      conjunction: `${w} is a CONJUNCTION — it joins two ideas together!`,
    };
    return {
      word: w,
      type,
      child_explanation: explanations[type] || `${w} is a word in our sentence!`,
      why_here: `${w} goes here to help our sentence make sense!`,
    };
  });
}
