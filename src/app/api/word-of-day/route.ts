import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  try {
    const prompt = `Generate a single "Word of the Day" for a 5-year-old. Pick an interesting but learnable vocabulary word.

Return a JSON object with:
- "word": the word
- "definition": a simple, child-friendly one-sentence definition
- "example_sentence": a fun example sentence using the word
- "syllable_breakdown": the word broken into syllables with dots (e.g. "EL • e • phant")
- "fun_fact": a fun one-sentence fact related to the word

Pick from categories: nature, animals, science, feelings, actions, describing words.
Make it memorable and exciting for a 5-year-old.
Return ONLY valid JSON object, no markdown.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Word of day API error:', error);
    return NextResponse.json({ error: 'Failed to generate word of day' }, { status: 500 });
  }
}
