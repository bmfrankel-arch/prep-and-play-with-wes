import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sentence, wordBank, targetSentence, acceptableAlternatives } = await req.json();

    const prompt = `A 5-year-old child built this sentence from a word bank: "${sentence}"

The target sentence was: "${targetSentence}"
${acceptableAlternatives?.length ? `Other acceptable versions: ${acceptableAlternatives.join(', ')}` : ''}
Available words were: ${wordBank.map((w: { word: string }) => w.word).join(', ')}

Is this sentence grammatically correct and thematically appropriate for a children's story?
Reply with ONLY a JSON object: {"valid": true/false, "feedback": "encouraging feedback string for the child"}
If valid, feedback should be celebratory. If invalid, give a gentle hint to rearrange.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
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
