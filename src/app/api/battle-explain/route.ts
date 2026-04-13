import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { winner, loser, terrain, winnerStats, loserStats, isTie } = await req.json();
    const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    if (!anthropic) return NextResponse.json({ explanation: 'What an incredible battle! Both animals fought bravely!' });

    const prompt = isTie
      ? `Write a 2-sentence exciting tie explanation for a 5-year-old in the style of the "Who Would Win?" book series. ${winner} and ${loser} fought to a tie in ${terrain}. Both were perfectly matched! Simple language, present tense. Max 40 words. Return plain text only.`
      : `Write a 2-sentence exciting battle explanation for a 5-year-old in the style of the "Who Would Win?" book series. ${winner} defeated ${loser} in ${terrain}. Winner stats: STR:${winnerStats.strength} SPD:${winnerStats.speed} DEF:${winnerStats.defense}. Loser stats: STR:${loserStats.strength} SPD:${loserStats.speed} DEF:${loserStats.defense}. Simple language, present tense, exciting. Max 40 words. Return plain text only.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    return NextResponse.json({ explanation: text });
  } catch {
    return NextResponse.json({ explanation: 'What an incredible battle! Both animals fought bravely!' });
  }
}
