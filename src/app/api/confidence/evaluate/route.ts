import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sub_game, scenario, spoken_response, confidence_score, personal_detail_count, level, context } = await req.json();
    const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

    if (!anthropic || !spoken_response) {
      return NextResponse.json({
        quality: spoken_response ? 'good' : 'needs_encouragement',
        content_rating: 'other',
        feedback_text: spoken_response ? 'Great effort, Wes!' : "Let's try again — speak up!",
        volume_feedback: '',
        model_answer: "Hi! I'm Wes and I love animals!",
        tts_feedback: spoken_response ? 'Great effort, Wes!' : "Let's try once more!",
        try_again: !spoken_response,
        trigger_outstanding: false,
      });
    }

    const prompt = `You are an encouraging coach helping a 5-year-old boy named Wes build social confidence for private school admissions interviews.

Scenario: "${scenario}"
Wes said: "${spoken_response}"
Sub-game: ${sub_game}
Voice confidence: ${confidence_score}
Personal details shared: ${personal_detail_count}
Level: ${level}
Context: ${context}

CRITICAL: Be VERY generous. Any genuine attempt = praise. Frame challenges as adventures. Never punishing.
For Meet & Greet: highest praise when Wes says name AND shares personal details.

Return ONLY JSON:
{
  "quality": "outstanding" | "excellent" | "good" | "needs_encouragement",
  "content_rating": "name_plus_multiple" | "name_plus_one" | "name_only" | "other" | "no_response",
  "feedback_text": "2 sentences warm specific feedback referencing what Wes said",
  "volume_feedback": "1 sentence about voice confidence",
  "model_answer": "example including name and personal detail",
  "tts_feedback": "what to read aloud",
  "try_again": false,
  "trigger_outstanding": true/false
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    return NextResponse.json(match ? JSON.parse(match[0]) : { quality: 'good', tts_feedback: 'Good try!', try_again: false, trigger_outstanding: false });
  } catch {
    return NextResponse.json({ quality: 'good', tts_feedback: 'Good try, Wes!', try_again: false, trigger_outstanding: false });
  }
}
