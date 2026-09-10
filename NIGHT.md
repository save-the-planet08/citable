# Die Nacht — das Produkt fertigbauen

Laufendes Kapitel ab Do 10.09. abends. Abgabe **Mi 16.09.** Auftrag von Frederik: alles
bauen, was ohne sein Handeln möglich ist.

---

## Der Design-Brief

Frederiks Worte, sinngemäß: *Vertrauen schaffen. Im Stil einer Zeitung. Der Gegensatz zu
Social Media. Sehr aufgeräumt, sehr neutral, mit Animationen. Anti-KI-mäßig. Leicht
futuristisch. Inklusive Bilder und Animationen — und bei jedem neuen Abschnitt eine
andere Animation, keine Wiederholung.*

### Der Widerspruch darin, und wie er aufgelöst wird

„Zeitung" und „Anti-KI" ziehen gegeneinander. Der Broadsheet-Look — Haarlinien, null
Radius, enge Spalten, Serifen-Kopfzeile, Creme-Papier — ist **einer der drei Looks, die
KI-Bildgeneratoren und -Modelle von selbst produzieren**, unabhängig vom Thema. Wer
„Zeitung" sagt, bekommt von einem Modell fast zwangsläufig ein Faksimile, und das liest
sich als generiert, nicht als vertrauenswürdig.

**Die Auflösung:** Das Vertrauen einer Zeitung kommt nicht von ihrer Optik, sondern von
ihrem **Apparat** — Quellenangabe, Datum, Autor, Korrekturspalte, und die Bereitschaft,
die eigene Unsicherheit zu beziffern statt zu verschweigen. Genau das ist bereits die
Substanz dieses Produkts: Stufe 3 sagt „Messung, kein Beweis", die Abwesenheitsaussage
nennt ihren Nenner, `withdrawn` wird angezeigt ohne den Beweis zu brechen.

Also: **die Zeitung als Institution, nicht als Layout.** Ein Messinstrument mit
journalistischer Haltung. „Leicht futuristisch" ist damit kein Gegensatz, sondern die
richtige Ergänzung — das Gerät ist neu, die Haltung ist alt.

Konkret heißt „Anti-KI": kein Creme-Papier mit Terrakotta-Akzent, kein Fast-Schwarz mit
Neon-Akzent, kein Broadsheet-Pastiche. Wo der Brief eine Achse offen lässt, wird sie nicht
mit einem dieser Defaults gefüllt.

### Bilder

**Es gibt keinen Bildgenerator.** Was gebaut werden kann: SVG, Canvas, generative Grafik,
Diagramme, Typografie als Bild. Für dieses Produkt ist das ohnehin richtiger als
Stockfotos — ein Register über Zitate illustriert man nicht mit Menschen an Laptops.

### Animationen

Frederik will **pro Abschnitt eine andere**, ohne Wiederholung. Die tragfähige Lesart:
Jeder Abschnitt bekommt die Bewegung, die **zu ihm gehört**, nicht eine beliebige andere.
Eine Animation, die nichts über ihren Abschnitt sagt, ist Dekoration und fliegt raus —
auch wenn dann zwei Abschnitte ähnlich bleiben. Bewegung, die nur Abwechslung ist, liest
sich selbst als KI-generiert.

`prefers-reduced-motion` wird respektiert. Das ist nicht verhandelbar.

---

## Reihenfolge

Nach jedem Schritt steht etwas Vorzeigbares. Bricht die Nacht ab, ist trotzdem etwas fertig.

### 1. IPFS ganz

`kubo` ist installiert (`brew install kubo`, Repo unter `~/.ipfs` initialisiert, **kein
Daemon läuft**). Damit echte CIDs ohne Konto.

- `script/js/publish.mjs`: Text → `buildBundle` → IPFS → CID → `registerRoot`
- Lokal beweisen: hochladen, über Gateway zurückholen, `verifyBundle` gegen die Wurzel
- Pinata ist **nachgelagert**, nicht blockierend: Steht `PINATA_JWT` in `.env`, wird
  zusätzlich dorthin gepinnt, damit die CID auch fremd erreichbar ist

### 2. Demo-Aussage on-chain

Der Guard ist scharf, also braucht `registerRoot` einen ENS-Namen. Zwei Wege:

