// Every concrete word/phrase the curriculum teaches (via phrase teach cards),
// tagged with a category + the lesson that introduces it. Drives the SRS
// review ("what can resurface") and drill scoping — content the learner has
// met and nothing else. Grammar patterns (です, 〜さい, question sentences)
// are deliberately not registered; they're taught in context, not drilled as
// vocabulary.
export interface Vocab {
  word: string;
  gloss: string;
  category: string; // bucket label
  lessonId: string;
  // Patch 1.8: verbs are registered in their citation form (たべます) because
  // that is what belongs on a flashcard — a bare stem is not a word a learner
  // can say. `stem` exists solely so scripts/check-content.ts's prefix-based
  // stripKnownTokens can decompose polite conjugations (たべ + ませんでした)
  // it cannot reach from the citation form alone. No UI reads it.
  stem?: string;
  // Patch 1.8.2: additional taught meanings for the SAME word. Not a second
  // vocab row — checkVocabUniqueness forbids that, and rightly: two rows for
  // one word give the SRS two entries under one key (srs.ts keys on
  // `vocab:<word>`) and let a generated board show the same term twice.
  //
  // `gloss` stays the single canonical short answer, because it doubles as
  // the expected typed answer in generated type-answer items and as the
  // right-hand cell on match boards. `senses` are accepted as alternative
  // answers and are excluded from distractor pools, so an item can never
  // offer two correct options.
  //
  // Why it exists: ちょっと is taught as "a little" and tested as the polite
  // refusal. The learner had every reinforcement pointing at the literal
  // sense and was marked wrong for it. See Lang-content-followups.md.
  senses?: string[];
  // Patch 1.9: words to UNDERSTAND but never be asked to produce — staff
  // phrases, signage, things said TO you. いらっしゃいませ, 〜えんに なります,
  // なんめいさま: a learner needs to recognise these instantly and will never
  // once need to say them.
  //
  // Registration is production by construction, which is the problem this
  // solves. A vocab row is picked up by generateFiller (typeAnswerFor renders
  // "Type the meaning (English)"), by the SRS's typed-production format, by
  // the tutor allowlist, the glossary and the exam pool. Before this flag the
  // only honest options were "drill it as production" or "do not register it
  // at all", and the second means the word is met once and never resurfaces.
  //
  // Flagged words stay fully real for recognition — heard, matched, read,
  // used as distractors — and are never typed or spoken.
  recognitionOnly?: boolean;
}

