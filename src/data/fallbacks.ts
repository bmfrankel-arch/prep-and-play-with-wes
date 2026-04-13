// Fallback questions when Anthropic API is unavailable
// Each game mode has pre-built content so the app never shows an infinite spinner

export const FALLBACK_QUESTIONS: Record<string, Record<string, Record<number, unknown[]>>> = {
  memory_master: {
    remember_list: {
      1: [
        { words_to_remember: ['Cat', 'Sun', 'Ball'], all_choices: ['Cat', 'Sun', 'Ball', 'Fish', 'Tree', 'Cup'], display_time: 6, require_order: false },
        { words_to_remember: ['Dog', 'Hat', 'Star'], all_choices: ['Dog', 'Hat', 'Star', 'Cake', 'Moon', 'Bird'], display_time: 6, require_order: false },
        { words_to_remember: ['Fish', 'Red', 'Book'], all_choices: ['Fish', 'Red', 'Book', 'Blue', 'Pen', 'Car'], display_time: 6, require_order: false },
        { words_to_remember: ['Milk', 'Frog', 'Ring'], all_choices: ['Milk', 'Frog', 'Ring', 'Sock', 'Lamp', 'Drum'], display_time: 6, require_order: false },
        { words_to_remember: ['Egg', 'Kite', 'Bear'], all_choices: ['Egg', 'Kite', 'Bear', 'Boat', 'Bell', 'Rose'], display_time: 6, require_order: false },
      ],
      2: [
        { words_to_remember: ['River', 'Castle', 'Purple', 'Tiger'], all_choices: ['River', 'Castle', 'Purple', 'Tiger', 'Forest', 'Pillow', 'Orange', 'Cloud'], display_time: 4, require_order: false },
        { words_to_remember: ['Garden', 'Silver', 'Monkey', 'Bridge'], all_choices: ['Garden', 'Silver', 'Monkey', 'Bridge', 'Winter', 'Basket', 'Pencil', 'Planet'], display_time: 4, require_order: false },
        { words_to_remember: ['Dragon', 'Island', 'Blanket', 'Feather'], all_choices: ['Dragon', 'Island', 'Blanket', 'Feather', 'Candle', 'Marble', 'Ribbon', 'Shadow'], display_time: 4, require_order: false },
        { words_to_remember: ['Turtle', 'Rainbow', 'Hammer', 'Velvet'], all_choices: ['Turtle', 'Rainbow', 'Hammer', 'Velvet', 'Lantern', 'Pebble', 'Goblet', 'Muffin'], display_time: 4, require_order: false },
        { words_to_remember: ['Parrot', 'Jungle', 'Copper', 'Rocket'], all_choices: ['Parrot', 'Jungle', 'Copper', 'Rocket', 'Cactus', 'Bubble', 'Magnet', 'Fossil'], display_time: 4, require_order: false },
      ],
      3: [
        { words_to_remember: ['Volcano', 'Symphony', 'Compass', 'Glacier', 'Merchant'], all_choices: ['Volcano', 'Symphony', 'Compass', 'Glacier', 'Merchant', 'Lantern', 'Fable', 'Quarry'], display_time: 3, require_order: true },
        { words_to_remember: ['Eclipse', 'Harmony', 'Scepter', 'Monsoon', 'Chimney'], all_choices: ['Eclipse', 'Harmony', 'Scepter', 'Monsoon', 'Chimney', 'Potion', 'Riddle', 'Cavern'], display_time: 3, require_order: true },
        { words_to_remember: ['Phoenix', 'Crystal', 'Thunder', 'Voyage', 'Anchor'], all_choices: ['Phoenix', 'Crystal', 'Thunder', 'Voyage', 'Anchor', 'Beacon', 'Quiver', 'Meadow'], display_time: 3, require_order: true },
        { words_to_remember: ['Pyramid', 'Harvest', 'Scarlet', 'Whisper', 'Falcon'], all_choices: ['Pyramid', 'Harvest', 'Scarlet', 'Whisper', 'Falcon', 'Goblin', 'Nectar', 'Shrine'], display_time: 3, require_order: true },
        { words_to_remember: ['Icicle', 'Fortune', 'Bramble', 'Pilgrim', 'Osprey'], all_choices: ['Icicle', 'Fortune', 'Bramble', 'Pilgrim', 'Osprey', 'Rune', 'Geyser', 'Silo'], display_time: 3, require_order: true },
      ],
    },
    order_recall: {
      1: [
        { sequence: ['red cat', 'blue fish', 'yellow bird'], display_time: 5 },
        { sequence: ['green frog', 'pink pig', 'brown bear'], display_time: 5 },
        { sequence: ['white rabbit', 'orange fox', 'gray elephant'], display_time: 5 },
        { sequence: ['purple butterfly', 'red ladybug', 'blue whale'], display_time: 5 },
        { sequence: ['yellow duck', 'black dog', 'brown horse'], display_time: 5 },
      ],
      2: [
        { sequence: ['red cat', 'blue fish', 'yellow bird', 'green frog'], display_time: 4 },
        { sequence: ['pink pig', 'gray elephant', 'orange fox', 'white rabbit'], display_time: 4 },
        { sequence: ['brown bear', 'purple butterfly', 'red ladybug', 'blue whale'], display_time: 4 },
        { sequence: ['yellow duck', 'black dog', 'brown horse', 'green turtle'], display_time: 4 },
        { sequence: ['white swan', 'orange tiger', 'gray mouse', 'pink flamingo'], display_time: 4 },
      ],
      3: [
        { sequence: ['red cat', 'blue fish', 'yellow bird', 'green frog', 'pink pig'], display_time: 3 },
        { sequence: ['gray elephant', 'orange fox', 'white rabbit', 'brown bear', 'purple butterfly'], display_time: 3 },
        { sequence: ['red ladybug', 'blue whale', 'yellow duck', 'black dog', 'brown horse'], display_time: 3 },
        { sequence: ['green turtle', 'white swan', 'orange tiger', 'gray mouse', 'pink flamingo'], display_time: 3 },
        { sequence: ['purple parrot', 'red cardinal', 'blue jay', 'yellow canary', 'green parakeet'], display_time: 3 },
      ],
    },
    story_details: {
      1: [
        { story: 'The little dog ran to the sunny park. He found a big red ball near the fountain. He picked it up and brought it to his friend Sam. Sam laughed and threw the ball high into the air.', questions: [{ question: 'What color was the ball?', choices: ['Red', 'Blue', 'Green', 'Yellow'], correct_answer: 'Red' }, { question: 'Who did the dog bring the ball to?', choices: ['Sam', 'Tom', 'Mia', 'Jake'], correct_answer: 'Sam' }] },
        { story: 'A girl named Lily found a small yellow kitten. The kitten was hiding under a big oak tree. Lily gave the kitten a bowl of warm milk. The kitten purred and fell fast asleep.', questions: [{ question: 'Where was the kitten hiding?', choices: ['Under a tree', 'In a box', 'Behind a bush', 'Under a bench'], correct_answer: 'Under a tree' }, { question: 'What did Lily give the kitten?', choices: ['Milk', 'Water', 'Fish', 'Bread'], correct_answer: 'Milk' }] },
        { story: 'A brave boy named Max climbed a tall mountain. At the top he found a shiny golden compass. The compass always pointed toward home. Max used it to find his way back safely.', questions: [{ question: 'What did Max find at the top?', choices: ['A compass', 'A map', 'A flag', 'A coin'], correct_answer: 'A compass' }, { question: 'What did the compass point toward?', choices: ['Home', 'North', 'Water', 'The sun'], correct_answer: 'Home' }] },
      ],
      2: [
        { story: 'The cat climbed the tall tree. A bird was sitting on a branch. The cat wanted to play. The bird flew away quickly.', questions: [{ question: 'Where was the bird?', choices: ['On a branch', 'On the ground', 'In a nest', 'On the roof'], correct_answer: 'On a branch' }, { question: 'What did the bird do?', choices: ['Flew away', 'Sang a song', 'Fell down', 'Built a nest'], correct_answer: 'Flew away' }] },
        { story: 'Emma woke up early on Saturday morning. She put on her blue raincoat because it was raining. She walked to the library to return three books. The librarian gave her a gold star for being on time.', questions: [{ question: 'What color was the raincoat?', choices: ['Blue', 'Red', 'Yellow', 'Green'], correct_answer: 'Blue' }, { question: 'How many books did Emma return?', choices: ['Three', 'Two', 'Four', 'Five'], correct_answer: 'Three' }] },
      ],
      3: [
        { story: 'On a cold winter morning, a fox named Ruby found a frozen pond. She carefully walked across the ice to reach a pile of berries on the other side. She carried the berries back in a small brown basket. Ruby shared them with her two cubs who were waiting in the warm den.', questions: [{ question: 'What was the fox named?', choices: ['Ruby', 'Rose', 'Luna', 'Amber'], correct_answer: 'Ruby' }, { question: 'What did Ruby carry the berries in?', choices: ['A basket', 'A bag', 'Her mouth', 'A box'], correct_answer: 'A basket' }] },
      ],
    },
  },
  word_wizard: {
    riddles: {
      1: [
        { clues: ['I have four legs', 'I say meow'], choices: ['Cat', 'Dog', 'Fish'], correct_answer: 'Cat', syllable_breakdown: 'cat', definition: 'A small furry pet that purrs', example_sentence: 'The cat sat on the mat.' },
        { clues: ['I am yellow', 'Monkeys love me'], choices: ['Banana', 'Apple', 'Grape'], correct_answer: 'Banana', syllable_breakdown: 'ba • NA • na', definition: 'A long yellow fruit', example_sentence: 'I had a banana for snack.' },
        { clues: ['I fall from the sky', 'I make puddles'], choices: ['Rain', 'Snow', 'Wind'], correct_answer: 'Rain', syllable_breakdown: 'rain', definition: 'Water that falls from clouds', example_sentence: 'The rain made everything wet.' },
      ],
      2: [{ clues: ['I have a trunk', 'I never forget', 'I am very big'], choices: ['Elephant', 'Lion', 'Bear', 'Horse'], correct_answer: 'Elephant', syllable_breakdown: 'EL • e • phant', definition: 'The largest land animal', example_sentence: 'The elephant sprayed water with its trunk.' }],
      3: [{ clues: ['I have a trunk', 'I never forget', 'I am very big'], choices: ['Elephant', 'Lion', 'Bear', 'Horse'], correct_answer: 'Elephant', syllable_breakdown: 'EL • e • phant', definition: 'The largest land animal', example_sentence: 'The elephant sprayed water with its trunk.' }],
    },
    story_finish: {
      1: [{ story: 'Sam found a puppy in the park. The puppy was very small.', choices: ['Sam took the puppy home', 'Sam flew to the moon', 'Sam turned into a fish'], correct_answer: 'Sam took the puppy home', follow_up: 'The puppy wagged its tail happily!', explanation: 'Taking the puppy home makes the most sense.' }],
      2: [{ story: 'Sam found a puppy in the park. The puppy was very small.', choices: ['Sam took the puppy home', 'Sam flew to the moon', 'Sam turned into a fish'], correct_answer: 'Sam took the puppy home', follow_up: 'The puppy wagged its tail happily!', explanation: 'Taking the puppy home makes the most sense.' }],
      3: [{ story: 'Sam found a puppy in the park. The puppy was very small.', choices: ['Sam took the puppy home', 'Sam flew to the moon', 'Sam turned into a fish'], correct_answer: 'Sam took the puppy home', follow_up: 'The puppy wagged its tail happily!', explanation: 'Taking the puppy home makes the most sense.' }],
    },
    word_categories: {
      1: [{ question: "Which one doesn't belong?", choices: ['Apple', 'Banana', 'Chair', 'Grape'], correct_answer: 'Chair', explanation: 'Chair is furniture, the rest are fruits.' }],
      2: [{ question: "Which one doesn't belong?", choices: ['Apple', 'Banana', 'Chair', 'Grape'], correct_answer: 'Chair', explanation: 'Chair is furniture, the rest are fruits.' }],
      3: [{ question: "Which one doesn't belong?", choices: ['Apple', 'Banana', 'Chair', 'Grape'], correct_answer: 'Chair', explanation: 'Chair is furniture, the rest are fruits.' }],
    },
  },
  pattern_detective: {
    shape_sequences: {
      1: [{ emoji_pattern: '🔴🔵🔴🔵❓', choices: ['🔴', '🔵', '🟢'], correct_answer: '🔴', explanation: 'The pattern alternates red and blue.' }],
      2: [{ emoji_pattern: '🔴🔵🟢🔴🔵🟢❓', choices: ['🔴', '🔵', '🟢', '🟡'], correct_answer: '🔴', explanation: 'The pattern repeats red, blue, green.' }],
      3: [{ emoji_pattern: '🔴🔵🟢🔴🔵🟢❓', choices: ['🔴', '🔵', '🟢', '🟡'], correct_answer: '🔴', explanation: 'The pattern repeats red, blue, green.' }],
    },
    size_color_sorting: {
      1: [{ question: 'What comes next? Big red ball, small red ball, big red ball...', objects: ['big red ball', 'small red ball', 'big red ball'], choices: ['small red ball', 'big blue ball', 'small blue ball'], correct_answer: 'small red ball', explanation: 'The sizes alternate: big, small, big, small.' }],
      2: [{ question: 'What comes next? Big red ball, small red ball, big red ball...', objects: ['big red ball', 'small red ball', 'big red ball'], choices: ['small red ball', 'big blue ball', 'small blue ball'], correct_answer: 'small red ball', explanation: 'The sizes alternate.' }],
      3: [{ question: 'What comes next? Big red ball, small red ball, big red ball...', objects: ['big red ball', 'small red ball', 'big red ball'], choices: ['small red ball', 'big blue ball', 'small blue ball'], correct_answer: 'small red ball', explanation: 'The sizes alternate.' }],
    },
    odd_one_out: {
      1: [{ question: 'Which one is different?', objects: ['apple', 'banana', 'car', 'grape'], choices: ['apple', 'banana', 'car', 'grape'], correct_answer: 'car', explanation: 'Car is a vehicle, the rest are fruits.' }],
      2: [{ question: 'Which one is different?', objects: ['apple', 'banana', 'car', 'grape'], choices: ['apple', 'banana', 'car', 'grape'], correct_answer: 'car', explanation: 'Car is a vehicle, the rest are fruits.' }],
      3: [{ question: 'Which one is different?', objects: ['apple', 'banana', 'car', 'grape'], choices: ['apple', 'banana', 'car', 'grape'], correct_answer: 'car', explanation: 'Car is a vehicle, the rest are fruits.' }],
    },
  },
  math_explorer: {
    counting_adventures: {
      1: [{ question: 'Wes has 3 apples and finds 2 more. How many apples does he have?', choices: ['4', '5', '6', '3'], correct_answer: '5', explanation: '3 + 2 = 5 apples!', emoji_visual: '🍎🍎🍎 + 🍎🍎 = ?' }],
      2: [{ question: 'Wes has 3 apples and finds 2 more. How many?', choices: ['4', '5', '6', '3'], correct_answer: '5', explanation: '3 + 2 = 5!', emoji_visual: '🍎🍎🍎 + 🍎🍎 = ?' }],
      3: [{ question: 'Wes has 3 apples and finds 2 more. How many?', choices: ['4', '5', '6', '3'], correct_answer: '5', explanation: '3 + 2 = 5!' }],
    },
    more_or_less: {
      1: [{ question: 'Which number is bigger: 7 or 3?', choices: ['7', '3', '5', '10'], correct_answer: '7', explanation: '7 is bigger than 3!' }],
      2: [{ question: 'Which number is bigger: 7 or 3?', choices: ['7', '3', '5', '10'], correct_answer: '7', explanation: '7 is bigger than 3!' }],
      3: [{ question: 'Which number is bigger: 7 or 3?', choices: ['7', '3', '5', '10'], correct_answer: '7', explanation: '7 is bigger than 3!' }],
    },
    algebra_puzzles: {
      1: [{ question: '3 + x = 5', choices: ['1', '2', '3', '4'], correct_answer: '2', explanation: 'x = 2, because 3 + 2 = 5 ✓', tts_reading: '3 plus x equals 5. What is x?' }],
      2: [{ question: '3 + x = 5', choices: ['1', '2', '3', '4'], correct_answer: '2', explanation: 'x = 2, because 3 + 2 = 5 ✓', tts_reading: '3 plus x equals 5. What is x?' }],
      3: [{ question: '3 + x = 5', choices: ['1', '2', '3', '4'], correct_answer: '2', explanation: 'x = 2, because 3 + 2 = 5 ✓', tts_reading: '3 plus x equals 5. What is x?' }],
    },
  },
  confidence_coach: {
    meet_greet: {
      1: [{ scenario: "A teacher says: 'Hi! What's your name?'", suggested_answer: "Hi! I'm Wes. It's nice to meet you!", explanation: 'Making eye contact and being friendly.' }],
      2: [{ scenario: "A teacher says: 'Hi! What's your name?'", suggested_answer: "Hi! I'm Wes. It's nice to meet you!", explanation: 'Making eye contact and being friendly.' }],
      3: [{ scenario: "A teacher says: 'Hi! What's your name?'", suggested_answer: "Hi! I'm Wes. It's nice to meet you!", explanation: 'Making eye contact and being friendly.' }],
    },
    what_would_you_do: {
      1: [{ scenario: "You're at lunch and no one is sitting with you.", choices: ['Ask someone to sit with you', 'Cry quietly', 'Throw your food'], correct_answer: 'Ask someone to sit with you', explanation: 'Being brave and friendly is always the best choice!' }],
      2: [{ scenario: "You're at lunch and no one is sitting with you.", choices: ['Ask someone to sit with you', 'Cry quietly', 'Throw your food'], correct_answer: 'Ask someone to sit with you', explanation: 'Being brave and friendly is always the best choice!' }],
      3: [{ scenario: "You're at lunch and no one is sitting with you.", choices: ['Ask someone to sit with you', 'Cry quietly', 'Throw your food'], correct_answer: 'Ask someone to sit with you', explanation: 'Being brave and friendly is always the best choice!' }],
    },
    i_dont_know: {
      1: [{ question: 'What is the tallest mountain in the world?', choices: ['Mount Everest', 'The Moon', "I don't know, but I'll try!"], correct_answer: "I don't know, but I'll try!", explanation: "Saying 'I don't know but I'll try' is brave and smart!", actual_answer: 'Mount Everest' }],
      2: [{ question: 'What is the tallest mountain in the world?', choices: ['Mount Everest', 'The Moon', "I don't know, but I'll try!"], correct_answer: "I don't know, but I'll try!", explanation: "Saying 'I don't know but I'll try' is brave and smart!", actual_answer: 'Mount Everest' }],
      3: [{ question: 'What is the tallest mountain in the world?', choices: ['Mount Everest', 'The Moon', "I don't know, but I'll try!"], correct_answer: "I don't know, but I'll try!", explanation: "Saying 'I don't know but I'll try' is brave and smart!", actual_answer: 'Mount Everest' }],
    },
  },
};

export function getFallbackQuestions(skillArea: string, subGame: string, level: number): unknown[] | null {
  return (FALLBACK_QUESTIONS[skillArea]?.[subGame]?.[level] as unknown[]) || null;
}
