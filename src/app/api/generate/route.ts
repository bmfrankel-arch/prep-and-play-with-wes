import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { VOCABULARY_BANK } from '@/data/vocabulary';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getVocabSample(level: number, count: number = 15): string {
  const eligible = VOCABULARY_BANK.filter(w => w.difficulty_level <= level);
  const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(w => `${w.word} (${w.syllable_breakdown}) — ${w.child_friendly_definition}`).join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { skillArea, subGame, level, count = 1 } = await req.json();

    const prompts: Record<string, Record<string, string>> = {
      word_wizard: {
        riddles: `Generate ${count} riddle(s) for a ${level === 1 ? '5-year-old at beginner level. Use 2 clues, very familiar words (cat, apple, rain), and 3 answer choices' : level === 2 ? '5-year-old at intermediate level. Use 3 clues, moderately familiar words, and 4 answer choices' : '5-year-old at advanced level. Use inference and abstract questions (emotions, opposites, categories), and 4 answer choices'}.

For each riddle, return JSON array with objects containing:
- "clues": array of clue strings
- "choices": array of answer strings (one correct)
- "correct_answer": the correct answer string
- "syllable_breakdown": the answer broken into syllables with dots (e.g. "CAT • er • pil • lar")
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
        shape_sequences: `Generate ${count} shape/emoji pattern sequence(s) for a 5-year-old at ${level === 1 ? 'beginner level. Use simple 2-element repeating patterns (e.g. 🔴🔵🔴🔵❓) with obvious distractors' : level === 2 ? 'intermediate level. Use 3-element patterns with two changing attributes' : 'advanced level. Use complex multi-attribute patterns, 5-element sequences'}.

For each, return JSON array with objects containing:
- "emoji_pattern": the visible pattern string with ❓ at the end
- "choices": array of 3-4 emoji options
- "correct_answer": the correct emoji
- "explanation": why this emoji completes the pattern

Use these emojis: 🔴🔵🟢🟡🟣🟠⬛⬜🔷🔶🔺🔻⭐💜💚💛
Return ONLY valid JSON array, no markdown.`,

        size_color_sorting: `Generate ${count} size/color sorting exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "question": describe a set of objects with attributes and ask what comes next or what the rule is
- "objects": array of object descriptions (e.g. "big red ball", "small red ball")
- "choices": array of 3-4 answer options
- "correct_answer": the correct answer
- "explanation": child-friendly explanation

Use familiar objects: balls, stars, hearts, blocks, animals.
Return ONLY valid JSON array, no markdown.`,

        odd_one_out: `Generate ${count} visual odd-one-out exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "question": "Which one is different?"
- "objects": array of 4 object descriptions (3 share a property, 1 does not)
- "choices": the 4 object names as answer choices
- "correct_answer": the odd one out
- "explanation": why it's different

Properties: color, size, category, function, number of legs, etc.
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
        counting_adventures: `Generate ${count} math word problem(s) for a 5-year-old at ${level === 1 ? 'Level 1 (Explorer): Numbers up to 100, addition and subtraction, simple grouping/multiplication concepts. Include emoji visuals. 4 answer choices.' : level === 2 ? 'Level 2 (Adventurer): Multi-step word problems within 100, introduces simple multiplication and division through equal groups. 4 answer choices.' : 'Level 3 (Champion): Two-step word problems, numbers up to 100, all four operations, word problems only (no emoji visuals). 4 answer choices.'}.

For each, return JSON array with objects containing:
- "question": a fun story-based word problem
- "choices": array of 4 number answers (as strings)
- "correct_answer": the correct number (as string)
- "explanation": step-by-step solution in child-friendly language
${level <= 2 ? '- "emoji_visual": emoji representation of the problem (e.g. "🍎🍎🍎 + 🍎🍎 = ?")' : ''}

Frame as fun scenarios: birthday parties, pets, playground, snacks, toy collection.
IMPORTANT: For counting questions, always display the objects as emoji directly in the "emoji_visual" field (e.g. "🍎🍎🍎 + 🍎🍎 = ?"). NEVER reference a picture, image, or diagram that is not rendered as text or emoji.
Return ONLY valid JSON array, no markdown.`,

        more_or_less: `Generate ${count} comparison exercise(s) for a 5-year-old at ${level === 1 ? 'Level 1: Compare two numbers up to 100, ask which is more/less, how many more/fewer. Also include ordering 3 numbers least to greatest.' : level === 2 ? 'Level 2: Compare and order numbers up to 100, introduce "how many times more" comparisons.' : 'Level 3: Place value comparisons (tens and ones), rounding to nearest 10, ordering 4-5 numbers.'}.

For each, return JSON array with objects containing:
- "question": the comparison question
- "choices": array of 4 answer options (as strings)
- "correct_answer": correct answer (as string)
- "explanation": child-friendly explanation

Return ONLY valid JSON array, no markdown.`,

        algebra_puzzles: `Generate ${count} missing number puzzle(s) for a 5-year-old at ${level === 1 ? 'Level 1: Missing number in addition and subtraction equations up to 20. Use the variable letter "x" for the unknown (e.g. "4 + x = 11"). 4 answer choices.' : level === 2 ? 'Level 2: Missing number in all four operations up to 50. Use "x" for the unknown (e.g. "x × 3 = 12" or "20 ÷ x = 4"). Use × for multiplication, ÷ for division. 4 answer choices.' : 'Level 3: Two-variable problems using "x" and "y" (e.g. "x + y = 10, if x = 3, what is y?"), missing numbers in sequences using "n", all operations up to 100. 4 answer choices.'}.

IMPORTANT RULES FOR VARIABLE LETTERS:
- Use lowercase "x" as the primary unknown variable
- Use "y" as the second variable in two-variable problems
- Use "n" for number sequence problems (e.g. "n, 4, 6, 8 — what is n?")
- NEVER use ⭐, ☐, or any emoji as variable symbols
- NEVER use letters that look like numbers (l, o, O)
- Use × for multiplication (not x or *), ÷ for division

For each, return JSON array with objects containing:
- "question": the equation displayed with variable letters (e.g. "4 + x = 11" or "x + y = 10, if x = 3, what is y?")
- "choices": array of 4 number answers (as strings)
- "correct_answer": the correct number (as string)
- "explanation": shows the solved equation with the answer filled in (e.g. "The answer is 7! So x = 7, because 4 + 7 = 11 ✓")
- "tts_reading": a natural speech version of the question (e.g. "4 plus x equals 11. What is x?")

Return ONLY valid JSON array, no markdown.`,
      },

      confidence_coach: {
        meet_greet: `Generate ${count} social greeting scenario(s) for a 5-year-old preparing for a private school admissions interview at ${level === 1 ? 'beginner level: show scenario and a modeled answer' : level === 2 ? 'intermediate level: show scenario, let child answer first, then show model' : 'advanced level: open-ended prompt only, no choices'}.

For each, return JSON array with objects containing:
- "scenario": a realistic social scenario a 5-year-old might encounter at a school visit or with a new adult
- "suggested_answer": a confident, friendly response the child could give
- "explanation": why this is a good response (for parent)

Make scenarios warm and realistic: meeting a teacher, a new classmate, a school principal, a testing psychologist.
Return ONLY valid JSON array, no markdown.`,

        what_would_you_do: `Generate ${count} social situation exercise(s) for a 5-year-old at ${level === 1 ? 'beginner' : level === 2 ? 'intermediate' : 'advanced'} level.

For each, return JSON array with objects containing:
- "scenario": an age-appropriate social situation at school or a new environment
- "choices": array of 3 responses — one kind/confident, one shy/passive, one unkind
- "correct_answer": the kind/confident response
- "explanation": child-friendly discussion of why the best answer works and what makes it kind

Scenarios: lunch table, playground, classroom, meeting new friends, sharing, taking turns.
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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
