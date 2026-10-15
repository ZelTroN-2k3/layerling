---
title: Placer et ajuster les formes
summary: La bibliothèque de formes, dimensions par numéro et par poignée, couleur, rotation, effilage et torsion.
---

Chaque élément du layerling commence par une forme. À partir d'eux, vous construisez tout le reste : les formes se complètent, se découpent ou s'assemblent pour former une nouvelle forme.

## Ajouter une forme

Cliquez sur {{ui:editor.addShape}} dans le ruban. La bibliothèque de formes s'ouvre.

![La bibliothèque de formes. Chaque petite image est rendue à partir de la géométrie réelle de la forme.](shot:shape-menu)

Choisissez une forme. Il se bloque désormais sur le pointeur de la souris et atterrit là où vous cliquez. Déplacez-le sur un corps et il se couche sur le visage sous le pointeur, incliné également, comme Cruise dans Tinkercad ; au-dessus de l'assiette vide, il atterrit sur le plan de travail. [[Esc]] annule le placement. Un outil qui attend un clic, tel que le ruban à mesurer, le carré d'encadrement, une note, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} ou les outils de bord, est désactivé lorsque vous choisissez une forme, le clic place donc la forme. Dans l’autre sens, l’activation de l’un de ces outils remet la forme en place. Si vous préférez que la forme apparaisse au milieu de la plaque, vous pouvez désactiver le placement en cliquant dans les paramètres (zone {{ui:workspace.appearance}}, interrupteur {{ui:workspace.cruise}}).

Ce que propose la bibliothèque :

- **Formes de base :** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (trois à vingt-quatre côtés), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (avec trois à vingt-quatre côtés, donc à trois côtés également), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} et {{ui:shape.torus}}.
- **Tubes :** {{ui:shape.tube}} et {{ui:shape.bentTube}}, composés d'un maximum de douze pièces droites avec des coudes entre les deux, et le {{ui:shape.loft}} d'un contour à l'autre, disons du carré au rond.
- **Formes décoratives :** {{ui:shape.star}}, {{ui:shape.heart}} et {{ui:shape.crescent}}.
- **Lettrage :** {{ui:shape.text}}, également selon un arc de cercle. Plus dans [Texte](chapter:text).
- **Mécanique :** {{ui:shape.thread}} (tige congéée, vis, écrou et trou taraudé), {{ui:shape.spring}}, {{ui:shape.gear}} et le {{ui:shape.knurl}} pour les poignées. Plus d'informations dans [Threads et mécanique](chapter:threads-and-mechanics).
- **Pour les constructions :** les {{ui:shape.hinge}}, {{ui:shape.dovetail}}, les {{ui:shape.teardrop}} pour les trous horizontaux, les {{ui:shape.counterbore}} et {{ui:shape.countersink}} pour les têtes de vis et le {{ui:shape.ruler}}, qui n'est qu'un outil de mesure et n'apparaît jamais dans une exportation.

Vous obtenez un triangle de deux manières : le {{ui:shape.polygon}} à trois côtés est un triangle isocèle, le "Toit" de Tinkercad, et le {{ui:shape.wedge}} est un triangle rectangle. Les deux sont de véritables prismes triangulaires. Pour un trou triangulaire, copiez la forme, réduisez la taille de la copie, marquez-la comme un trou et alignez-la avec {{ui:editor.tool.centerOnWorkplane}} ou {{ui:editor.tool.align}}. Les deux fonctionnent avec le cadre de délimitation de la forme, le plus petit cadre qui l'entoure, de sorte qu'un carré divisé en deux compte toujours comme un carré entier. La recherche par commande ([[Ctrl]]+[[K]]) trouve également les deux formes sous « triangle » ou « toit ».

