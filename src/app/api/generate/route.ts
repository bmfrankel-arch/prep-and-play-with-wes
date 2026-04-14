import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { VOCABULARY_BANK } from '@/data/vocabulary';
import { getFallbackQuestions } from '@/data/fallbacks';

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function getVocabSample(level: number, count: number = 15): string {
  const eligible = VOCABULARY_BANK.filter(w => w.difficulty_level <= level);
  const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(w => `${w.word} (${w.syllable_breakdown}) — ${w.child_friendly_definition}`).join('\n');
}

export async function POST(req: NextRequest) {
  let skillArea = '', subGame = '', level = 1;

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    skillArea = body.skillArea;
    subGame = body.subGame;
    level = body.level || 1;
    const count = body.count || 1;

    const anthropic = getClient();
    if (!anthropic) {
      console.error('ANTHROPIC_API_KEY not set — returning fallback');
      const fallback = getFallbackQuestions(skillArea, subGame, level);
      if (fallback) return NextResponse.json({ questions: fallback, is_fallback: true });
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompts: Record<string, Record<string, string>> = {
      word_wizard: {
        riddles: `Generate ${count} riddle(s) for a ${level === 1 ? '5-year-old at beginner level. Use 2 clues, very familiar words (cat, apple, rain), and 3 answer choices' : level === 2 ? '5-year-old at intermediate level. Use 3 clues, moderately familiar words, and 4 answer choices' : '5-year-old at advanced level. Use inference and abstract questions (emotions, opposites, categories), and 4 answer choices'}.

For each riddle, return JSON array with objects containing:
- "clues": array of clue strings
- "choices": array of answer strings (one correct)
- "correct_answer": the correct answer string
- "syllable_breakdown": syllables separated by " • " with the stressed syllable in ALL CAPS (e.g. "ca • TER • pil • lar", "EL • e • phant", "hi • ber • NATE")
- "definition": a simple one-sentence child-friendly definition
- "example_sentence": a simple sentence using the word

Make clues fun, clear, and age-appropriate.

IMPORTANT: Prefer using words from this CATS-tuned vocabulary bank:
${getVocabSample(level, 10)}

Return ONLY valid JSON array, no markdown.`,

        story_finish: `Generate ${count} story completion exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "story": first 2 sentences of a short story (simple, fun, age-appropriate)
- "choices": array of 3 possible endings
- "correct_answer": the best ending
- "follow_up": a fun sentence that continues after the correct ending
- "explanation": why this ending makes the most sense

Stories should feature kids, animals, or fun adventures. Keep language simple.
Return ONLY valid JSON array, no markdown.`,

        word_categories: `Generate ${count} "which doesn't belong" exercise(s) for a 5-year-old at ${level === 1 ? 'beginner level with very obvious categories' : level === 2 ? 'intermediate level with moderately clear categories' : 'advanced level with subtle categories'}.

For each, return JSON array with objects containing:
- "question": "Which one doesn't belong?"
- "choices": array of ${level === 1 ? '4' : '5'} words where one doesn't fit the category
- "correct_answer": the word that doesn't belong
- "explanation": brief child-friendly explanation of why
- "syllable_breakdown": syllable breakdown of the odd-one-out word
- "definition": simple definition of the odd-one-out word
- "example_sentence": example sentence using the odd-one-out word

Use words from this CATS-tuned vocabulary bank when possible:
${getVocabSample(level, 10)}

Return ONLY valid JSON array, no markdown.`,
      },

      pattern_detective: {
        shape_sequences: `Generate ${count} challenging pattern sequence(s) for a 5-year-old at ${level === 1 ? 'Level 1: Use 3-element color repeats (🔴🔵🟢🔴🔵🟢❓), ABBA patterns, or shape alternating patterns. Never use simple 2-element alternating. Always vary the pattern type.' : level === 2 ? 'Level 2: Use TWO attributes changing simultaneously. Pattern types: growing quantity (2, 3, 4 circles — what is next?), direction rotation (⬆️➡️⬇️⬅️⬆️➡️❓), skip patterns (🔴🔴🔵🔴🔴🔵❓), decreasing quantity, mirror/symmetry patterns. Each question must use a DIFFERENT pattern type.' : 'Level 3: Use complex multi-rule patterns. Types: two interleaved sequences, doubling quantities (1,2,4,8), three attributes cycling, rule-change patterns (1 red 1 blue, 1 red 2 blue, 1 red 3 blue...), growing then color change. Distractors must be plausible — one step off or applying a simpler wrong rule.'}.

For each, return JSON array with objects containing:
- "emoji_pattern": the visible emoji pattern string with ❓ at the end
- "tts_reading": spoken description of the pattern WITHOUT emoji, describing each element clearly
- "choices": array of 4 emoji answer options
- "correct_answer": the correct emoji answer
- "explanation": 1-2 sentences explaining the pattern rule simply for a child
- "tts_explanation": spoken version of the explanation for text-to-speech

Use emojis: 🔴🔵🟢🟡🟣🟠⬛⬜🔷🔶🔺🔻⬆️➡️⬇️⬅️⭕
Make wrong choices plausible — never random unrelated options.
Return ONLY valid JSON array, no markdown.`,

        size_color_sorting: `Generate ${count} sorting/rule-finding exercise(s) for a 5-year-old at ${level === 1 ? 'Level 1: Sort by ONE attribute only (color or size). Find which item breaks the rule.' : level === 2 ? 'Level 2: Sort by TWO attributes simultaneously (color AND size, or color AND shape). Show 4-5 items where one breaks two rules. Ask which item does not belong and why.' : 'Level 3: Sort by THREE attributes (color, size, shape). Or find a hidden sorting rule from a sequence. Show items that could belong to multiple groups — child must identify the correct grouping.'}.

For each, return JSON array with objects containing:
- "question": describe the items and ask what the rule is or which does not belong
- "objects": array of 4-5 object descriptions (e.g. "big red circle", "small blue square")
- "choices": array of 3-4 answer options
- "correct_answer": the correct answer
- "explanation": clear child-friendly explanation of the sorting rule
- "tts_explanation": spoken version for text-to-speech

Return ONLY valid JSON array, no markdown.`,

        odd_one_out: `Generate ${count} odd-one-out exercise(s) for a 5-year-old at ${level === 1 ? 'Level 1: Clear category difference — all animals except one object, all fruits except one vehicle, etc.' : level === 2 ? 'Level 2: Subtle PROPERTY difference — things that can fly except one (eagle, butterfly, penguin, bee — penguin cannot fly), things that are alive except one, things you eat with except one (fork, spoon, knife, plate — plate is not utensil). Requires genuine reasoning not just visual categories.' : 'Level 3: Abstract PROPERTY difference — things that come in pairs except one (shoes, gloves, socks, hat), things that grow except one, things that can be opened except one, things bigger than a house except one. Requires abstract thinking.'}.

For each, return JSON array with objects containing:
- "question": "Which one is different?"
- "objects": array of 4 simple object names
- "choices": the 4 object names as answer choices
- "correct_answer": the odd one out
- "explanation": clear explanation of WHY it does not belong — must teach the reasoning
- "tts_explanation": spoken version for text-to-speech

Use objects from this list: apple, banana, orange, grape, strawberry, cherry, dog, cat, rabbit, bear, fox, tiger, lion, cow, pig, chicken, duck, frog, fish, butterfly, bee, car, bus, train, plane, boat, bicycle, house, tree, flower, sun, moon, star, cloud, rainbow, fire, snowflake, ball, book, pencil, scissors, hat, shoe, crown, cake, pizza, elephant, horse, bird, turtle, whale, dolphin, fork, spoon, knife, plate, gloves, socks, door, wall, pillow, rock
Return ONLY valid JSON array, no markdown.`,
      },

      memory_master: {
        remember_list: `Generate ${count} memory list exercise(s) for a 5-year-old at ${level === 1 ? 'beginner level. Use 3 words to remember, shown for 6 seconds, pick from 6 total choices' : level === 2 ? 'intermediate level. Use 4 words to remember, shown for 4 seconds, pick from 8 choices' : 'advanced level. Use 5 words to remember, shown for 3 seconds, must recall in correct order'}.

For each, return JSON array with objects containing:
- "words_to_remember": array of ${level === 1 ? '3' : level === 2 ? '4' : '5'} simple, concrete words to memorize
- "all_choices": array of ${level === 1 ? '6' : '8'} words (includes the words to remember plus distractors)
- "display_time": ${level === 1 ? '6' : level === 2 ? '4' : '3'} (seconds)
- "require_order": ${level === 3 ? 'true' : 'false'}

Use simple, concrete nouns a 5-year-old knows: cat, ball, tree, sun, hat, cup, fish, star, etc.
Return ONLY valid JSON array, no markdown.`,

        order_recall: `Generate ${count} order recall exercise(s) for a 5-year-old at ${level === 1 ? 'beginner level with 3 items' : level === 2 ? 'intermediate level with 4 items' : 'advanced level with 5 items'}.

For each, return JSON array with objects containing:
- "sequence": array of ${level === 1 ? '3' : level === 2 ? '4' : '5'} items to remember in order (use colored animals or objects like "red cat", "blue fish", "yellow bird")
- "display_time": ${level === 1 ? '5' : level === 2 ? '4' : '3'}

Use simple, distinct items a 5-year-old can easily visualize.
Return ONLY valid JSON array, no markdown.`,

        story_details: `Generate ${count} story comprehension exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "story": a ${level === 1 ? '3' : '4'}-sentence story using simple language
- "questions": array of 2 objects, each with:
  - "question": a recall question about the story
  - "choices": 3 answer options
  - "correct_answer": the correct answer

Stories should feature kids, animals, or everyday activities. Keep them fun and clear.
Return ONLY valid JSON array, no markdown.`,
      },

      math_explorer: {
        counting_adventures: `Generate ${count} math word problem(s) for a 5-year-old at ${level === 1 ? 'Level 1: Addition ONLY, numbers 1-20. Include emoji visuals. 4 answer choices.' : level === 2 ? 'Level 2: Addition and subtraction ONLY, numbers 1-50. Emoji visuals optional. 4 answer choices.' : 'Level 3: Addition and subtraction ONLY, numbers 1-100. May include two-step problems and "how many more/fewer" comparisons. 4 answer choices.'}.

CRITICAL RULES:
- NEVER use multiplication (no "times", "groups of", "rows of", "each has", "per", or repeated addition concepts)
- NEVER use division
- Level 1: addition only, numbers 1-20
- Level 2: addition and subtraction, numbers 1-50
- Level 3: addition and subtraction, numbers 1-100
- Frame as real-world stories: animals, food, toys, friends, nature

For each, return JSON array with objects containing:
- "question": a fun story-based word problem using ONLY addition and/or subtraction
- "choices": array of 4 number answers (as strings)
- "correct_answer": the correct number (as string)
- "explanation": step-by-step solution in child-friendly language
${level <= 2 ? '- "emoji_visual": emoji representation of the problem (e.g. "🍎🍎🍎 + 🍎🍎 = ?")' : ''}
- "work_shown": object with "steps" (array of 2-3 simple step strings showing working), "tts" (natural spoken explanation for text-to-speech), and optional "equation_display" (the key equation like "6 + 3 = 9")

Return ONLY valid JSON array, no markdown.`,

        more_or_less: `Generate ${count} comparison exercise(s) for a 5-year-old at ${level === 1 ? 'Level 1: Compare two numbers up to 100, ask which is more/less, how many more/fewer. Also include ordering 3 numbers least to greatest.' : level === 2 ? 'Level 2: Compare and order numbers up to 100. Use "how many more" and "how many fewer" (subtraction-based comparisons only — NEVER use "how many times more").' : 'Level 3: Place value comparisons (tens and ones), rounding to nearest 10, ordering 4-5 numbers. Use "how many more/fewer" only — never multiplication-based comparisons.'}.

For each, return JSON array with objects containing:
- "question": the comparison question
- "choices": array of 4 answer options (as strings)
- "correct_answer": correct answer (as string)
- "explanation": child-friendly explanation
- "work_shown": object with "steps" (array of 2-3 step strings), "tts" (natural spoken explanation)

Return ONLY valid JSON array, no markdown.`,

        algebra_puzzles: `Generate ${count} missing number puzzle(s) for a 5-year-old at ${level === 1 ? 'Level 1: Addition and subtraction only, numbers up to 20. Use __ (blank) for the unknown. e.g. "3 + __ = 8" or "__ - 4 = 5"' : level === 2 ? 'Level 2: Addition and subtraction only, numbers up to 20. Use __ (blank). Include missing-first, missing-middle, and missing-result variants.' : 'Level 3: Addition and subtraction up to 20. Also include simple sequences like "2, 4, __, 8". Use __ (blank) always.'}.

RULES:
- Use __ (double underscore) for the missing number — NEVER use x, y, n, or letter variables
- All numbers must be 20 or below
- Addition and subtraction ONLY (no multiplication or division)
- 4 answer choices per question

For each, return JSON array with objects containing:
- "question": equation with __ for blank (e.g. "3 + __ = 8")
- "choices": array of 4 number answers (as strings)
- "correct_answer": the correct number (as string)
- "explanation": filled-in equation (e.g. "3 + 5 = 8 — the missing number was 5!")
- "tts_reading": spoken version (e.g. "Three plus what equals eight? What number goes in the blank?")
- "work_shown": object with "steps" array and "tts" string

Return ONLY valid JSON array, no markdown.`,
      },

      confidence_coach: {
        meet_greet: `Generate ${count} social greeting scenario(s) for a 5-year-old preparing for a private school admissions interview at ${level === 1 ? 'beginner level: show scenario and a modeled answer' : level === 2 ? 'intermediate level: show scenario, let child answer first, then show model' : 'advanced level: open-ended prompt only, no choices'}.

For each, return JSON array with objects containing:
- "scenario": a realistic social scenario a 5-year-old might encounter at a school visit or with a new adult
- "suggested_answer": a confident, friendly response the child could give
- "explanation": why this is a good response (for parent)

Make scenarios warm and realistic: meeting a teacher, a new classmate, a school principal, a testing psychologist.
IMPORTANT: Always use the child's name "Wes" in suggested answers and scenarios. Never use placeholder text like "[child's name]" or "[name]".
Return ONLY valid JSON array, no markdown.`,

        what_would_you_do: `Generate ${count} social situation exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "scenario": an age-appropriate social situation at school or a new environment
- "choices": array of 3 responses — one kind/confident, one shy/passive, one unkind
- "correct_answer": the kind/confident response
- "explanation": child-friendly discussion of why the best answer works and what makes it kind

Scenarios: lunch table, playground, classroom, meeting new friends, sharing, taking turns.
Always use the child's name "Wes" — never "[child's name]" or placeholders.
Return ONLY valid JSON array, no markdown.`,

        i_dont_know: `Generate ${count} "tricky question" exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level. The goal is to teach that it's okay not to know an answer.

For each, return JSON array with objects containing:
- "question": a tricky or hard question that a 5-year-old might not know
- "choices": array of 3 options where one is always "I don't know, but I'll try!"
- "correct_answer": "I don't know, but I'll try!" (this is ALWAYS the best answer for these)
- "explanation": a warm message reinforcing that saying "I don't know" is brave and smart
- "actual_answer": the real answer to the tricky question (for learning)

Questions can be about science, geography, big numbers, or unusual facts.
Return ONLY valid JSON array, no markdown.`,
      },

      story_builder: {
        story_builder: `Generate a Story Builder session for a 5-year-old at ${level === 1 ? 'Level 1: 6 words in bank (4 needed + 2 distractors). Simple subject-verb-object sentences like "The dog runs fast". Only nouns, verbs, and one adjective.' : level === 2 ? 'Level 2: 8 words in bank (5 needed + 3 distractors). Sentences with adjectives and simple prepositions like "The big dog runs in the park". Multiple arrangements might work.' : 'Level 3: 10 words in bank (6-7 needed + 3-4 distractors). Complex sentences with conjunctions like "The brave dog found a bone and ran home". Multiple valid sentences accepted.'}.

Return a JSON object with:
- "theme": a fun story theme (e.g. "A brave dog goes on an adventure in the forest")
- "scene_description": 1-2 sentence scene setter to read aloud
- "scene_emoji": 2-3 relevant emojis
- "sentences": array of 3 objects, each with:
  - "target_sentence": the intended correct sentence
  - "word_bank": array of objects with "word" and "type" (noun/verb/adjective/article)
  - "acceptable_alternatives": array of other valid sentence arrangements
  - "hint": gentle hint if the child struggles

Make themes fun and child-friendly: animals, space, underwater, playground, magical forest.
Return ONLY valid JSON object (not array), no markdown.`,
      },
    };

    const prompt = prompts[skillArea]?.[subGame];
    if (!prompt) {
      return NextResponse.json({ error: 'Invalid skill area or sub-game' }, { status: 400 });
    }

    // Use lower max_tokens for faster responses — most game questions fit in 1200 tokens
    const tokenLimit = skillArea === 'story_builder' ? 2000 : 1200;
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: tokenLimit,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response, handling potential markdown wrapping
    let parsed;
    try {
      if (skillArea === 'story_builder') {
        // Story builder returns a single object — find the outermost { }
        const objMatch = text.match(/\{[\s\S]*\}/);
        parsed = objMatch ? JSON.parse(objMatch[0]) : JSON.parse(text);
      } else {
        // All other modes return arrays
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0]);
        } else {
          const objMatch = text.match(/\{[\s\S]*\}/);
          parsed = objMatch ? JSON.parse(objMatch[0]) : JSON.parse(text);
        }
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
    }

    if (skillArea === 'story_builder') {
      return NextResponse.json({ story: parsed });
    }
    return NextResponse.json({ questions: Array.isArray(parsed) ? parsed : [parsed] });
  } catch (error) {
    console.error('API generate error:', error);
    console.error('Details:', error instanceof Error ? error.message : JSON.stringify(error));

    // Return fallback content so the game still works
    const fallback = getFallbackQuestions(skillArea, subGame, level);
    if (fallback) {
      return NextResponse.json({ questions: fallback, is_fallback: true });
    }

    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