- **Sicher:** Guard auf `address(0)`, registrieren, Guard wieder setzen. Drei
  Transaktionen, ~0,001 ETH. **Frederik hat das freigegeben.**
- **Besser fürs Video:** einen echten Namen in der ENSv2-Registry auf Sepolia besorgen.
  Der Weg ist ungeklärt — über die `LabelRegistered`-Events der Registry rückverfolgbar,
  siehe `script/js/ens-probe.mjs`. Versuchen; wenn es hängt, den sicheren Weg nehmen und
  es sagen, statt daran zu kleben.

Danach zum ersten Mal der volle Ablauf: Name eingeben, Zitat eingeben, Stufe 1 grün.

### 3. Design-Durchgang am Verify-Screen

Was steht, ist tragfähige Struktur, kein fertiges Design. Der Brief oben gilt.

Zwei inhaltliche Entscheidungen, die **bleiben** sollen, weil sie aus `CONCEPT.md` folgen:
„bewiesen" ist nicht grün (es geht um *festgestellt*, nicht um *gut*), und die drei Stufen
unterscheiden sich in der **Materialität**, nicht nur in der Farbe — Stufe 3 darf nie wie
ein Beweis aussehen.

### 4. Registrieren-Screen

Wallet verbinden, Text eingeben, Segmentierung live zeigen, Bündel bauen, CID, `registerRoot`.
Der Screen, der das Produkt erst zu einem Produkt macht.

### 5. Stufe 3 im Browser

`@xenova/transformers`, beide Modelle aus `CONCEPT.md` 7: `multilingual-e5-small` für die
Kandidatensuche, `mDeBERTa-v3-base-xnli` für die Deckung. Logik aus
`script/js/entailment-eval.mjs`, inklusive `unsupportedTokens` aus `script/js/guards.mjs`.

Zusammen ~400 MB Download. Erst auf Klick laden, mit sichtbarem Fortschritt.

### 6. Author-Screen

Steht auf der Streichliste, ist aber klein: `rootsByAuthor` und die Namenssuche gibt es
schon.

---

## Grenzen — was ohne Frederik nicht geht

| | |
|---|---|
| Konten anlegen | Pinata, Vercel, ETHGlobal |
| Transaktionen | jede einzeln freigeben, auch auf Sepolia |
| Sein Browser | Wallet bestätigen, irgendwo einloggen |
| Video, Einreichungsformular | seins |
| Was gestrichen wird | seine Entscheidung |

Der Browser ist über die Chrome-Extension **nicht** erreichbar. Für visuelle Kontrolle
Playwright installieren und selbst Screenshots machen — sonst wird blind gebaut.

---

## Was nicht kaputtgehen darf

- `forge test` 55 grün, `npm test` 43 grün. Bei jedem Schritt.
- `lib/citable/` wird **importiert, nie kopiert und nie verändert**. Die Blattformel und
  die Segmentierung sind die zwei Invarianten aus `CLAUDE.md`.
- Das *n* in „Absatz i von n" kommt aus dem Bündel, **nie** aus `segmentCount`.
- Ein Bündel, das die Wurzel nicht nachbaut, wird nicht angezeigt — sonst könnte jeder den
  Inhalt hinter einer CID tauschen.
- Keine Abwesenheitsaussage ohne sichtbaren Nenner.
- Mindestens ein aussagekräftiger Commit pro Arbeitstag; ETHGlobal kann Einreichungen mit
  einem einzigen großen Commit disqualifizieren.

---

## Stand beim Übergang

| | |
|---|---|
| Contracts | deployt, verifiziert, Guard scharf |
| `forge test` | 55 grün · `npm test` 43 grün |
| Verify-Screen | Stufe 1 + 2, Namenssuche, gegen Fixture geprüft |
| On-chain registriert | **0 Aussagen** |
| IPFS | Lesen gebaut, nie gegen echte CID gelaufen · Schreiben fehlt |
| Stufe 3 im Browser | fehlt |
| Registrieren-Screen | fehlt |

`CitableRegistry` `0xD3B137b6c6f572290Cf91ac312319364822792e7`
`ENSv2NameGuard` `0x67732407626BCb5D5610887EC97782c610F5E8d2`
`owner` `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` (immutable)
