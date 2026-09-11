// The statement the landing page points at.
//
// Real, not filler: this is statements/wochenzeitung/anhoerung.txt, registered on Sepolia
// under wochenzeitung.eth at root 0xa2ea6730…. Somebody who reads the hero and then types
// one of these paragraphs into the form gets a proof, because it is the same text.
//
// Kept here rather than fetched: the hero is in the LCP path and must not wait on a
// network round trip to say what the product does. What it shows is illustration; the
// proof still comes from the chain and the bundle, like any other quote.
export const DEMO_NAME = "wochenzeitung.eth";

export const DEMO_ROOT = "0xa2ea6730bdfce31305c0b43b999aa2a430cacf97324b3329bd4e56c1891ebc4b";

/** The paragraph the hero points at — the one used in the worked example. */
export const DEMO_HIT = 4;

export const DEMO_PARAGRAPHS = [
  "Die Behauptung, das Gesetz sei ohne Anhörung beschlossen worden, ist falsch.",
  "Am 14. März fand eine öffentliche Anhörung mit siebzehn Sachverständigen statt. Das Protokoll umfasst 240 Seiten und liegt seit dem 20. März öffentlich vor.",
  "Eingeladen waren neun Verbände, fünf Hochschulen und drei Aufsichtsbehörden. Die Liste der Geladenen stand vier Wochen vorher fest und wurde nicht nachträglich geändert.",
  "Richtig ist, dass die Frist zwischen Anhörung und Abstimmung kurz war. Vier Werktage sind wenig für eine Vorlage dieses Umfangs, und wir haben das im Ausschuss auch so gesagt.",
  "Von den siebzehn Sachverständigen haben elf schriftlich Stellung genommen. Zwei dieser Stellungnahmen sind in den Ausschussbericht eingeflossen, die übrigen nicht.",
  "Wir halten diese Frist weiterhin für zu kurz. Das ist eine Kritik am Verfahren und keine Behauptung, das Verfahren habe nicht stattgefunden.",
  "Wer daraus macht, es habe gar keine Anhörung gegeben, zitiert uns nicht verkürzt, sondern falsch.",
] as const;
