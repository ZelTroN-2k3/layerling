import * as THREE from "three";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";

/**
 * Der Mehrkant ist die Pyramide ohne Spitze: ein Vieleck, das ueber die Hoehe
 * gleich bleibt. Der Zylinder ist derselbe Koerper mit vielen Seiten und
 * benutzt denselben Bau - sonst haetten zwei Formen mit gleicher Seitenzahl
 * verschiedene Masse.
 *
 * Die Passung stammt aus derselben Hilfsfunktion, die schon die Pyramide in
 * ihren Rahmen setzt: ein Sechskant misst ueber die Ecken mehr als ueber die
 * Flaechen, und ohne diese Korrektur nennt das Feld einen Wert, den der
 * Koerper gar nicht hat.
 */
export function createPrismGeometry(width: number, height: number, depth: number, sides = 6, segments = 1) {
  const count = Math.max(3, Math.round(sides));
  const footprintScale = regularPolygonFootprintScale(width, depth, count);
  const geometry = new THREE.CylinderGeometry(1, 1, height, count, Math.max(1, Math.round(segments)));
  geometry.scale(footprintScale.x, 1, footprintScale.z);
  geometry.translate(footprintScale.offsetX, height / 2, footprintScale.offsetZ);
  return geometry;
}