Le {{ui:shape.slot}} peut être plus étroit à une extrémité qu'à l'autre, par exemple pour une protection sur une courroie entre deux poulies. Sous {{ui:inspector.properties}}, définissez {{ui:prop.slotSmallEnd}} ; la grande extrémité est aussi large que la capsule, et les côtés vont droit d'un arc à l'autre. {{ui:prop.slotCentreDistance}} est la distance entre les centres des deux arcs, c'est-à-dire la distance entre les poulies. Changez le petit bout et l'entraxe reste, la capsule devenant plus longue ou plus courte. La capsule conique reste également un corps exact, pour les congé et les STEP.

## Les paramètres de la forme

Dès qu'une forme est sélectionnée, ses paramètres apparaissent à droite. En haut se trouve le nom ; le crayon à côté ({{ui:outliner.rename}}) vous permet d'en saisir un nouveau. [[Enter]] le conserve, [[Esc]] l'annule et un nom vide ramène le nom par défaut de la forme. Plus à droite, le cadenas verrouille la forme contre tout déplacement accidentel et l'œil la cache. La flèche à l'extrême gauche replie les paramètres jusqu'à leur barre de titre.

Les paramètres sont ancrés sur le bord droit. S'ils couvrent quelque chose que vous souhaitez voir, faites-les glisser par leur barre de titre et ils flotteront partout où vous les déposez ; ils y restent également pour la forme suivante. Déposez-les en haut à droite ou double-cliquez sur la barre de titre et ils s'ancrent à nouveau. Lorsqu'ils flottent ou sont repliés, l'étape d'accrochage se déplace du bas des paramètres vers le coin inférieur droit du plan de travail.

