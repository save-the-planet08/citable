/**
 * Fabricated quotations that are still in circulation.
 *
 * Every line here is checkable. A page about quoting correctly that invents a quotation to
 * make its point has argued against itself, so nothing in this file may be written from
 * memory — `source` is the reason each entry is allowed to appear.
 *
 * `lines` is hand-wrapped because SVG text does not wrap. Change the card width and the
 * breaks have to be reset by hand.
 */
export type Misquote = {
  who: string;
  lines: string[];
  /** The quotation cut to a line, for the still list. */
  short: string;
  /** Shown where the card stood, in the moment it breaks. */
  debunk: string;
  /** The citation, at length. */
  source: string;
};

export const MISQUOTES: Misquote[] = [
  {
    who: "ALBERT EINSTEIN",
    lines: [
      "“The definition of insanity is",
      "doing the same thing over and",
      "over and expecting different",
      "results.”",
    ],
    short: "“The definition of insanity…”",
    debunk: "Earliest trace 1981. He died in 1955.",
    source:
      "Earliest known appearance in Narcotics Anonymous literature, 1981, and in Rita Mae " +
      "Brown’s novel Sudden Death, 1983. Einstein died in 1955. — Quote Investigator",
  },
  {
    who: "MAHATMA GANDHI",
    lines: ["“Be the change you wish", "to see in the world.”"],
    short: "“Be the change you wish to see in the world.”",
    debunk: "In none of his collected works. NYT, 2011.",
    source:
      "Not found in his collected works. The closest he wrote is “If we could change " +
      "ourselves, the tendencies in the world would also change.” — Brian Morton, " +
      "“Falser Words Were Never Spoken”, The New York Times, 29 August 2011",
  },
  {
    who: "NELSON MANDELA",
    lines: [
      "“Our deepest fear is not that we",
      "are inadequate. Our deepest fear",
      "is that we are powerful beyond",
      "measure.”",
    ],
    short: "“Our deepest fear…”",
    debunk: "Marianne Williamson, 1992. His foundation denied it.",
    source:
      "Written by Marianne Williamson in A Return to Love, 1992, and quoted as Mandela’s " +
      "in commencement speeches for years. The Nelson Mandela Foundation published a " +
      "denial. — nelsonmandela.org",
  },
  {
    who: "MARIE ANTOINETTE",
    lines: ["“Let them eat cake.”"],
    short: "“Let them eat cake.”",
    debunk: "Rousseau wrote it in 1765. She was nine.",
    source:
      "Rousseau attributes “qu’ils mangent de la brioche” to an unnamed great princess in " +
      "Confessions, Book VI, written around 1765. Marie Antoinette was nine years old and " +
      "had not yet come to France.",
  },
  {
    who: "VOLTAIRE",
    lines: [
      "“I disapprove of what you say,",
      "but I will defend to the death",
      "your right to say it.”",
    ],
    short: "“I disapprove of what you say…”",
    debunk: "Evelyn Beatrice Hall wrote it in 1906.",
    source:
      "Written by Evelyn Beatrice Hall in The Friends of Voltaire, 1906, as her own " +
      "summary of his attitude — not as a quotation from him.",
  },
];

/** The measurement the hero throws at them. */
export const SPREAD_STUDY = {
  claim: "A lie reaches 1,500 people six times faster than the truth.",
  detail:
    "Vosoughi, Roy & Aral: 126,000 stories, 3 million people, eleven years of Twitter. " +
    "Falsehoods were 70 % more likely to be shared than the truth.",
  cite: "MIT, Science, 9 March 2018.",
  url: "https://www.science.org/doi/10.1126/science.aap9559",
};
