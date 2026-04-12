import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NO_IMAGE_RULE = `
CRITICAL RULE — NO IMAGE REFERENCES:
Do not generate any question that references a picture, image, diagram, or visual that must be displayed separately. All questions must be fully self-contained using only text and/or emoji.
For counting questions, display the objects to count directly in the question text using emoji (e.g. "🍎🍎🍎🍎 — How many apples are there?").
For pattern questions, show the pattern directly using emoji sequences (e.g. "🔴🔵🔴🔵❓ — What comes next?").
NEVER say "count the objects in the picture", "look at the image", "in the diagram", "as shown below", or any phrase implying a visual that is not directly rendered as text or emoji in the question.
For algebra/missing number questions, use variable letters (x, y, n) — NEVER use ⭐ or ☐ as variable symbols. Use × for multiplication, ÷ for division.`;

export async function POST(req: NextRequest) {
  try {
    const { skillArea, level, type = 'standard', skillLevels } = await req.json();

    let prompt: string;

    if (type === 'weekly') {
      prompt = `Generate a 20-question standardized practice assessment for a 5-year-old preparing for private school admissions testing (CATS assessment style). 4 questions from each of these 5 skill areas:

1. Word Wizard (Verbal/Vocabulary) - Level ${skillLevels?.word_wizard || 1}
2. Pattern Detective (Visual/Logical Patterns) - Level ${skillLevels?.pattern_detective || 1}
3. Math Explorer (Number Sense/Arithmetic) - Level ${skillLevels?.math_explorer || 1}
4. Memory Master (Working Memory) - Level ${skillLevels?.memory_master || 1}
5. Confidence Coach (Social/Emotional) - Level ${skillLevels?.confidence_coach || 1}

IMPORTANT: Use formal, neutral, test-appropriate language. NOT game language.
Example WRONG: "Wes, which one doesn't belong? 🎉"
Example RIGHT: "Which item does not belong in this group?"

${NO_IMAGE_RULE}

Each question must have exactly 4 answer choices labeled (A), (B), (C), (D).

Return a JSON array of 20 objects, each with:
- "question": the question in formal assessment language
- "choices": array of 4 answer strings
- "correct_answer": the correct answer string (must match one of the choices exactly)
- "skill_area": one of "word_wizard", "pattern_detective", "math_explorer", "memory_master", "confidence_coach"

Order: first 4 word_wizard, next 4 pattern_detective, next 4 math_explorer, next 4 memory_master, last 4 confidence_coach.
Return ONLY valid JSON array, no markdown.`;
    } else {
      prompt = `Generate a 10-question standardized practice assessment for a 5-year-old at difficulty Level ${level} in the "${skillArea}" skill area.

Skill areas and what they test:
- word_wizard: vocabulary, verbal reasoning, word categories, riddles
- pattern_detective: visual patterns using emoji sequences, sorting rules
- math_explorer: counting with emoji, comparison, missing numbers using variable letters (x, y, n), word problems
- memory_master: recall, sequence memory, story comprehension
- confidence_coach: social scenarios, greetings, handling uncertainty

Generate 6 questions from "${skillArea}" and 4 questions from other random skill areas.

IMPORTANT: Use formal, neutral, test-appropriate language. NOT game language.
Example WRONG: "Hey Wes! Which one doesn't belong? 🎉"
Example RIGHT: "Which item does not belong in this group?"

${NO_IMAGE_RULE}

Each question must have exactly 4 answer choices.

Return a JSON array of 10 objects, each with:
- "question": the question in formal assessment language
- "choices": array of 4 answer strings
- "correct_answer": the correct answer string (must match one of the choices exactly)
- "skill_area": the skill area this question tests

Return ONLY valid JSON array, no markdown.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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

    return NextResponse.json({ questions: parsed });
  } catch (error) {
    console.error('Assessment API error:', error);
    return NextResponse.json({ error: 'Failed to generate assessment' }, { status: 500 });
  }
}