![Les paramètres d'un cylindre : solide ou trou, diamètre et hauteur sous forme de nombre et sous forme de curseur.](shot:editor-overview)

- **{{ui:inspector.solid}} ou {{ui:inspector.hole}} :** Un solide reste, un trou enlève de la matière. Un clic sur {{ui:inspector.solid}} ouvre les couleurs ; les couleurs que vous y mélangez attendent ensuite sous {{ui:inspector.recentColors}}, les huit dernières. Plus d'informations dans [Solides et trous](chapter:solids-and-holes).
- **{{ui:inspector.transparent}} :** Permet de voir à travers le corps, par exemple pour repérer une forme derrière lui.
- **{{ui:inspector.multicolor}} :** Pour un groupe uniquement. Allumé, chaque partie du groupe apparaît dans sa propre couleur, même dans un groupe qui a été découpé avec des trous dans un seul corps (les murs que laisse un trou prennent la couleur du corps dans lequel ils ont été découpés). Choisir une couleur pour le groupe l'éteint et colore tout le groupe. Les bundles conservent toujours les couleurs de leurs pièces. Dans une exportation 3MF, chaque pièce conserve sa couleur, de sorte que le slicer peut mapper les pièces sur des filaments ; OBJ porte les couleurs sur ses pointes, donc la frontière entre deux couleurs y est un peu plus grossière.
- **{{ui:inspector.properties}} :** Les dimensions et tout ce qui appartient à cette forme. Pour un cylindre le diamètre, la hauteur et le nombre de côtés. Pour un engrenage les dents, pour un ressort les tours. Une valeur que vous avez éloignée de sa valeur par défaut reçoit une petite flèche à côté de son nom : un clic reprend uniquement cette valeur, quoi que vous ayez fait depuis, contrairement à Annuler. Déplacé avec la souris, le curseur d'une longueur s'accroche au pas d'accrochage, donc une hauteur apparaît en millimètres entiers (pas avec la grille désactivée, ni sur des curseurs courts) ; une valeur saisie et les touches fléchées du curseur restent exactes. {{ui:inspector.saveDefaults}} en bas fait des valeurs actuelles les valeurs de départ de ce type de forme (les mêmes que {{ui:workspace.shapeDefaults}} dans les paramètres), et {{ui:inspector.resetDefaults}} revient à celle de l'application.
- **{{ui:inspector.taper}} :** Différentes tailles en haut et en bas, par exemple pour une pente ou un entonnoir.
- **{{ui:inspector.twist}} :** Tourne le haut contre le bas ou le déplace latéralement. Cela donne des colonnes torses et des tours penchées.

![Un groupe composé d'un bloc orange, d'une cheville bleue et d'un trou, découpés en un seul corps. Lorsque Multicolor est activé, le piquet reste bleu, le bloc orange et les parois du trou prennent la couleur du bloc.](shot:group-multicolor)

Le cône et la torsion fonctionnent sur presque toutes les formes. Seuls l'engrenage, le filetage, le ressort, la molette, la charnière, la pyramide, le tube coudé, la larme, les fraises à tête de vis et la règle les laissent de côté : ils ont leurs propres mesures fixes ou, comme la pyramide, un sommet qui leur est déjà propre.

![Un cône dont le rayon supérieur et la hauteur ont été modifiés : une petite flèche à côté de chacun reprend la valeur, et les deux boutons du bas enregistrent ou réinitialisent les valeurs par défaut de la forme.](shot:property-reset)

Une boîte effilée ou penchée, un cylindre, une ellipse, un polygone, un tube ou un anneau conservent sa forme exacte, tout comme la capsule, l'étoile, le cœur, le croissant, la queue d'aronde et une boîte arrondie sans bords supérieur et inférieur arrondis : les chanfreins et les congés fonctionnent dessus comme sur la forme simple, et l'export STEP l'écrit. Il en va de même pour une forme torsadée : sa section tourne exactement au fur et à mesure qu'elle monte, et les côtés s'enroulent uniformément de bas en haut.

Taper est plus précis que faire glisser. Tous les champs numériques prennent des millimètres, mais aussi des pourcentages : tapez "50 %" dans une largeur de 40 mm et vous obtenez 20 mm. Ils calculent aussi : "15*3", "120-2*4" ou "(40+2)/2" donnent 45, 112 et 21 ; x fonctionne à la place de *. Le champ mémorise le calcul, dans le panneau Propriétés ainsi que dans les cases de dimension autour du corps sélectionné : cliquez à nouveau dessus plus tard et la formule reste là à la place du nombre, tant que la valeur lui correspond toujours, et que vous la modifiez à la place, "(140+2)/2" devenant "(40+6)/2". Faites glisser le corps avec une poignée ou mettez-le à l'échelle et la formule ne correspond plus, de sorte que le champ affiche à nouveau uniquement le nombre.

## À quel point est rond ? Le côté compte

Les formes rondes telles que le cylindre, le cône, le tube, l'ellipse ou les alésages ont le commutateur {{ui:prop.sidesFollowSize}} et le curseur {{ui:prop.sides}} dans leurs propriétés. Le {{ui:shape.torus}} possède deux curseurs : {{ui:prop.torusSides}} autour de l'anneau et {{ui:prop.torusSteps}} autour du tube. Là aussi, ils suivent la taille jusqu'à ce que vous les teniez, donc un grand tore ne montre aucune facette. La raison : pour la vue et pour STL, 3MF et OBJ, le layerling dessine un cercle comme un polygone de nombreux petits côtés. Plus il y a de côtés, plus il est lisse et plus il faut de triangles.

**Là où le nombre de côtés compte**

- **Dans l'export pour le slicer** (STL, 3MF, OBJ). Un cylindre avec peu de côtés y arrive sous forme de polygone.
- **Lorsque corps et trous sont combinés.** Un alésage découpé par un trou avec peu de côtés est angulaire dans la pièce finie. Cela inclut les trous de vis.
- **Dans la vue.** De nombreuses formes très fines ralentissent l'éditeur.

**Où cela n'a pas d'importance**

- **Pour l'export STEP.** Il écrit la forme ronde, pas le polygone.
- **Pour les chanfreins et congés** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}) tant que la forme reste ronde. C'est le cas lorsque vous n'avez pas défini de nombre de côtés, lorsque le nombre est au moins celui par défaut de la forme ou lorsque le polygone s'éloigne d'au plus {{value:EXACT_ROUND_TOLERANCE}} mm du cercle. La valeur par défaut est les côtés {{value:ROUND_FROM_SIDES}} pour le cylindre, l'ellipse, le tube et le cône, {{value:ROUND_FROM_ROOF_SIDES}} pour le {{ui:shape.roundRoof}}, les pas {{value:ROUND_FROM_SPHERE_STEPS}} pour le {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} pour le {{ui:shape.halfSphere}}, les côtés {{value:ROUND_FROM_TORUS_SIDES}} et les pas {{value:ROUND_FROM_TORUS_STEPS}}. pour le {{ui:shape.torus}}, et un {{ui:prop.quality}} de {{value:ROUND_FROM_BENT_TUBE_QUALITY}} pour un tour {{ui:shape.bentTube}}.
- **Pour un filetage, un ressort ou un engrenage hélicoïdal.** L'outil bord et l'export STEP prennent son corps exact ; son {{ui:prop.quality}} définit uniquement la précision avec laquelle il est dessiné.

