# JAMAL – Pfand Quest

Ein eigenes 2D-Jump'n'Run im Stil klassischer 80er/90er-Plattformer – komplett im Browser,
auf Desktop und Mobilgerät. Jamal, ein Held mit Sombrero, dickem Schnurrbart und rot-grünem
Poncho, sammelt Pfandflaschen und stellt sich den grimmigen, langbärtigen **ZYROOs**.

Alle Grafiken, Musikstücke und Soundeffekte werden **zur Laufzeit im Code erzeugt** –
es gibt keine externen Assets, kein Backend und keine Downloads.

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver: http://localhost:5173
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # gebauten Stand lokal ansehen (http://localhost:4173)
```

Qualität:

```bash
npm test               # Vitest: Physik, Pfand-Zähler, Sprite-Daten, Level-Validator
npm run validate-levels # nur Level-Durchspielbarkeit
npm run lint           # ESLint
npx playwright install chromium   # einmalig
npm run test:e2e       # Playwright: Smoke-Test + Systemtests (Ziel, Bonusraum, Tod, alle Bosse)
```

## Steuerung

| Aktion            | Tastatur (Standard)       | Gamepad              | Touch             |
|-------------------|---------------------------|----------------------|-------------------|
| Laufen            | ← → / A D                 | Steuerkreuz / Stick  | D-Pad links       |
| Ducken / Brunnen  | ↓ / S                     | Steuerkreuz ↓        | D-Pad ↓           |
| Springen          | Leertaste / W / ↑ / K     | A / B                | Button **A**      |
| Sprinten + Chili  | Shift / J                 | X / Y / Schultertasten | Button **B**    |
| Pause             | Esc / P                   | Start                | **II** oben rechts|

- Sprung kurz antippen = kleiner Hüpfer, gedrückt halten = hoher Sprung.
- **Ducken + Springen** auf einer Einweg-Plattform lässt Jamal hindurchfallen.
- Auf einem Brunnen **↓** drücken führt in einen versteckten Bonusraum.
- Tasten lassen sich unter **Optionen → Steuerung belegen** ändern. Gamepads werden automatisch erkannt.
- Auf Smartphones erscheint ein virtuelles D-Pad mit Sprung- und Aktionsbutton; im Hochformat
  wird ein Hinweis zum Drehen angezeigt.

## Spielinhalt

- **Jamal**: Klein → Groß (Taco) → Feuer (Chili, Charro-Look). Bei Treffer eine Stufe zurück und
  kurz unverwundbar (Blinken). Animationen: Stehen, Laufen, Sprinten, Springen, Fallen, Bremsen
  (mit Staub), Ducken, Schaden, Sieg-Pose, Tod.
- **ZYROO-Varianten**: Läufer, Panzer-ZYROO (Kochtopf, kickbar – räumt andere Gegner ab),
  Flieger-ZYROO (Bart-Propeller, Sinuskurve), Wurf-ZYROO (Bananenschalen), Stachel-ZYROO
  (nur mit Chili, Topf oder Goldenem Kaktus besiegbar).
- **MEGA-ZYROO** am Ende jeder Welt: 3 Phasen mit Trefferpunkte-Anzeige. Jede Welt bringt ein
  neues Angriffsmuster: Bart-Peitsche → Sprung-Schockwelle → Bananenregen → Feuerbart.
  Draufspringen kostet ihn einen Trefferpunkt, vier Chili-Treffer ebenfalls.
- **Pfandflaschen** statt Münzen: jede Flasche 0,25 €, 100 Flaschen (25,00 €) = Extraleben
  mit „Kassenbon-Ping“.
- **Blöcke**: Piñata-Blöcke (Konfetti + Inhalt), Ziegel (klein wackeln, groß zerbrechen),
  Mehrfach-Ziegel mit 8 Flaschen, unsichtbare Blöcke.
- **Items**: Taco, Chili, Goldener Kaktus (10 s unverwundbar + eigener Musiktrack), Lucha-Maske (1-Up).
- **Welten**: Desierto, Mercado, La Mina (dunkel, mit Laternenlicht und Loren), Pirámide & Volcán –
  je 2 Level + Bossarena, jedes Level mit Checkpoint (Agave-Fahne) und Ziel-Kaktus
  (je höher man ihn trifft, desto mehr Bonuspunkte).
- Fortschritt, Highscore und Einstellungen werden im `localStorage` gespeichert.

## Deployment

`npm run build` erzeugt einen statischen Ordner `dist/` mit relativen Pfaden (`base: './'`).
Er läuft offline und auf jedem statischen Hoster.

**GitHub Pages**

1. Repository auf GitHub anlegen und pushen.
2. `npm run build`, dann den Inhalt von `dist/` in einen Branch `gh-pages` veröffentlichen, z. B.:
   ```bash
   npx gh-pages -d dist
   ```
   oder per GitHub Action (`actions/upload-pages-artifact` mit `path: dist`).
3. In den Repository-Einstellungen unter *Pages* den Branch `gh-pages` auswählen.

**Netlify**

- Build-Befehl: `npm run build`, Veröffentlichungsordner: `dist`.
- Alternativ den `dist/`-Ordner per Drag & Drop auf app.netlify.com/drop ziehen.

## Neue Level hinzufügen

Level sind reine Daten in `src/levels/world*.ts`: ein Array von Zeichenketten, eine Zeile pro
Kachelreihe (16×16 px), üblicherweise 14 Reihen hoch. Mit `join(...)` aus `src/levels/util.ts`
lassen sich Abschnitte nebeneinander setzen.

| Zeichen | Bedeutung                       | Zeichen | Bedeutung                         |
|---------|---------------------------------|---------|-----------------------------------|
| `.`     | leer                            | `X`     | Boden (automatische Kanten)       |
| `H`     | harter Block                    | `#`     | Ziegel                            |
| `?`     | Piñata mit Flasche              | `*`     | Piñata mit Taco/Chili             |
| `K`     | Piñata mit Goldenem Kaktus      | `M`     | Piñata mit Lucha-Maske            |
| `i`     | unsichtbare Piñata (1-Up)       | `$`     | Ziegel mit 8 Flaschen             |
| `=`     | Einweg-Plattform                | `^` `L` | Stacheln / Lava                   |
| `[` `]` | Brunnen oben (betretbar)        | `{` `}` | Brunnen-Schaft                    |
| `B`     | Pfandflasche                    | `@`     | Start                             |
| `C`     | Checkpoint                      | `G`     | Ziel-Kaktus (auf Bodenhöhe)       |
| `g p f t s` | ZYROO: Läufer, Panzer, Flieger, Werfer, Stachel | `Q` | Boss-Start          |
| `-` `v` | bewegliche Plattform horizontal/vertikal | `~` `c` | Fallplattform / Lore      |

