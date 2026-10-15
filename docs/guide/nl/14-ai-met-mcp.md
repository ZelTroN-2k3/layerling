---
title: Bouwen met een AI (MCP)
summary: Hoe een AI-assistent zoals Claude of Codex in je geopende editor vormen maakt en wijzigt, ze groepeert en afbeeldingen van de weergave maakt.
---

layerling heeft een MCP-server aan boord. MCP is een standaard waarmee een AI-assistent gereedschappen in andere programma's kan gebruiken. Daarmee ziet een AI-client zoals Claude of Codex een geopend editortabblad en werkt erin: hij maakt vormen, wijzigt maten, groepeert, snijdt, rondt randen af, leest de scène uit en maakt afbeeldingen van de weergave. Jij beschrijft het onderdeel, de AI bouwt het, jij kijkt mee en kunt op elk moment ingrijpen.

De brug tussen AI-client en editor draait **lokaal op je computer**. Houd er wel rekening mee: wat de AI leest, dus de scène en de afbeeldingen van de weergave, gaat naar de aanbieder van je AI-client, net als alle andere invoer daar.

> **Belangrijk:** De MCP-brug zit in de ontwikkelserver die je zelf op je computer start. Op layerling.com en in installaties met statische hosting staat hij uit. Een kopie die je zelf host, zoals de Docker-image op een NAS, kan hem aanzetten met een toegangstoken; zie "Een kopie op een NAS of server" hieronder.

## Instellen

