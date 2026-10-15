---
title: Mesures et notes
summary: Ruban à mesurer, règle et équerre de cadrage, distances jusqu'à l'origine, notes qui restent attachées à une pièce et points de référence auxquels les objets s'accrochent.
---

Pour construire une pièce avec précision, vous devez mesurer. layerling dispose de plusieurs outils pour cela. Aucun d’entre eux ne finit dans une exportation. L'épaisseur de paroi et les espaces à l'intérieur d'une pièce sont mieux mesurés dans la [vue en coupe] (chapter:view-and-workplane) avec {{ui:camera.sectionMeasure}}.

## Le mètre ruban

Le ruban à mesurer se trouve à l'extrémité inférieure de la barre de la caméra, sur le bord gauche ({{ui:camera.tapeTools}}). Il mesure les distances entre les coins, les arêtes et les faces. Un clic dessus ouvre cinq boutons. S'ils couvrent ce que vous souhaitez mesurer, faites-les glisser par la poignée de gauche n'importe où sur le plan de travail ; un double-clic sur la poignée les remet :

![Le mètre ruban avec ses boutons : ajouter une mesure, déplacer des points de mesure, supprimer une mesure, des bords entiers, supprimer toutes les mesures.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}} :** Cliquez sur un point, faites glisser vers le suivant et cliquez dessus. La distance est étiquetée.
2. **{{ui:camera.moveMeasurement}} :** Saisissez les points et déplacez-les, le nombre suit.
3. **{{ui:camera.deleteMeasurement}} :** Cliquez ensuite sur une mesure pour la supprimer.
4. **{{ui:camera.tapeWholeEdges}} :** Un clic sur une arête mesure la totalité de celle-ci, la longueur d'un cercle par exemple. Lorsque cette option est désactivée, un clic place un point sur le bord, et le deuxième point va n'importe où, vous pouvez donc mesurer le diamètre ou toute autre distance. [[Alt]] fait tourner l'interrupteur en un seul clic. Sur un cercle, le point en face du premier s'enclenche lorsque le pointeur s'approche, et les points se trouvent sur le vrai cercle, de sorte que le diamètre ressort exactement.
5. **{{ui:camera.deleteAllMeasurements}} :** Supprime toutes les mesures en même temps. Comme cela ne peut pas être annulé, layerling vous demande d'abord confirmation ; sans mesures, il n'y a rien à faire.
6. **{{ui:camera.tapeMarkMiddle}} :** Sous le nombre de chaque mesure se trouve un petit bouton en réticule. Il place un [point de référence](#points-de-reference) au milieu de la mesure : après un clic sur un bord rond, tel que le rebord d'un trou, au centre de ce cercle — également sur un maillage importé, où rien d'autre ne marque le milieu d'un trou — et pour un diamètre ou toute mesure droite, à mi-chemin. Une forme que vous faites glisser s'enclenche ensuite avec son centre sur le point. Un point déjà existant n'est pas créé en double.

[[Esc]] quitte le mode mesure.

## Le dirigeant

Vous récupérez le {{ui:shape.ruler}} dans la bibliothèque de formes. Il s'agit d'un simple outil de mesure : il n'apparaît dans aucun export et ne peut être ni regroupé ni découpé. Pour chaque corps qui touche ou chevauche la règle, l'étendue est affichée sous forme de nombre flottant directement dans la vue. Vous pouvez modifier ce numéro ici, et le corps suit. Le symbole plus flottant crée une copie de la forme mesurée.

## Le carré de cadrage

Parfois, il est préférable de mesurer à angle droit. Cliquez sur {{ui:camera.cornerRulerTool}} dans la barre de caméra puis sur le plan de travail. Un carré d'encadrement à deux bras à angle droit, avec des graduations comme un carré d'essai, y est placé. Il n'a pas non plus de corps propre. Cliquez près du coin d'un corps et son coin s'accroche exactement là.

Le carré d'encadrement repose sur le plan de travail. Si cela se trouve sur le côté d'un corps, le carré se trouve également de ce côté, voir [Vue et plan de travail](chapter:view-and-workplane). C'est ainsi que vous cotez sur un mur vertical : placez le plan de travail sur le mur, placez le carré dans son coin supérieur gauche et cliquez sur la poignée jusqu'à ce que les bras pointent vers la droite et le bas.

- **Faire glisser la poignée** la déplace.
- **Un clic court sur la poignée** la fait tourner de 90°.
- **Le ×** à côté le supprime.
- **Le petit bouton à gauche de la poignée** change ce qui est mesuré à partir de : l'extérieur d'un corps (point final, une icône avec des lignes) ou son milieu (point médian, un réticule).

Si des corps se tiennent près de l'un des bras, le carré d'encadrement affiche automatiquement leurs dimensions. Cela fonctionne uniquement sur la plaque de base, pas sur le côté d'une carrosserie.

Lorsque vous sélectionnez un corps, le carré d'encadrement indique en vert sa distance par rapport au coin, le long des deux bras et en hauteur. Cliquez sur un nombre vert pour saisir une distance et le corps se déplace exactement à cet endroit. Avec plusieurs corps sélectionnés, ils comptent pour un : la règle mesure leur contour commun et une valeur saisie les déplace tous ensemble sans changer leurs positions les uns par rapport aux autres.

Au milieu, les chiffres verts comptent jusqu'au milieu du corps, également en hauteur. De cette façon, vous placez une sphère avec son centre exactement à 15 mm d'un bord, sans soustraire le rayon. Sur un mur vous placez un trou à 40 mm de la gauche et 190 mm du haut comme ceci : sélectionnez le trou, passez au milieu, tapez 40 et 190. La hauteur y compte vers l'extérieur du mur.

Le ruban à mesurer et l'équerre de cadrage restent là où ils se trouvent pendant que vous dessinez et revenez à la vue 3D. Ils ne sont pas enregistrés avec le design ni dans l'historique, et ils disparaissent lorsque vous rechargez la page.

## Distances jusqu'à l'origine et en déplacement

Dans les paramètres sous {{ui:workspace.appearance}}, il y a deux commutateurs pour les cotes dynamiques :

- {{ui:workspace.showMoveDimensions}} indique de combien vous vous déplacez en faisant glisser.
- {{ui:workspace.showOriginDimensions}} montre les distances de la sélection à l'origine de la plaque, également avec plusieurs corps sélectionnés.

Avec {{ui:workspace.dimensionsAlwaysVisible}} les cotes restent visibles en permanence.

## Remarques

Une note enregistre ce que la géométrie ne dit pas : "Cette vis est trop serrée de 0,3 mm", "imprimez encore le couvercle", "cote de Peter". Placez-en un avec {{ui:editor.tool.note}} ou la clé [[N]].

- Si vous placez le billet **sur un corps**, il voyage avec lui.
- Si vous le placez **à côté**, il reste sur le plan de travail ({{ui:note.free}}).
- {{ui:note.detach}} libère une note jointe du corps.
- Faire glisser déplace la note, un clic l'ouvre pour l'éditer.
- Pendant que vous écrivez, [[Enter]] conserve le texte et [[Esc]] le remet tel qu'il était avant de commencer ; [[Shift]]+[[Enter]] démarre une nouvelle ligne.

Les notes sont enregistrées dans la conception, n'apparaissent dans aucune exportation et peuvent être affichées ou masquées avec {{ui:visibility.notes}}.

## Points de référence

Un point de référence est une marque nue dans l'espace, comme une marque de crayon ou un point de tracé dans un atelier : il n'appartient à personne, n'est jamais imprimé et d'autres choses s'y accrochent. Faites un clic droit sur un corps et choisissez {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} ou {{ui:contextMenu.markMidpoints}} : les points apparaissent sur la face supérieure du corps (de toute la sélection, si vous en avez sélectionné plusieurs).

- Le ruban à mesurer peut également marquer un point : {{ui:camera.tapeMarkMiddle}}, le bouton en réticule sous une mesure, en place un en son milieu, par exemple au centre d'un trou rond.
- Faites glisser un point pour le déplacer, ou cliquez dessus pour voir ses coordonnées et en saisir de nouvelles ; ils utilisent l'unité que vous avez définie. Chaque carte peut être déplacée par son titre si elle recouvre quelque chose, individuellement : les autres restent là où elles sont, et un double-clic sur le titre la remet en place. La carte que vous avez touchée en dernier se trouve devant les autres. **Tout supprimer** dans une carte, ou dans le menu contextuel du clic droit, supprime tous les points en une seule fois. {{ui:common.delete}} le supprime.
- Lorsque vous faites glisser une forme, ses bords et son centre s'alignent sur un point, comme ils s'alignent sur d'autres formes ({{ui:workspace.objectSnap}}). Le carré de cadrage s'accroche également aux points.
- Les points sont enregistrés dans la conception, n'apparaissent dans aucune exportation et sont affichés ou masqués avec les notes par {{ui:visibility.notes}}.
- Une IA peut les marquer, les lister et les supprimer avec `layerling_add_reference_points`, `layerling_list_reference_points` et `layerling_remove_reference_points`.