export const vocab: Vocab[] = [
  // u2-greetings-core — greetings
  { word: "おはよう", gloss: "good morning", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "こんにちは", gloss: "hello (daytime)", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "こんばんは", gloss: "good evening", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "ありがとう", gloss: "thank you", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "さようなら", gloss: "goodbye", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "じゃあね", gloss: "see you (casual)", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "おやすみ", gloss: "good night", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  // u2-self-intro — introductions
  { word: "はじめまして", gloss: "nice to meet you (first time)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "わたし", gloss: "I (polite)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "よろしく", gloss: "I look forward to this (after an intro)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "すみません", gloss: "excuse me / sorry", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "おなまえは", gloss: "what's your name?", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "おねがいします", gloss: "please", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  // u2-understanding — conversation repair (patch 1.8: the tutor unlocks at
  // Unit 2, so this is where the learner gets a way to say "I don't follow")
  { word: "わかりました", gloss: "got it", category: "かいわ (conversation)", lessonId: "u2-understanding" },
  { word: "わかりません", gloss: "I don't understand", category: "かいわ (conversation)", lessonId: "u2-understanding" },
  { word: "もういちど", gloss: "one more time", category: "かいわ (conversation)", lessonId: "u2-understanding" },
  { word: "もっとゆっくり", gloss: "more slowly", category: "かいわ (conversation)", lessonId: "u2-understanding" },
  // u2-yes-no — answering
  { word: "はい", gloss: "yes", category: "へんじ (answers)", lessonId: "u2-yes-no" },
  { word: "いいえ", gloss: "no", senses: ["not at all"], category: "へんじ (answers)", lessonId: "u2-yes-no" },
  { word: "だいじょうぶ", gloss: "it's okay", senses: ["no thanks, I'm fine"], category: "へんじ (answers)", lessonId: "u2-yes-no" },
  { word: "ちょっと", gloss: "a little", senses: ["that's a bit difficult (= no)"], category: "へんじ (answers)", lessonId: "u2-yes-no" },
  { word: "そうです", gloss: "that's right", category: "へんじ (answers)", lessonId: "u2-yes-no" },
  // u3-numbers-1-10 — numbers
  { word: "いち", gloss: "one (1)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "に", gloss: "two (2)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "さん", gloss: "three (3)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "よん", gloss: "four (4)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "ご", gloss: "five (5)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "ろく", gloss: "six (6)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "なな", gloss: "seven (7)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "はち", gloss: "eight (8)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "きゅう", gloss: "nine (9)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "じゅう", gloss: "ten (10)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  // u4-family — address forms (calling / someone else's family)
  { word: "おかあさん", gloss: "mother (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "おとうさん", gloss: "father (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "おにいさん", gloss: "older brother (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "いもうとさん", gloss: "younger sister (address)", category: "かぞく (family)", lessonId: "u4-family" },
  // u4-people-things — people vs things
  { word: "せんせい", gloss: "teacher", category: "ひと (people)", lessonId: "u4-people-things" },
  { word: "ほん", gloss: "book", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "くるま", gloss: "car", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "でんわ", gloss: "phone", category: "もの (things)", lessonId: "u4-people-things" },
  // u4-what-is-it — question words. どこ is registered HERE, once: it is shown
  // as the ど teach card's example word back in u1b, but registering it there
  // would put it in the tutor's allowed list before the learner has a single
  // place noun to answer with — and kana-card example words are never
  // registered (からだ, でんき, そば, くび, ぼうし all sit unregistered).
  { word: "なに", gloss: "what", category: "ぎもんし (question words)", lessonId: "u4-what-is-it" },
  { word: "なんですか", gloss: "what is it", category: "ぎもんし (question words)", lessonId: "u4-what-is-it" },
  { word: "どこ", gloss: "where", category: "ぎもんし (question words)", lessonId: "u4-what-is-it" },
  // u4-food-objects — food vs objects
  { word: "ごはん", gloss: "rice / a meal", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "さかな", gloss: "fish", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "りんご", gloss: "apple", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "やさい", gloss: "vegetable", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "いえ", gloss: "house", category: "もの (objects)", lessonId: "u4-food-objects" },
  { word: "つくえ", gloss: "desk", category: "もの (objects)", lessonId: "u4-food-objects" },
  { word: "ください", gloss: "please give me", category: "おねがい (requests)", lessonId: "u4-food-objects" },
  { word: "いただきます", gloss: "said before eating", category: "あいさつ (greetings)", lessonId: "u4-food-objects" },
  { word: "ごちそうさまでした", gloss: "said after eating", category: "あいさつ (greetings)", lessonId: "u4-food-objects" },
  // u5-size-temp — adjectives (size & temperature)
  { word: "おおきい", gloss: "big", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "ちいさい", gloss: "small", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "あつい", gloss: "hot (weather)", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "さむい", gloss: "cold (weather)", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  // u5-positive-negative — adjectives (judgement)
  { word: "おいしい", gloss: "delicious", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "まずい", gloss: "bad-tasting", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "いい", gloss: "good", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "わるい", gloss: "bad", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "あたらしい", gloss: "new", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "ふるい", gloss: "old (things)", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "すごい", gloss: "amazing", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  // u5-more-cheer — intensifier & encouragement. がんばれ is "do your best"
  // as a bare command; "try harder" is もっとがんばれ, which stays
  // unregistered because it composes from two registered halves.
  { word: "もっと", gloss: "more", category: "ふくし (adverbs)", lessonId: "u5-more-cheer" },
  { word: "がんばって", gloss: "do your best (friendly)", category: "おうえん (encouragement)", lessonId: "u5-more-cheer" },
  { word: "がんばれ", gloss: "do your best (command)", category: "おうえん (encouragement)", lessonId: "u5-more-cheer" },
  { word: "がんばります", gloss: "I will do my best", category: "おうえん (encouragement)", lessonId: "u5-more-cheer" },
  // u6-katakana — Patch 1.8: the katakana unit taught ~65 words on its teach
  // cards and registered NONE of them, so the tutor could read the script but
  // could never say ホテル or コーヒー. Registered per-lesson, so each word
  // unlocks as that lesson is completed rather than all at once.
  // Not registered: クルマ — that is くるま in a different script, not a new
  // word, and two rows glossed "car" make a generated board unanswerable.
  // u6-katakana-vowels-k-s
  { word: "アイス", gloss: "ice cream", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "イス", gloss: "chair", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "ウサギ", gloss: "rabbit", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "エキ", gloss: "station", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "オニ", gloss: "ogre", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "カサ", gloss: "umbrella", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "カキ", gloss: "oyster", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "クツ", gloss: "shoes", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "サケ", gloss: "salmon", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "ココア", gloss: "cocoa", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "サル", gloss: "monkey", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "シカ", gloss: "deer", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "スイカ", gloss: "watermelon", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "セカイ", gloss: "world", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  { word: "ソラ", gloss: "sky", category: "カタカナ (katakana words)", lessonId: "u6-katakana-vowels-k-s" },
  // u6-katakana-t-n-h
  { word: "タコ", gloss: "octopus", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ハチ", gloss: "bee / eight", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ツナ", gloss: "tuna", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "テスト", gloss: "test", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "トマト", gloss: "tomato", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ナイフ", gloss: "knife", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ニク", gloss: "meat", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "イヌ", gloss: "dog", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ネコ", gloss: "cat", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "キノコ", gloss: "mushroom", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ハナ", gloss: "flower", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ヒマ", gloss: "free time", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "フネ", gloss: "boat", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ヘタ", gloss: "unskilled, bad at", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  { word: "ホテル", gloss: "hotel", category: "カタカナ (katakana words)", lessonId: "u6-katakana-t-n-h" },
  // u6-katakana-m-y-r-w
  { word: "ママ", gloss: "mom (casual)", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ミルク", gloss: "milk", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ムラ", gloss: "village", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "メガネ", gloss: "glasses", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "モモ", gloss: "peach", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ヤマ", gloss: "mountain", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ユキ", gloss: "snow (also a name — this is your AI tutor's name)", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ヨガ", gloss: "yoga", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ラジオ", gloss: "radio", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "リス", gloss: "squirrel", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "トイレ", gloss: "toilet", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ロボット", gloss: "robot", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ワニ", gloss: "crocodile", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  { word: "ボタン", gloss: "button", category: "カタカナ (katakana words)", lessonId: "u6-katakana-m-y-r-w" },
  // u6-katakana-voiced-combo
  { word: "ガム", gloss: "gum", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ゴミ", gloss: "trash", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ピザ", gloss: "pizza", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "レジ", gloss: "cash register / checkout", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ギター", gloss: "guitar", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ズボン", gloss: "trousers", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ゾウ", gloss: "elephant", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "サラダ", gloss: "salad", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ドア", gloss: "door", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "バス", gloss: "bus", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ビール", gloss: "beer", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ボウシ", gloss: "hat", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "パン", gloss: "bread", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ピアノ", gloss: "piano", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "プリン", gloss: "custard pudding", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ペン", gloss: "pen", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "ポスト", gloss: "mailbox", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "キャンプ", gloss: "camp", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "シューズ", gloss: "sports shoes", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  { word: "チョコ", gloss: "chocolate (short for チョコレート)", category: "カタカナ (katakana words)", lessonId: "u6-katakana-voiced-combo" },
  // u6-katakana-long-vowel — taught via contrast pairs rather than example
  // fields. Only the REAL halves register: the lesson's コヒー and ラメン are
  // deliberate non-words, there to be told apart from these. ビール is absent
  // on purpose — it first teaches on the ビ card in u6-katakana-voiced-combo.
  { word: "ラーメン", gloss: "ramen", category: "カタカナ (katakana words)", lessonId: "u6-katakana-long-vowel" },
  { word: "コーヒー", gloss: "coffee", category: "カタカナ (katakana words)", lessonId: "u6-katakana-long-vowel" },
  { word: "ビル", gloss: "building", category: "カタカナ (katakana words)", lessonId: "u6-katakana-long-vowel" },
  { word: "タクシー", gloss: "taxi", category: "カタカナ (katakana words)", lessonId: "u6-katakana-long-vowel" },
  // u7-wa-ga — question word. だれ lives here, not with なに/どこ in
  // u4-what-is-it, because it enters the course as a が-subject: the whole
  // point of the が card is that だれが…ですか takes a が-answer.
  { word: "だれ", gloss: "who", category: "ぎもんし (question words)", lessonId: "u7-wa-ga" },
  // u7-wo-ni — the course's first verbs, taught as whole polite 〜ます words.
  // Unit 8 conjugates these four and registers none of them again.
  { word: "かいます", stem: "かい", gloss: "buy", category: "どうし (verbs)", lessonId: "u7-wo-ni" },
  { word: "のみます", stem: "のみ", gloss: "drink", category: "どうし (verbs)", lessonId: "u7-wo-ni" },
  { word: "よみます", stem: "よみ", gloss: "read", category: "どうし (verbs)", lessonId: "u7-wo-ni" },
  { word: "いきます", stem: "いき", gloss: "go", category: "どうし (verbs)", lessonId: "u7-wo-ni" },
  // u7-wo-ni — nouns the particles need.
  { word: "みず", gloss: "water", category: "たべもの (food)", lessonId: "u7-wo-ni" },
  { word: "がっこう", gloss: "school", category: "ばしょ (places)", lessonId: "u7-wo-ni" },
  // u8-verb-masu-masen — the one genuinely new verb of Unit 8.
  { word: "たべます", stem: "たべ", gloss: "eat", category: "どうし (verbs)", lessonId: "u8-verb-masu-masen" },
  // u9-pointing — the counter transaction. Pointing words first, then the
  // verb Japanese uses where English says "have", then counting and price.
  // Prices are RECOGNITION only here: ひゃく and せん let the learner parse
  // what a till says. The five sound-changed joins (さんびゃく ろっぴゃく
  // はっぴゃく さんぜん はっせん) are named on the card so a bent one does not
  // sound like a different number, and are deliberately NOT registered —
  // they belong to the shop unit in intermediate, with a situation.
  { word: "これ", gloss: "this one", category: "しじご (pointing words)", lessonId: "u9-kore-sore-are" },
  { word: "それ", gloss: "that one near you", category: "しじご (pointing words)", lessonId: "u9-kore-sore-are" },
  { word: "あれ", gloss: "that one over there", category: "しじご (pointing words)", lessonId: "u9-kore-sore-are" },
  { word: "この", gloss: "this (before a noun)", category: "しじご (pointing words)", lessonId: "u9-kono" },
  { word: "ここ", gloss: "here", category: "しじご (pointing words)", lessonId: "u9-koko-soko" },
  { word: "そこ", gloss: "there by you", category: "しじご (pointing words)", lessonId: "u9-koko-soko" },
  { word: "あそこ", gloss: "over there", category: "しじご (pointing words)", lessonId: "u9-koko-soko" },
  { word: "あります", stem: "あり", gloss: "there is", senses: ["we have it"], category: "どうし (verbs)", lessonId: "u9-arimasu" },
  { word: "います", stem: "い", gloss: "there is someone", category: "どうし (verbs)", lessonId: "u9-imasu" },
  { word: "ひとつ", gloss: "one thing", category: "かぞえかた (counting)", lessonId: "u9-counters" },
  { word: "ふたつ", gloss: "two things", category: "かぞえかた (counting)", lessonId: "u9-counters" },
  { word: "みっつ", gloss: "three things", category: "かぞえかた (counting)", lessonId: "u9-counters" },
  { word: "えん", gloss: "yen", category: "おかね (money)", lessonId: "u9-how-much" },
  { word: "いくら", gloss: "how much", category: "ぎもんし (question words)", lessonId: "u9-how-much" },
  { word: "いくらですか", gloss: "how much is it", category: "ぎもんし (question words)", lessonId: "u9-how-much" },
  { word: "ひゃく", gloss: "hundred (100)", category: "かず (numbers)", lessonId: "u9-price-listen" },
  { word: "せん", gloss: "thousand (1000)", category: "かず (numbers)", lessonId: "u9-price-listen" },
  { word: "いらっしゃいませ", recognitionOnly: true, gloss: "welcome (the shop says it to you)", category: "あいさつ (greetings)", lessonId: "u9-price-listen" },
];

export function learnedVocab(completed: string[]): Vocab[] {
  return vocab.filter((v) => completed.includes(v.lessonId));
}

// Closed-class particles/copula/punctuation the tutor may use freely without
// it counting as "untaught vocabulary." One list — lib/ai/constraints.ts's
// prompt text, lib/ai/prompt.ts's turn constitution, and
// scripts/check-content.ts's scenario-vocab check all read this same array,
// instead of three separately-typed copies drifting apart
// (Lang-tutor-1.4.1-plan.md, Phase F). Lives here, not in lib/ai/constraints.ts,
// specifically so build-time scripts (no Next.js "server-only" aliasing) can
// import it without pulling that module in.
export const GLUE_TOKENS = [
  "です", "ます", "か", "は", "も", "と", "が", "の", "を", "に", "で", "よ", "ね", "。",
  // Unit 7 — the destination particle, said "e".
  "へ",
  // Unit 8 — the polite endings that swap onto a verb stem. Not derivable
  // from "ます": the strip is longest-match-first with no backtracking, and
  // "ません" does not start with "ます".
  "ません", "ました", "でした", "ありません",
  // Redundant for validation ("ません" + "でした" already reduces it) but kept
  // because GLUE_TOKENS is interpolated verbatim into the tutor prompt —
  // listing it tells the model in as many words that the past negative is on.
  "ませんでした",
] as const;