**Là où cela compte à nouveau**

- **Pour les chanfreins et les congés sur une forme avec peu de côtés.** Si vous définissez le nombre de côtés en dessous de la valeur par défaut, l'outil de bord prend la forme telle qu'elle est dessinée : un cylindre à 6 côtés reste une barre hexagonale et le congé s'étend autour de ses six bords. C'est ainsi que vous pouvez construire, par exemple, une poche à écrous aux coins arrondis. Pour une forme ronde, laissez {{ui:prop.sidesFollowSize}} activé.

**Comment l'utiliser**

- **Laissez {{ui:prop.sidesFollowSize}} activé.** Ensuite, la superposition sélectionne le nombre de côtés à partir du diamètre de sorte que le polygone s'éloigne d'au plus {{value:ROUND_DEVIATION_TOLERANCE}} mm du vrai cercle, bien en dessous de ce qu'une imprimante résout. Les petites formes ont au moins {{value:MIN_AUTOMATIC_SIDES}} côtés, les grandes davantage.
- **Moins de côtés** que vous prenez lorsque vous voulez volontairement un polygone (mais il y a le {{ui:shape.polygon}} pour ça) ou lorsque l'éditeur devient lent avec de très nombreuses formes rondes.
- **Plus de côtés** dont vous n'avez presque jamais besoin. Uniquement sur de très grandes pièces rondes, quand on voit des bords dans le STL.
- **Pour les pièces que vous traitez uniquement avec des bords ou à la main comme STEP,** le nombre de côtés n'a pas d'importance.

## Travailler avec les poignées

Outre les paramètres, il existe des poignées sur la forme elle-même :

- Les **coins et bords** agrandissent ou réduisent la forme. Maintenez [[Shift]] tout en faisant glisser un coin pour redimensionner ensemble la largeur, la profondeur et la hauteur et conserver les proportions ; maintenez [[Alt]] pour mettre à l'échelle à partir du centre au lieu du coin opposé. Sans clavier, ou si vous ne souhaitez pas maintenir une touche, activez {{ui:inspector.keepProportions}} en haut des propriétés : alors les coins gardent toujours les proportions, et en tapant l'un de largeur, de profondeur ou de hauteur, les deux autres sont mis à l'échelle du même facteur. Le réglage est mémorisé.
- La **flèche en haut** change la hauteur, la poignée **au milieu** soulève ou abaisse la forme.
- Les **flèches courbes** le font pivoter.
- Les **nombres** à côté de la forme indiquent les dimensions. Un clic sur l'un d'eux ouvre un champ dans lequel vous saisissez le nombre souhaité. Avec [[Enter]], la forme grandit à partir du bord opposé au nombre, comme lorsque vous faites glisser ; avec [[Alt]]+[[Enter]], elle grandit autour de son milieu, de sorte qu'une forme alignée avec une autre reste alignée. Cela vaut pour la largeur et la longueur ; la hauteur grandit toujours vers le haut depuis le dessous. Les champs des propriétés à droite conservent le milieu sans touche.
- Un **clic sur un coin** (sans glisser) ouvre simultanément la largeur et la profondeur. Tapez le premier, appuyez sur [[Tab]] pour le second et [[Enter]] pour appliquer les deux. [[Esc]] annule.

