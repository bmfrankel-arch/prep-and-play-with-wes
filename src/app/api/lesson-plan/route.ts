import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { focusAreas, levels } = await req.json();

    const areaDescriptions = focusAreas.map((area: string) => {
      const names: Record<string, string> = {
        word_wizard: 'Word Wizard (Verbal & Vocabulary)',
        pattern_detective: 'Pattern Detective (Visual & Logical Patterns)',
        memory_master: 'Memory Master (Working Memory)',
        math_explorer: 'Math Explorer (Number Sense & Arithmetic)',
        confidence_coach: 'Confidence Coach (Social & Emotional Readiness)',
        story_builder: 'Story Builder (Sentence Construction & Narrative)',
      };
      return `${names[area] || area} - Current Level: ${levels?.[area] || 1}`;
    }).join('\n');

    const prompt = `Generate a 5-day lesson plan (Monday through Friday) for a 5-year-old boy named Wes who is preparing for Dallas private school admissions (St. Mark's School of Texas, Greenhill School). He'll be applying for 1st grade entry.

Focus areas for this week:
${areaDescriptions}

Each day should have ONE 15-minute activity with:
- Clear parent instructions (step by step)
- Uses only real household items — no special materials needed
- Age-appropriate and fun
- A "Quick Tips for Today" box with 2-3 practical tips

Return a JSON array of 5 objects (one per day), each with:
- "day": "Monday", "Tuesday", etc.
- "activity": activity title
- "instructions": detailed parent instructions (2-3 paragraphs)
- "quick_tips": 2-3 practical tips as a single string with bullet points
- "materials": what household items are needed

Story Builder activities include: building sentences from word cards, arranging words in different orders, completing sentence starters, identifying subjects and actions, creating 3-sentence stories about their day. Use paper, crayons, and conversation only.

Make activities engaging, playful, and educational. Reference kitchen items, toys, books, outdoor spaces, etc.
Return ONLY valid JSON array, no markdown.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
    }

    return NextResponse.json({ plan: parsed });
  } catch (error) {
    console.error('Lesson plan API error:', error);
    return NextResponse.json({ error: 'Failed to generate lesson plan' }, { status: 500 });
  }
}