1. Haal layerling op van [GitHub](https://github.com/henmedia/layerling) en start het in de projectmap met `npm run dev`. Node.js moet geïnstalleerd zijn. Op Windows regelt de snelstartregel in de README dat.
2. Open een editortabblad, bijvoorbeeld `http://127.0.0.1:3000/?editor=1`. Dat kun je aan de AI overlaten: als er geen editor open is, start het eerste gereedschap dat er een nodig heeft je browser met een editor en wacht tot die verbonden is. Dat werkt voor een layerling op je eigen computer; bij een kopie op een NAS of server moet je de editor zelf openen. Zet `LAYERLING_MCP_OPEN_EDITOR=0` voor de MCP-server om dit uit te schakelen.
3. Verbind je AI-client met de MCP-server. De client start die zelf met `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Niets te installeren: het project brengt een `.mcp.json` mee die de server registreert, en de skill onder `.claude/skills/layerling-mcp-skill`. Open de layerling-map in Claude Code en vraag bijvoorbeeld: "Gebruik de layerling-MCP-tools om mijn geopende editors op te sommen en de scène te bekijken."

### Claude Desktop

Claude Desktop leest geen projectbestanden. Voer de server in zijn eigen configuratie in. Gebruik als sjabloon `docs/mcp/claude-desktop-config.example.json` in het project en vervang het scriptpad door het absolute pad op je computer. Start Claude Desktop daarna opnieuw.

### Codex

Kopieer de skill uit `docs/skills/layerling-mcp-skill` naar je map met Codex-skills, voer de server in je Codex-configuratie in met behulp van `docs/mcp/codex-config.example.toml`, en start Codex opnieuw.

De uitgebreide instructies voor alle drie staan in de [README op GitHub](https://github.com/henmedia/layerling/blob/main/README.nl.md#layerling-mcp-skill).

## Een kopie op een NAS of server

Een kopie die je zelf host, kan een AI-client via het netwerk zijn geopende editors laten besturen. Standaard staat dat uit, omdat wie de brug kan besturen de geopende ontwerpen kan lezen en wijzigen. Zet op de server `LAYERLING_MCP_REMOTE` op `true` en `LAYERLING_MCP_TOKEN` op een geheim van minstens 16 tekens (voor de Docker-image in `environment:` van het compose-bestand; opnieuw bouwen is niet nodig). Open een editortabblad van die kopie en laat het open, en geef de MCP-client het adres en hetzelfde token: `LAYERLING_URL=http://nas:3000` en `LAYERLING_MCP_TOKEN=<the token>`.

Alleen een client met het token kan de editors opsommen of besturen. De editorpagina's hebben er geen nodig, maar ze tellen alleen mee onder een adres of naam die alleen je eigen netwerk kan gebruiken (een IP-adres, een naam zonder punt, of een die eindigt op `.local` of `.lan`); een echt domein achter een reverse proxy zet je in `LAYERLING_MCP_ALLOWED_HOSTS`. Gebruik het op een netwerk dat je vertrouwt, en HTTPS daarbuiten. De README heeft de details.

## Wat de AI kan

De AI werkt met dezelfde functies als jij, via dezelfde weg als jouw bediening in de editor. Nieuwe functies van layerling krijgen meteen hun MCP-actie. De gereedschappen:

| Gereedschap | Wat het doet |
| --- | --- |
| `layerling_list_editors` | somt de geopende editortabbladen op |
| `layerling_open_editor` | opent een nieuw editortabblad in je standaardbrowser en wacht tot het verbonden is (alleen op je eigen computer) |
| `layerling_read_scene` | leest scène, selectie, eenheden en de exacte maten van alle objecten |
| `layerling_list_objects` | somt alle objecten op met maten, positie, rotatie en id |
| `layerling_select_objects` | selecteert objecten |
| `layerling_delete_objects` | verwijdert objecten |
| `layerling_create_shape` | maakt een vorm: blok, cilinder, tekst (ook gebogen), schroefdraad, tandwiel, schetslichaam en alle andere |
| `layerling_import_file` | importeert een bestand zoals het importvenster dat doet, een gekleurde OBJ of 3MF als één lichaam per kleur, een 3MF met meerdere objecten als één lichaam per object |
| `layerling_add_font` | voegt een eigen lettertype voor tekst toe uit een TrueType-, OpenType- of WOFF-bestand; het blijft in de browser, een ontwerp bewaart alleen de letters die het gebruikt |
| `layerling_list_fonts` | somt de ingebouwde en de eigen lettertypen op, met id en naam |
| `layerling_import_mesh` | brengt een driehoeksmesh in het ontwerp |
| `layerling_update_object` | wijzigt maten, positie, kleur, naam, lichaam of gat en al het andere wat de vorm bepaalt, de letterrand van een tekst inbegrepen |
| `layerling_align_objects` | lijnt objecten ten opzichte van elkaar uit |
| `layerling_scale_objects` | schaalt objecten met een percentage, samen of elk op zijn plek |
| `layerling_lay_flat` | legt een object met één vlak op de plaat |
| `layerling_place_on_face` | zet objecten neer op een vlak van een ander, ook op schuine, zoals de C-toets |
| `layerling_perforate_face` | snijdt een gatenpatroon in een plat vlak; de gaten blijven gaten, gegroepeerd met het lichaam |
| `layerling_mate_faces` | brengt een vlak van het ene object tegen een vlak van een ander, vlak tegen vlak of gelijk |
| `layerling_open_group` | opent een groep zodat de onderdelen een voor een kunnen worden gewijzigd, ook een groep binnen een geopende groep |
| `layerling_close_group` | sluit hem weer ("Klaar") of annuleert |
| `layerling_group_objects` | groepeert objecten |
| `layerling_ungroup_objects` | heft groepen op |
| `layerling_boolean_cut` | snijdt lichamen met gaten |
| `layerling_intersect_objects` | houdt alleen over wat de objecten gemeen hebben (doorsnijding) |
| `layerling_separate_parts` | splitst een vorm in zijn losse delen |
| `layerling_split_objects` | snijdt lichamen of gaten met een vlak in tweeën |
| `layerling_list_edges` | somt de echte CAD-randen van een object op |
| `layerling_apply_edge_treatment` | schuint gekozen randen af of rondt ze af |
| `layerling_hollow_object` | holt een lichaam uit met een gelijkmatige wand |
| `layerling_array_objects` | vermenigvuldigt in een rij of op een cirkel |
| `layerling_bundle_objects` | bundelt objecten zoals Ctrl+B: ze bewegen samen, houden hun kleur en soort en gaan bij een export apart mee |
| `layerling_layer_text` | maakt van een tekst een stapel lagen voor een meerkleurenprint (letters, bredere randen, een plaat zonder gaten) of bouwt een stapel opnieuw op, met een sleutelringgat, de hoeken per laag en een afgeronde of afgeschuinde letterrand; met een namenlijst één label per naam |
| `layerling_layer_icon` | maakt van een SVG-pictogram (de tekst van het bestand, of een geëxtrudeerd schetslichaam) een gelaagd pictogramlabel voor een meerkleurenprint - het pictogram, bredere randen, een plaat zonder gaten - of bouwt er een opnieuw op met een nieuwe breedte of nieuwe lagen; met een aantal vult het de plaat met kopieën |
| `layerling_measure_section` | meet op een doorsnedevlak tussen twee punten die op de contour snappen - wanddikte, spleten, passingen |
| `layerling_show_overhangs` | zet de overhangarcering aan of uit, stelt de hoek in en meldt per lichaam het oppervlak dat support nodig zou hebben |
| `layerling_estimate_print` | schat volume, gewicht en filament voor de selectie of het hele ontwerp: voor een massief lichaam en als grove schatting met wanden en infill zoals in het exportvenster |
| `layerling_add_reference_points` | markeert referentiepunten - op het midden, de hoeken of de randmiddens van objecten, of op exacte posities - waarop vormen snappen |
| `layerling_list_reference_points` | somt de referentiepunten op met hun id's en posities |
| `layerling_remove_reference_points` | verwijdert referentiepunten op id, of allemaal |
| `layerling_inspect_errors` | toont de laatste melding en de laatste fout, plus de meldingen en fouten van de sessie |
| `layerling_wrap_around_cylinder` | wikkelt een plat liggend lichaam, bijvoorbeeld een SVG of tekst, om een cilinder, naar buiten of naar binnen als gravure |
| `layerling_simplify_mesh` | verlaagt het aantal driehoeken van een geïmporteerde mesh, tot een deel in procenten of tot een aantal driehoeken |
| `layerling_save_custom_shape` | bewaart lichamen als eigen vorm, op de server of in de browser, om ze in andere ontwerpen in te voegen |
| `layerling_list_custom_shapes` | somt de eigen vormen op de server en in de browser op |
| `layerling_insert_custom_shape` | voegt een eigen vorm in het geopende ontwerp in, desgewenst op een plek x/z |
| `layerling_delete_custom_shape` | verwijdert een eigen vorm; ingevoegde lichamen blijven staan |
| `layerling_show_workplane` | verbergt en toont de plaat met zijn raster, bijvoorbeeld voor een afbeelding van de onderkant (alleen de weergave) |
| `layerling_set_section_view` | snijdt de weergave open langs een vlak om naar binnen te kijken (alleen de weergave, er wordt niets doorgesneden) |
| `layerling_clear_history` | verwijdert definitief elke stap voor ongedaan maken, zoals de knop "Geschiedenis verwijderen" van de geschiedenisweergave; vereist `confirm: true` |
| `layerling_set_history_view` | kijkt terug naar een eerdere toestand van het project, zoals de geschiedenisweergave (het echte ontwerp blijft onaangeroerd; gereedschappen die iets wijzigen wachten tot hij gesloten is) |
| `layerling_export_section_svg` | geeft de contouren op een doorsnedevlak terug als SVG op 1:1, van dezelfde lichamen als de export |
| `layerling_export_drawing` | maakt de werkplaatstekening van de "2D"-export: drie aanzichten op 1:1 op een ISO-blad met buitenmaten en een tabel van de ronde boringen, als SVG-tekst of PDF |
| `layerling_set_workplane` | legt het werkvlak op een zijde van een lichaam of terug op de grondplaat, en verbergt of toont het |
| `layerling_capture_image` | maakt een afbeelding van de weergave: voorkant, bovenkant, zijkant, schuin vanuit een hoek en meer |

Zo kan de AI zichzelf controleren: hij maakt iets, maakt een afbeelding, kijkt en verbetert.

## Een voorbeeld

Je zegt: "Bouw een ronde doos van 60 mm doorsnede, 40 mm hoog met een wand van 2,5 mm, bovenaan open, plus een plat deksel met 'Thee' in een boog erop." De AI maakt de cilinders, holt er één uit, zet de gebogen tekst op het deksel en maakt aan het eind afbeeldingen om te zien of het past.

> **Tip:** Geef de AI concrete maten en vertel waar het onderdeel voor is ("houder voor een staaf van 12 mm, past op een Bambu Lab A1"). Dan neemt hij verstandiger beslissingen. En kijk mee terwijl hij bouwt: je kunt op elk moment zelf ingrijpen, want het is dezelfde editor.