Une fois qu'une forme est tournée à angle droit, par exemple posée sur le côté avec {{ui:editor.tool.layFlat}}, les champs dans les propriétés sont nommés d'après la direction dans laquelle chaque mesure s'exécute maintenant : {{ui:prop.height}} est ce qui monte, {{ui:prop.width}} court le long de X et {{ui:prop.length}} le long de Y. Taper la hauteur d'une forme couchée change donc la mesure verticale, et son dessous reste sur la plaque. Une forme inclinée selon un autre angle affiche ses propres mesures dans les champs, et une note ci-dessous l'indique.

Sans la souris, utilisez le clavier : les touches fléchées déplacent la sélection d'un pas instantané (0,1 mm lorsque la grille est éteinte), avec [[Shift]] de cinq, ou de dix si vous réglez {{ui:workspace.gridMajorEvery}} à 10 {{ui:workspace.gridMajorSteps}} dans les paramètres sous {{ui:workspace.appearance}} : jusqu'à la prochaine ligne plus sombre, comme dans Tinkercad. Ils suivent la vue : [[→]] se déplace là où se trouve la droite de l'écran, [[↑]] s'éloigne de vous, même après avoir tourné la plaque. Poussez une forme hors de l’image et la vue se déplace. [[Ctrl]]+[[↑]] et [[Ctrl]]+[[↓]] le montent et l'abaissent. [[R]] tourne de 45°, [[Shift]]+[[R]] de 22,5°. [[D]] dépose la sélection sur le plan de travail.

Les poignées dessinent une forme aussi grande que votre assiette, d'au moins 220 mm de largeur et de profondeur. Taper un nombre dans les propriétés va au-delà, et une forme aussi grande ne rétrécit pas lorsque vous la récupérez. Votre propre plafond par forme est défini dans les paramètres sous {{ui:workspace.shapeDefaults}} avec {{ui:workspace.customLimit}}.

L'étape d'accrochage se trouve en bas à droite de l'éditeur et peut être modifiée à tout moment.

## Copier et dupliquer

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} et {{ui:editor.tool.duplicate}} sont dans le ruban ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplique une sélection. le layerling se souvient de la façon dont vous avez déplacé ou fait pivoter la copie pour la dernière fois et applique à nouveau la même chose à la copie suivante. Cela produit une rangée de trous ou de marches en quelques pressions sur une touche. Pour les arrangements réguliers, il existe également le modèle décrit dans [Sélection et arrangement] (chapter:select-and-arrange).

> **Astuce :** Si une forme refuse de prendre la taille souhaitée, c'est souvent la limite pour de nouvelles formes. Sous {{ui:workspace.shapeDefaults}} dans les paramètres, vous décidez comment chaque forme commence et quelle taille elle peut atteindre.

## Formes personnalisées

Un support, une poignée ou une plaque de base dont vous avez besoin encore et encore rentre dans le {{ui:myShapes.title}}. Ils se trouvent en haut de la bibliothèque de formes, au-dessus du {{ui:myShapes.basicShapes}}, et se replient avec leur flèche.

1. Sélectionnez un ou plusieurs corps, trous, groupes ou un modèle importé inclus.
2. Ouvrez la bibliothèque de formes et cliquez sur {{ui:myShapes.saveSelection}}. Saisissez un nom et confirmez avec {{ui:common.save}}.
3. Dans n'importe quelle conception, un clic sur la tuile insère la forme, comme n'importe quelle autre forme. Vous pouvez également faire glisser la vignette sur le plan de travail ; il atterrit ensuite là où vous le lâchez.

