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

## Reihenfolge — was daraus wurde

### 1. IPFS ganz ✅

`lib/citable/cid.mjs` rechnet die CID ohne kubo, gegen kubo 0.43.0 bewiesen.
`script/js/publish.mjs` geht den ganzen Weg und sendet erst, wenn drei Dinge halten: die
CID stimmt mit kubo überein, die aus IPFS zurückgelesenen Bytes bauen die Wurzel nach, und
der deployte Contract nimmt einen Beweis an der richtigen Position an und an der falschen
nicht. Pinata bleibt nachgelagert und ist eine Umgebungsvariable.

### 2. Demo-Aussage on-chain ✅ — und der bessere Weg war offen

Der ENSv2-Registrar auf Sepolia nimmt ein Test-USDC mit öffentlichem `mint`.
**`wochenzeitung.eth` gehört jetzt dem Deployer**, also blieb der Guard scharf und die drei
Transaktionen mit Guard-Abschalten waren nicht nötig. `script/js/ens-register.mjs` macht
das reproduzierbar. Zwei Aussagen registriert, beide unter diesem Namen.

### 3. Stufe 3 im Browser ✅ — vorgezogen

Bewusst vor den Design-Durchgang geholt, weil es das technisch riskanteste Stück war. Das
war richtig: es hat nicht funktioniert, und der Grund lag tief. `transformers.js` liest
beim Import `fs`, Turbopack übersetzt Node-Builtins im Browser zu `void 0`, und
`Object.keys(void 0)` tötete die Bibliothek vor dem ersten Modell-Byte. `resolveAlias` half
nicht. Jetzt kommt sie zur Laufzeit vom CDN.

Im Browser gegen die echte Registry gemessen: Übersetzung 0,8253 (CONCEPT.md maß 0,821 in
Node), „vierzig Prozent" wird von der Wertprüfung gar nicht erst bewertet, Falschzitat 9 %.

### 4. Registrieren-Screen ✅

Der Browser rechnet für `anhoerung.txt` dieselbe Wurzel und dieselbe CID wie
`publish.mjs` — geprüft. Bündel-Download ist Pflicht vor der Transaktion.

### 5. Design-Durchgang ✅

Fünf Abschnitte, zwei bewegt. Zwei Hero-Varianten liegen in `design/hero/` zur Wahl.

### 6. Author-Screen ❌

Nicht gebaut. Steht auf der Streichliste und ist dort geblieben.

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

## Stand

| | |
|---|---|
| Contracts | deployt, verifiziert, Guard scharf und nie abgeschaltet |
| `forge test` | 55 grün · `npm test` 60 grün · `next build` ohne Warnung |
| ENS-Name | `wochenzeitung.eth`, wirklich registriert |
| On-chain registriert | **2 Aussagen** |
| IPFS | Schreiben und Lesen bewiesen · kein Gateway hält die CIDs |
| Stufe 1 + 2 | im Browser gegen die Kette geprüft |
| Stufe 3 im Browser | läuft, reproduziert die gemessenen Zahlen |
| Registrieren-Screen | steht |
| Landingpage | steht |
| Author-Screen | gestrichen |

`CitableRegistry` `0xD3B137b6c6f572290Cf91ac312319364822792e7`
`ENSv2NameGuard` `0x67732407626BCb5D5610887EC97782c610F5E8d2`
`owner` `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` (immutable)

## Was jetzt noch fehlt und nur Frederik kann

| | |
|---|---|
| Pinata | `PINATA_JWT` in `.env`, dann pinnt `publish.mjs` zusätzlich dorthin |
| Vercel | `next build` erzeugt nur statische Routen, `NEXT_PUBLIC_SEPOLIA_RPC_URL` setzen |
| Video | seins |
| Einreichungsformular | seins, inklusive der ehrlichen Angabe zur KI-Nutzung |
| Hero-Variante | A oder D, siehe `design/hero/README.md` |
