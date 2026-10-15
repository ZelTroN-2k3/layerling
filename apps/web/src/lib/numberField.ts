/**
 * Ein Zahlenfeld, in das gesprungen wird, stellt seinen ganzen Wert zur
 * Ueberschreibung bereit.
 *
 * Am Schreibtisch ist das bequem, auf einem Tablet ist es der Unterschied
 * zwischen benutzbar und nicht: Die Dezimaltastatur hat **keine Pfeiltasten**,
 * mit denen sich der Schreibzeiger setzen liesse, und ein Feld von fuenf
 * Zeichen trifft man mit dem Finger nicht stellengenau. Ohne Markierung muss
 * man aus "20.00" Zeichen fuer Zeichen eine "35" loeschen - und wer dabei
 * danebentippt, bekommt "23.000".
 *
 * Das Feld fuer den Exportnamen macht es seit jeher so; hier ist dieselbe
 * Bewegung fuer die Zahlenfelder, an einer Stelle und mit Namen.
 */
export type SelectableField = {
  value: string;
  select: () => void;
};

/**
 * Markiert den ganzen Wert. Gibt zurueck, ob etwas zu markieren war - ein
 * leeres Feld bleibt unberuehrt, damit der Schreibzeiger dort einfach steht,
 * wo er hingehoert.
 */
export function selectWholeValue(field: SelectableField | null | undefined): boolean {
  if (!field || field.value === "") return false;
  field.select();
  return true;
}
