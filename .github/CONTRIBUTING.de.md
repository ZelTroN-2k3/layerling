# Mitmachen

*[English](CONTRIBUTING.md) · **Deutsch***

Danke, dass du layerling besser machen willst.

## Lokal einrichten

```bash
npm install
npm run dev
```

Die App läuft standardmäßig unter `http://127.0.0.1:3000/`.

## Bevor du einen Pull Request öffnest

- Halte Änderungen auf ein Thema begrenzt.
- Vermeide Umbauten, die nichts damit zu tun haben.
- Führe `npm run typecheck` aus.
- Teste den Editor-Ablauf, den du geändert hast, von Hand.
- Füge bei Änderungen an der Oberfläche nach Möglichkeit Bildschirmfotos oder kurze Aufnahmen bei.
- Weise auf Änderungen an Speicherung, Import, Export, Gruppierung oder Rückgängig/Wiederholen ausdrücklich hin.

## Bereiche, die Sorgfalt verlangen

- STL-Import und -Export
- Transformationen importierter Netze
- Gruppieren, Abziehen von Löchern und Auflösen
- Rückgängig-Verlauf
- Projektspeicherung und Vorschaubilder im Dashboard
- Anfasser an Formen, Einrasten und Maße gedrehter Objekte

## Stil

- Nutze vorhandene Muster des Projekts, bevor du neue Abstraktionen einführst.
- Halte Verhalten der Oberfläche in der zuständigen Komponente, solange es nicht geteilt wird.
- Verwende TypeScript-Typen statt lose geformter Objekte, wo es sinnvoll ist.
- Halte Kommentare kurz und nützlich.

## Lizenz für Beiträge

Sofern nicht ausdrücklich schriftlich anders vereinbart, lizenzierst du deinen Beitrag mit dem Einreichen unter der GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). Siehe [LICENSE](../LICENSE).