Plusieurs corps se rassemblent, placés les uns à côté des autres, et restent sélectionnables un à un. Le crayon sur un carreau le renomme, le bac l'enlève après demande. Les formes déjà insérées dans les dessins restent telles quelles.

Les {{ui:myShapes.title}} vivent dans ce navigateur, en dehors des designs, et y seront à nouveau au prochain démarrage. {{ui:dashboard.backupAll}} sur la page de démarrage les sauvegarde avec les conceptions, et l'ouverture de la sauvegarde ramène les deux. Pour transférer uniquement les formes vers un autre navigateur, {{ui:myShapes.backup}} (la flèche pointant vers le bas) les enregistre sous forme de fichier ZIP et {{ui:myShapes.load}} (la flèche pointant vers le haut) les y ramène. {{ui:myShapes.load}} accepte également des conceptions `.lyl` uniques ; chacun devient une forme. Les formes déjà présentes ne sont pas ajoutées deux fois.

### Formes personnalisées sur le serveur

Lorsque le [magasin de serveur partagé](chapter:files-and-saving) est activé, la section affiche deux groupes : {{ui:myShapes.onServer}} et {{ui:myShapes.inBrowser}}. Lors de l'enregistrement, vous choisissez où va la forme ; le serveur est choisi pour commencer. Là, il réside dans le dossier `Custom shapes`, sous la forme d'un fichier `.lyl` propre avec une image, prêt sur chaque appareil qui atteint le serveur. Le nuage sur une vignette de navigateur place cette forme sur le serveur ; il n'est alors plus conservé deux fois.

Le dossier `Custom shapes` s'affiche également sur la page de démarrage. Ouvrez-y une forme comme un dessin, modifiez-la et elle est automatiquement enregistrée comme n'importe quel dessin sur le serveur ; l'insertion suivante prend la nouvelle version. Comme le magasin du serveur n'a pas de connexion, tous ceux qui accèdent au serveur voient les mêmes formes.

## Enrouler autour d'un cylindre

Un motif, un logo ou un lettrage doit-il figurer sur une tasse, une canette ou un tube ? Posez-le d'abord à plat sur la plaque, sous forme de SVG importé ou de texte par exemple, tel qu'il devrait apparaître vu du dessus. Ensuite, enroulez-le autour d'un cylindre dans les paramètres de la forme sous {{ui:inspector.wrapCylinder}} :

1. Ouvrez {{ui:inspector.wrapCylinder}} et entrez le {{ui:inspector.wrapDiameter}} de la paroi du cylindre, tel que le diamètre extérieur de votre tasse. Les dixièmes de millimètre fonctionnent aussi, comme 63,5.
2. Click {{ui:inspector.wrapApply}}. Ce qui courait de gauche à droite contourne maintenant le cylindre, le bord arrière devient le dessus et l'épaisseur dépasse du mur.
3. Sélectionnez la forme enveloppée, le cylindre et le centre, de gauche à droite et d'avant en arrière. Le milieu de la forme enveloppée est l’axe du cylindre, il repose donc directement sur sa paroi.

Pour une gravure, activez {{ui:inspector.wrapInward}} : l'épaisseur va alors dans le mur. Faites un trou dans la forme, centrez-la et regroupez-la avec le cylindre.

Le résultat est un maillage semblable à un modèle importé. Une forme déjà enveloppée est un maillage de la pièce enroulée et ne peut pas être enroulée une deuxième fois : annulez l'enroulement, ou enroulez à nouveau l'original plat avec un autre diamètre. Annuler remet la forme à plat ; pour un autre diamètre, défaire d'abord et enrouler à nouveau. Il ne peut pas faire plus d'un tour du cylindre ; puis la superposition nomme le plus petit diamètre qui convient.