Eine Ziffer direkt rechts von `-`, `v` oder `c` legt die Bewegungsweite in Kacheln fest (z. B. `-4`).

Ein neues Level als Objekt in das Welt-Array eintragen (`id`, `name`, `world`, `music`, `time`, `rows`,
optional `bonus: { rows, returnCol }`, `dark`, `hint`). Die Reihenfolge in `STAGES`
(`src/levels/index.ts`) bestimmt die Weltkarte; für zusätzliche Knoten `MAP_NODES` in
`src/scenes/MapScene.ts` erweitern.

Danach `npm run validate-levels` ausführen: Der **Level-Validator** simuliert mit der echten
Spielerphysik (klein und groß) Läufe und Sprünge aller Varianten – stehend, gehend, sprintend,
kurz/lang gedrückt, mit Richtungswechsel – von jeder erreichbaren Standposition aus und prüft,
dass Checkpoint und Ziel (bzw. Boss, Bonus-Ausgang) erreichbar sind. Lücken, Wände, Stacheln
und Lava, die nicht zu schaffen sind, lassen den Test fehlschlagen.

Debug: `?gallery=0` … `?gallery=4` in der URL zeigt alle generierten Sprites/Kacheln.

## Projektstruktur & Entscheidungen

```
src/physics   eigene Plattformer-Physik (rein, testbar)    src/levels   Level-Daten, Loader, Validator
src/entities  Jamal, ZYROOs, Boss, Items, Plattformen       src/gfx      prozedurale Pixel-Art, Font
src/audio     Web-Audio-Engine, Sequencer, Songs, SFX       src/ui       Text, Menüs, Iris-Wipe, Touch
src/scenes    Boot, Titel, Karte, Spiel, HUD, Pause, …      src/utils    Eingabe, Speichern, Pfand
```

Dokumentierte Entscheidungen:

- **Phaser 3.90.0** (exakt gepinnt) für Rendering, Szenen, Tilemaps, Partikel und Tweens.
  Für die Bewegung von Spieler und Gegnern wird **statt Arcade Physics eine eigene,
  deterministische Kachel-Physik** verwendet (`src/physics`). Grund: präzises Spielgefühl
  (Coyote Time 100 ms, Jump Buffer 120 ms, variable Sprunghöhe, höhere Fallschwerkraft,
  Ecken-Korrektur am Kopf, Einweg-/Beweg-/Fallplattformen) und – entscheidend – dieselbe Physik
  läuft in Unit-Tests und im Level-Validator. Feste Schrittweite 1/60 s, framerate-unabhängig.
- **Auflösung 384×216**, `pixelArt: true`; skaliert wird ganzzahlig in *Geräte*-Pixeln
  (auf HiDPI-Handys bleibt das Bild scharf), Rest schwarz (Letterboxing).
- **CRT-Filter** als CSS-Overlay (Scanlines + Vignette) – funktioniert mit WebGL und Canvas.
- **Audio**: eigener Sequencer mit Trompeten-Lead (zwei verstimmte Sägezähne, Filter, Vibrato),
  automatisch erzeugter Terz-Stimme (Mariachi-Satz), Gitarren-Strums und Guitarrón-Bass.
  Tracks: Titel, je Welt einer, Boss, Goldener Kaktus, Bonusraum, Weltkarte, Level geschafft,
  Game Over, Abspann. Audio startet erst nach der ersten Interaktion.
- **Kamera**: weiches Folgen mit Look-Ahead, in 1-1 kein Zurückscrollen; Bossarenen fest.
- **Performance**: Kachel-Culling der Tilemap, Partikel-Emitter (intern gepoolt),
  gepoolte Feuerbälle und Punkte-Popups, Gegner werden erst nahe dem Bildschirm aktiv.
- **Schwierigkeit**: 1-1 baut Laufen → Springen → Gegner → Blöcke → Items mit Hinweisen auf;
  später kommen Fallplattformen, Loren, Lava und Kombinationen aller Gegner dazu.
- Dies ist ein **eigenes Spiel**: alle Figuren, Namen, Grafiken, Melodien und Level-Layouts
  sind eigene Entwürfe.
