import { randomInt } from "./random";

const CHARACTERS =
  "ﺍﺏﺕﺙﺝﺡﺥﺩﺫﺭﺯﺱﺵﺹﺽﻁﻅﻉﻍﻑﻕﻙﻝﻡﻥهـﻭﻱБВГДЖꙂꙀИЛѠЦЧШЩЪѢꙖѤЮѪѬѦѨѮѰѲѴҀňřšťůýÿžäëðöüăïîāņßķõőàèòùčēļșģìאבגדהוזחטיכלמנסעפצקרשתľơŕçởżğæœøåabcdefghijklmnñopqrstuvwxyz0123456789áéíóúαβγδεζηθικλμνξΟοΠπρςτυφχψωč";

/** Short seeds for varied catalog slices (Spotify matches track/album/artist text). */
const SEED_WORDS = [
  "jazz",
  "punk",
  "ambient",
  "folk",
  "blues",
  "salsa",
  "disco",
  "techno",
  "lofi",
  "indie",
  "metal",
  "reggae",
  "samba",
  "waltz",
  "mambo",
  "swing",
  "gospel",
  "cello",
  "violin",
  "drums",
  "bass",
  "piano",
  "acoustic",
  "remix",
  "live",
  "slow",
  "fast",
  "night",
  "summer",
  "winter",
  "love",
  "storm",
  "dream",
  "city",
  "road",
  "ocean",
  "fire",
  "gold",
  "silver",
  "neon",
  "vintage",
] as const;

function randomChar(): string {
  return CHARACTERS.charAt(randomInt(CHARACTERS.length))!;
}

function wildcardPattern(oneOrTwo: string): string {
  const mode = randomInt(3);
  if (mode === 0) {
    return oneOrTwo + "%";
  }
  if (mode === 1) {
    return "%" + oneOrTwo + "%";
  }
  return oneOrTwo;
}

function randomWildcardQuery(): string {
  if (randomInt(2) === 0) {
    return wildcardPattern(randomChar());
  }
  return wildcardPattern(randomChar() + randomChar());
}

function randomSeedWordQuery(): string {
  const word = SEED_WORDS[randomInt(SEED_WORDS.length)]!;
  const variant = randomInt(4);
  if (variant === 0) {
    return word + "%";
  }
  if (variant === 1) {
    return "%" + word + "%";
  }
  if (variant === 2) {
    return word + " " + randomChar() + "%";
  }
  return word;
}

/** Decade and shorter ranges for `year:` filter (Spotify search). */
function randomYearQuery(): string {
  const startDecade = 1950 + randomInt(8) * 10;
  const endDecade = startDecade + 9;
  const yearFilter = `year:${startDecade}-${endDecade}`;
  const mix = randomInt(4);
  if (mix === 0) {
    return `${yearFilter} ${randomChar()}%`;
  }
  if (mix === 1) {
    return `${yearFilter} ${SEED_WORDS[randomInt(SEED_WORDS.length)]!}`;
  }
  if (mix === 2) {
    return `${yearFilter} %${randomChar()}%`;
  }
  return yearFilter;
}

const STRATEGY_COUNT = 3;

/**
 * Random search query string for Spotify track search (diverse strategies).
 */
export function randomSearchQuery(): string {
  const strategy = randomInt(STRATEGY_COUNT);
  if (strategy === 0) {
    return randomWildcardQuery();
  }
  if (strategy === 1) {
    return randomSeedWordQuery();
  }
  return randomYearQuery();
}
