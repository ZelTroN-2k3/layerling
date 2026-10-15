---
title: Aan de slag
summary: Van een leeg vel naar je eerste onderdeel voor de 3D-printer, in vijf minuten, zonder account en zonder iets te installeren.
---

layerling is een ontwerpprogramma voor 3D-printen dat gewoon in je browser draait. Je bouwt een onderdeel op uit eenvoudige vormen, snijdt er gaten in, rondt de randen af en stuurt het naar je slicer. Er valt niets te installeren en je hoeft je nergens aan te melden. Wat je bouwt, blijft op je eigen computer.

![De startpagina van layerling: bovenaan "Nieuw 3D-ontwerp maken", daaronder je ontwerpen en de snelgids.](shot:start-page)

## Een ontwerp maken

Open [layerling.com](https://layerling.com/). Klik op de startpagina op {{ui:dashboard.createDesign}}. De editor opent met een leeg werkvlak, het raster waarop alles vorm krijgt.

Heb je al een bestand waarmee je verder wilt, gebruik dan {{ui:dashboard.importGeometry}}. Dat werkt voor layerling-ontwerpen (`.lyl`) en ook voor STL-, OBJ-, 3MF-, STEP- en SVG-bestanden.

Al je ontwerpen verschijnen later op de startpagina met een voorbeeldafbeelding. Ze worden bewaard in de opslag van je browser en na elke wijziging automatisch opgeslagen, dus er is geen knop om op te slaan. Hoe je ontwerpen in een bestand verpakt en doorgeeft, lees je in [Bestanden en opslaan](chapter:bestanden-en-opslaan).

## De editor in één oogopslag

![De editor met twee vormen op het werkvlak. Bovenaan het lint, links de camerabediening, rechts de instellingen van de geselecteerde vorm.](shot:editor-overview)

- **Bovenaan** staat het lint. Het is ingedeeld naar taak: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.manage}} en {{ui:editor.group.help}}. Houd de muis boven een pictogram om de naam te zien. Overal waar je een klein vraagteken ziet, bijvoorbeeld in de instellingen van een vorm, in de vormenbibliotheek of in de gereedschapspanelen, kom je daarmee direct bij het bijbehorende hoofdstuk van deze handleiding.
- **In het midden** ligt het werkvlak. Hier zet je vormen neer, trek je ze in model en zie je het resultaat.
- **Rechts** verschijnen de instellingen van de geselecteerde vorm: kleur, afmetingen, positie en wat de vorm verder bepaalt. Getallen typen is nauwkeuriger dan slepen.
- **Links** staat de camerabediening, met de weergavekubus erboven. Daarmee beweeg je door de scène, meer daarover in [Weergave en werkvlak](chapter:weergave-en-werkvlak).
- **Helemaal bovenaan** wissel je tussen {{ui:editor.modeGeometry}} en {{ui:editor.modeSketch}}, geef je het ontwerp een andere naam en kies je taal en kleurenschema.

## Je eerste onderdeel

Als voorbeeld bouwen we een blok met een gat.

1. Klik in het lint op {{ui:editor.addShape}} en kies {{ui:shape.box}}. De vorm hangt nu aan je muisaanwijzer. Met een klik op het werkvlak zet je hem neer.
2. Stel rechts de afmetingen in, bijvoorbeeld 40 mm lang, 40 mm breed en 20 mm hoog.
3. Zet op dezelfde manier een {{ui:shape.cylinder}} in het midden, 14 mm doorsnede en 30 mm hoog. Hij moet hoger zijn dan het blok, zodat hij er helemaal doorheen steekt.
4. Selecteer de cilinder en klik rechts op {{ui:inspector.hole}}. Hij wordt doorzichtig: het lichaam is een gereedschap geworden dat materiaal weghaalt.
5. Selecteer beide vormen en klik op {{ui:editor.tool.group}}. Het blok heeft nu een gat.

![De cilinder is een gat en steekt boven het blok uit.](shot:hole-before)

![Na het groeperen heeft het blok een boring.](shot:hole-after)

Zo maak je boringen, sleuven en kamers. Het hoofdstuk [Lichamen en gaten](chapter:lichamen-en-gaten) legt het uitgebreid uit.

## Nieuw sinds je laatste bezoek

Open je layerling opnieuw na een update, dan toont een kaart op de startpagina wat er is bijgekomen sinds je hier het laatst was: elke versie sindsdien, de nieuwste eerst. Na een lange afwezigheid scrol je binnen de kaart naar beneden. Daaronder voegt {{ui:whatsNew.earlier}} ook de versies van vóór je laatste bezoek toe. Sluit hem met {{ui:whatsNew.dismiss}} en hij blijft weg tot de volgende update. {{ui:whatsNew.footerLink}} onderaan de startpagina toont de nieuwste toevoegingen op elk moment opnieuw. De browser onthoudt de laatste versie die je hebt gezien, en niets over jou verlaat de browser.

Op een kopie van layerling op je eigen computer of server heeft de melding "Update beschikbaar" een knop, {{ui:update.previewShow}}, die laat zien wat de update brengt voordat je hem installeert. De lijst wordt pas bij GitHub opgehaald als je op de knop drukt.

## Van ontwerp naar print

Is je onderdeel klaar, klik dan op {{ui:editor.export}}, kies STL of 3MF en download het bestand. Open het in je slicer, bijvoorbeeld Bambu Studio, PrusaSlicer, OrcaSlicer of Cura. Kies je in de instellingen je printer, dan zie je al tijdens het bouwen of het onderdeel op het printbed past. Meer in [Printen](chapter:printen).

> **Tip:** Kom je van Tinkercad, dan vind je snel je weg: plaat, vormen, lichaam en gat, groeperen, uitlijnen en spiegelen werken bijna hetzelfde. Nieuw zijn vooral afschuinen en afronden, uithollen, schroefdraad en schetsen.
