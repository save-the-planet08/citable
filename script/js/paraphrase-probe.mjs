// Is the weak English result the corpus, or the model's direction?
import { AutoModelForSequenceClassification, AutoTokenizer } from "@xenova/transformers";
const M = "Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7";
const tok = await AutoTokenizer.from_pretrained(M);
const mdl = await AutoModelForSequenceClassification.from_pretrained(M);
const L = mdl.config.id2label;
const ei = Object.keys(L).find(k => L[k].toLowerCase().startsWith("entail"));
const sm = xs => { const m=Math.max(...xs); const e=xs.map(x=>Math.exp(x-m)); const s=e.reduce((a,b)=>a+b,0); return e.map(x=>x/s); };
const j = async (p,h) => { const i = await tok(p,{text_pair:h,truncation:true}); const {logits}=await mdl(i); return sm(Array.from(logits.data))[ei]; };

const EN = "Revenue rose by four percent in the last quarter.";
const DE = "Im vergangenen Quartal stieg der Umsatz um vier Prozent.";

const rows = [
  ["EN prem / EN paraphrase A", EN, "Turnover was up four percent over the past quarter."],
  ["EN prem / EN paraphrase B", EN, "Sales grew four percent in the last quarter."],
  ["EN prem / EN paraphrase C", EN, "In the last quarter, revenue increased by four percent."],
  ["EN prem / EN reworded D",   EN, "The company's revenue rose four percent last quarter."],
  ["EN prem / DE translation 1", EN, "Der Umsatz stieg im letzten Quartal um vier Prozent."],
  ["EN prem / DE translation 2", EN, "Im letzten Quartal stieg der Umsatz um vier Prozent."],
  ["EN prem / ES translation",   EN, "Los ingresos aumentaron un cuatro por ciento en el último trimestre."],
  ["-- reverse direction --", null, null],
  ["DE prem / EN translation",  DE, "Revenue rose by four percent last quarter."],
  ["DE prem / DE paraphrase",   DE, "Der Umsatz legte im letzten Quartal um vier Prozent zu."],
  ["DE prem / ES translation",  DE, "Los ingresos aumentaron un cuatro por ciento el trimestre pasado."],
];
for (const [label, p, h] of rows) {
  if (!p) { console.log(label); continue; }
  console.log(`${label.padEnd(28)} ${(await j(p,h)).toFixed(4)}`);
}
