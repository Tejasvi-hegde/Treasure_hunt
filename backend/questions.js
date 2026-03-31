// ============================================================
//  ⚠️  KEEP THIS FILE SECRET — NEVER COMMIT TO A PUBLIC REPO
//  ⚠️  ADD questions.js TO YOUR .gitignore IF NEEDED
//  Answers are validated server-side only. The client NEVER
//  receives the answer field — only text, imageUrl, and audioUrl.
// ============================================================

const QUESTIONS = [
  {
    id: 1,
    text: `There are five houses, each with a front door of a different colour, and inhabited by men of different nationalities, with different pets and drinks. Each man smokes a different kind of pipe tobacco.
        The Englishman lives in the house with the red door.
        The Spaniard owns the dog.
        Coffee is drunk in the house with the green door.
        The Ukrainian drinks tea.
        The house with the green door is immediately to the right (your right) of the house with the ivory door.
        The Medium Cut smoker owns snails.
        Spun Cut is smoked in the house with the yellow door.
        Milk is drunk in the middle house.
        The Norwegian lives in the first house on the left.
        The man who smokes Mixture lives in the house next to the man with the fox.
        Spun Cut is smoked in the house next to the house where the horse is kept.
        The Flake smoker drinks orange juice.
        The Japanese smokes Rough Cut.
        The Norwegian lives next to the house with the blue door.
        Who drinks water? And who owns the zebra?`,
      answer: `The Norwegian drinks water.
    The Japanese owns the zebra.`,
    imageUrl: null, // Optional: set to an image URL (must be HTTPS)
  },
  {
    id: 2,
    text: "Is this a good question ?",
    answer: "If this is a good answer",
    imageUrl: null,
  },
  {
    id: 3,
    text: `In his final experiments.-the archivist
     grew fascinated with messages that didnot rely on language
      at-.all He began studying patterns made only of brief and prolonged 
      marks short signals Followed by longer ones separated by...- deliberate
       pauses To most they appeared meaningless like noise scattered across
        a page.- But to him they formed a rhythm a language built not from words
         but-.-- from timing itself He often remarked that understanding such messages required not 
         reading but listening to their pattern.-
`,
    answer: "ANVAYA",
    imageUrl: null,
  },
  {
    id: 4,
    text: "Listen to the audio clue and submit your answer.",
    answer: "all of them",
    imageUrl: null,
    audioUrl: "assets/questions/q4.mp3",
  },
  {
    id: 5,
    text: `You are in a helicopter and start from Luxembourg.
     You travel 500 km north, then 500 km east, followed by 500 km south,
      and finally 500 km west.
Where are you now?`,
    answer: "Germany",
    imageUrl: null,
  },
  {
    id: 6,
    text: "What number is 15 less when you turn it upside down?",
    answer: "553751",
    imageUrl: null,
  },
  {
    id: 7,
    text: "If english is encoded as 1111111111111111111111★111 what will be there in place of * ?",
    answer: "three",
    imageUrl: null,
  },
  {
    id: 8,
    text: "",
    answer: "bad intentions in ping pong",
    imageUrl: "assets/questions/bad.png",
    imageUrl2: "assets/questions/ping.png",
    imageJoinText: "in",
  },
];

// ─── DO NOT MODIFY BELOW THIS LINE ───────────────────────────

const TOTAL_QUESTIONS = QUESTIONS.length;

/**
 * Returns question data safe to send to the client (NO answer field).
 */
function getQuestionForClient(questionNumber) {
  const q = QUESTIONS[questionNumber - 1];
  if (!q) return null;
  return {
    id: q.id,
    text: q.text,
    imageUrl: q.imageUrl || null,
    imageUrl2: q.imageUrl2 || null,
    imageJoinText: q.imageJoinText || null,
    audioUrl: q.audioUrl || null,
    total: TOTAL_QUESTIONS,
  };
}

/**
 * Validates a submitted answer — case-insensitive, trimmed.
 */
function validateAnswer(questionNumber, submittedAnswer) {
  const q = QUESTIONS[questionNumber - 1];
  if (!q) return false;

  if (questionNumber === 1) {
    const normalized = submittedAnswer
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const sequence = ["norwegian", "water", "japanese", "zebra"];
    let cursor = 0;

    for (const token of sequence) {
      const foundAt = normalized.indexOf(token, cursor);
      if (foundAt === -1) return false;
      cursor = foundAt + token.length;
    }

    return true;
  }

  if (questionNumber === 4) {
    const normalized = submittedAnswer
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalized.split(" ").includes("all");
  }

  if (questionNumber === 8) {
    const normalized = submittedAnswer
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    return normalized === "badintentionsinpingpong";
  }

  const clean = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return clean(submittedAnswer) === clean(q.answer);
}

module.exports = { QUESTIONS, TOTAL_QUESTIONS, getQuestionForClient, validateAnswer };
