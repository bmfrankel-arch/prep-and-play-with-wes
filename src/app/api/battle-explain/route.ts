import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AnimalSummary {
  strength: number;
  speed: number;
  defense: number;
  powerLevel: number;
  level?: number;
  rarity?: string;
  superpower?: string;
  funFact?: string;
}

interface ModifierApplied {
  type: string;
  bonus: number;
  description: string;
}

interface RequestBody {
  winner_name?: string;
  winner_stats?: AnimalSummary;
  loser_name?: string;
  loser_stats?: AnimalSummary;
  terrain?: string;
  terrain_bonus_applied_to?: 'winner' | 'loser' | 'neither';
  score_difference?: number;
  modifiers_applied?: ModifierApplied[];
  context?: 'battle' | 'tournament';
  isTie?: boolean;
  // Legacy fallthrough fields (older callers)
  winner?: string;
  loser?: string;
  winnerStats?: AnimalSummary;
  loserStats?: AnimalSummary;
}

interface BattleScienceFact {
  emoji: string;
  label: string;
  explanation: string;
  expanded: string;
}

interface StructuredBreakdown {
  deciding_factor: string;
  battle_science: BattleScienceFact[];
  did_you_know: string;
  could_loser_win: string;
  modifier_note: string | null;
  terrain_note: string | null;
  tts_summary: string;
  tts_summary_short: string;
  // Back-compat single-line for any legacy consumer.
  explanation: string;
}

function buildFallback(
  winnerName: string,
  loserName: string,
  winner: AnimalSummary,
  loser: AnimalSummary,
  scoreDiff: number,
  modifiers: ModifierApplied[],
): StructuredBreakdown {
  const statAdvantages: string[] = [];
  if (winner.strength > loser.strength + 1) statAdvantages.push('raw strength');
  if (winner.speed > loser.speed + 1) statAdvantages.push('superior speed');
  if (winner.defense > loser.defense + 1) statAdvantages.push('tougher defence');
  const mainAdvantage = statAdvantages[0] || 'overall power level';

  const winnerSuper = winner.superpower || 'has remarkable abilities.';
  const winnerFact = winner.funFact || 'has many incredible talents.';
  const loserSuper = loser.superpower || 'has remarkable abilities.';

  const decidingFactor = `${winnerName} wins through ${mainAdvantage} — giving it a critical edge in this matchup against ${loserName}!`;

  const science: BattleScienceFact[] = [
    {
      emoji: '💪',
      label: 'Power Rating',
      explanation: `${winnerName} has a power level of ${winner.powerLevel} compared to ${loserName}'s ${loser.powerLevel}.`,
      expanded: `${winnerSuper} This gives it a significant advantage in most matchups.`,
    },
    {
      emoji: '🌟',
      label: 'Special Ability',
      explanation: winnerSuper,
      expanded: winnerFact,
    },
  ];

  if (modifiers.length > 0) {
    science.push({
      emoji: '⚡',
      label: 'Battle Edge',
      explanation: modifiers[0].description,
      expanded: `That gave ${winnerName} a +${modifiers[0].bonus} bonus in this fight — a real edge against ${loserName}.`,
    });
  }

  const couldLoserWin = scoreDiff <= 15
    ? `COULD ${loserName.toUpperCase()} WIN? Absolutely — this was a very close battle. ${loserSuper.toLowerCase().startsWith('can') ? 'Its ability to ' + loserSuper.toLowerCase().slice(4) : loserSuper} Real battles in nature always have surprises!`
    : `COULD ${loserName.toUpperCase()} WIN? In a direct fight it would be very difficult — but ${loserName} survives in the wild because ${loserSuper.toLowerCase()} In nature avoiding a fight is often smarter than winning one!`;

  const modifierNote = modifiers.length > 0 ? modifiers[0].description : null;
  const ttsSummary = `${winnerName} wins this battle! ${decidingFactor} Did you know — ${winnerFact} And could ${loserName} ever win? ${loserSuper}`;
  const ttsShort = `${winnerName} wins! ${winnerSuper}`;

  return {
    deciding_factor: decidingFactor,
    battle_science: science,
    did_you_know: winnerFact,
    could_loser_win: couldLoserWin,
    modifier_note: modifierNote,
    terrain_note: null,
    tts_summary: ttsSummary,
    tts_summary_short: ttsShort,
    explanation: decidingFactor,
  };
}

