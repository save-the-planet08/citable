# Zwei Hero-Varianten

Beide per Doppelklick zu öffnen. Kein Server, kein `npm install`, nur einmal Netz für die
Schriften. Die Animation läuft beim Laden einmal durch — zum Wiederholen neu laden.

Nach der Regel aus `hero-archetypes`: die Idee wird aus der **generierbaren** Klasse
gewählt, nicht aus der kopierbaren. Es gibt keinen Bildgenerator, also wird gerechnet, was
zur Welt dieses Produkts gehört. Beide Varianten halten sich daran, sie zeigen nur
verschiedene Gegenstände.

## `hero-a.html` — Das Emblem zeichnet sich

Der Merkle-Baum entsteht Strich für Strich, von den Blättern zur Wurzel. Der Baum wird im
Skript gerechnet, nicht gezeichnet — auch der ungerade siebte Knoten, der zwei Ebenen weit
mitgetragen wird, ist echt.

Zeigt die **Maschinerie**. Stark, wenn der erste Eindruck „hier wird gerechnet" sein soll.

## `hero-d.html` — Der Mechanismus

Ein echter Text wird an den Leerzeilen geschnitten, die Absätze werden nummeriert, einer
bekommt seine Position. Die Absätze sind die der Aussage, die unter `wochenzeitung.eth` auf
Sepolia registriert ist.

Zeigt das **Versprechen**: „dieser Absatz stand an Position 5 von 7." Näher am Produkt als
an seinem Datenmodell.

## Was gebaut ist

**D**, in `frontend/src/components/Hero.tsx`, auf Englisch statt Deutsch — die Oberfläche
ist durchgehend englisch, deutsch ist nur das zitierte Material. Umbauen auf A ist eine
Komponente, keine Architektur.

Begründung für D: Der Baum in A sagt, wie es funktioniert. Das steht ohnehin einen
Abschnitt tiefer, mit derselben Zeichnung und mehr Platz. Der Hero soll sagen, *was* das
Ding behauptet — und das ist eine Position in einem Text, kein Hashbaum.
