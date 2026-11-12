# PLAN – JAMAL – Pfand Quest

## Architektur

```
src/
  main.ts            Phaser-Konfiguration, Integer-Scaling, Szenenliste
  config.ts          Globale Konstanten (Auflösung 384x216, Tilegröße 16)
  physics/           Reine TS-Physik ohne Phaser-Abhängigkeit (testbar mit Vitest)
    collision.ts     AABB-gegen-Tilegrid, Einweg-Plattformen, Ecken-Korrektur
    player.ts        Spieler-Controller: Trägheit, Sprint, variable Sprunghöhe,
                     Coyote Time, Jump Buffer (feste Schrittweite 1/60 s)
  levels/            Level als Daten (ASCII-Arrays in TS), Loader, Validator
  entities/          Spieler, ZYROO-Varianten, Boss, Items, Plattformen, Blöcke
  gfx/               Prozedurale Pixel-Art: Palette, Sprites (String-Bitmaps),
                     Tilesets mit Autotiling, Parallax-Hintergründe, Pixel-Font
  audio/             Web-Audio-Engine, Chiptune-Sequencer, Songs, SFX-Synthese
  ui/                Menüs, HUD-Helfer, Touch-Steuerung, Iris-Übergang
  utils/             Pfand-Zähler, Speichern (localStorage), Eingabe, RNG
  scenes/            Boot, Titel, Weltkarte, Spiel, HUD, Pause, Optionen,
                     Game Over, Abspann
```

### Kernentscheidungen
- **Eigene Plattformer-Physik** (in `src/physics`), deterministisch mit fester Schrittweite.
  Phaser Arcade Physics ist für präzises Plattformer-Gefühl (Coyote Time, Ecken-Korrektur,
  Einweg-Plattformen, getragen werden von Plattformen) zu grob und schwer testbar.
  Dieselbe Physik wird vom Level-Validator benutzt → Durchspielbarkeit ist bewiesen.
- **Phaser** übernimmt Rendering (Tilemap, Sprites, Partikel), Szenen, Kamera, Tweens.
- **Alle Assets prozedural**: Sprites als Zeichen-Bitmaps + Paletten, zur Laufzeit in
  Canvas-Texturen gerendert. Musik/SFX per Web Audio synthetisiert.
- **Eingabe** über eigenen Controls-Manager: Tastatur (neu belegbar), Gamepad API,
  Touch (DOM-Overlay, Multi-Touch).
- **CRT-Filter** als CSS-Overlay (funktioniert in WebGL und Canvas).

## Meilensteine
1. Physik + Jamal + Testlevel (Spielgefühl), Unit-Tests für Physik
2. Alle ZYROO-Varianten, Blöcke, Items, Pfandflaschen
3. Alle 8 Level, 4 Bosse, Weltkarte, Level-Validator
4. Audio, Menüs, Speichern, Touch/Gamepad, Tastenbelegung
5. Polish (Partikel, Hit-Stop, Screenshake, Iris-Wipe), Performance, Bugfixing,
   Playwright-Smoke-Test, README