function safeParseJson(raw: string): StructuredBreakdown | null {
  try {
    // Strip code fences if model wraps JSON.
    const cleaned = raw.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.deciding_factor !== 'string') return null;
    if (!Array.isArray(parsed.battle_science)) return null;
    return parsed as StructuredBreakdown;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const winnerName = body.winner_name || body.winner || 'Winner';
  const loserName = body.loser_name || body.loser || 'Loser';
  const winner = body.winner_stats || body.winnerStats || { strength: 3, speed: 3, defense: 3, powerLevel: 60 };
  const loser = body.loser_stats || body.loserStats || { strength: 3, speed: 3, defense: 3, powerLevel: 60 };
  const terrain = body.terrain || 'GRASSLAND';
  const scoreDiff = body.score_difference ?? 10;
  const modifiers = body.modifiers_applied || [];
  const context = body.context || 'battle';
  const isTie = body.isTie ?? false;

  // Tie path — keep existing UX; minimal explanation without API call to save tokens.
  if (isTie) {
    const tieMsg = `Both ${winnerName} and ${loserName} fought to a perfect standstill — neither could find a decisive advantage in ${terrain.toLowerCase()}!`;
    return NextResponse.json({
      explanation: tieMsg,
      breakdown: null,
    });
  }

  const fallback = buildFallback(winnerName, loserName, winner, loser, scoreDiff, modifiers);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ explanation: fallback.deciding_factor, breakdown: fallback });
  }

  const tempo = scoreDiff <= 8 ? 'close' : scoreDiff <= 18 ? 'decisive' : 'one-sided';
  const modifierList = modifiers.length > 0
    ? modifiers.map(m => `${m.type} (+${m.bonus})`).join(', ')
    : 'none';

  const lengthNote = context === 'tournament'
    ? 'Tournament context — keep all text 30% shorter to keep pacing fast.'
    : '';

  const prompt = `Generate an educational battle breakdown for a Who Would Win? style learning app for a 5-year-old boy named Wes who loves animals.

Winner: ${winnerName} — STR:${winner.strength} SPD:${winner.speed} DEF:${winner.defense} PWR:${winner.powerLevel}${winner.superpower ? `, "${winner.superpower}"` : ''}
Loser: ${loserName} — STR:${loser.strength} SPD:${loser.speed} DEF:${loser.defense} PWR:${loser.powerLevel}${loser.superpower ? `, "${loser.superpower}"` : ''}
Terrain: ${terrain}
Score difference: ${scoreDiff} (${tempo})
Modifiers applied: ${modifierList}
Context: ${context}

Write for a 5-6 year old — exciting short sentences, no jargon. Every fact must be scientifically accurate. Never invent animal abilities. Reference both animals by name throughout. Make it feel like a Who Would Win? book page. ${lengthNote}

Return ONLY valid JSON with no markdown:
{
  "deciding_factor": "1 sentence — single most important reason ${winnerName} wins THIS matchup, must name both animals",
  "battle_science": [
    { "emoji": "🧪", "label": "2-3 bold words", "explanation": "1 accurate sentence", "expanded": "2-3 sentences for tap-to-expand" },
    { "emoji": "🛡️", "label": "2-3 bold words", "explanation": "1 accurate sentence", "expanded": "2-3 sentences for tap-to-expand" },
    { "emoji": "⚡", "label": "2-3 bold words", "explanation": "1 accurate sentence", "expanded": "2-3 sentences for tap-to-expand" }
  ],
  "did_you_know": "1 surprising fact about ${winnerName} beyond this battle — must be genuinely surprising and specific",
  "could_loser_win": "1-2 sentences — nuanced, reference specific condition where ${loserName} could win, never say simply 'no'",
  "modifier_note": ${modifiers.length > 0 ? '"brief explanation of modifier effect"' : 'null'},
  "terrain_note": "if terrain bonus mattered — 1 sentence — or null",
  "tts_summary": "4-6 sentences read aloud by British TTS — covers deciding_factor, 1-2 key science facts, did_you_know, and could_loser_win — exciting and child-appropriate",
  "tts_summary_short": "2-3 sentences for tournament context — just deciding factor and one key fact"
}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = safeParseJson(text);
    if (!parsed) {
      return NextResponse.json({ explanation: fallback.deciding_factor, breakdown: fallback });
    }
    return NextResponse.json({
      explanation: parsed.deciding_factor,
      breakdown: { ...parsed, explanation: parsed.deciding_factor },
    });
  } catch (err) {
    console.error('battle-explain API error:', err);
    return NextResponse.json({ explanation: fallback.deciding_factor, breakdown: fallback });
  }
}
