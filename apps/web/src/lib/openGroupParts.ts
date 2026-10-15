/**
 * Which objects on the workplane belong to the groups that are open for editing.
 *
 * Groups can be opened inside each other: the outermost one first, each next
 * one a part of the one before. Every level notes its parts by id. Many edits
 * replace a part with a new object under a new id - grouping two parts,
 * cutting, separating, ungrouping a group among them - and Done would then
 * leave that result outside the rebuilt group. The rule here: when one step
 * removes at least one part and brings in new objects, those objects take the
 * removed part's place, in the innermost level that lost a part. A step that
 * removes nothing (a new shape, a paste, a duplicate) adds nobody.
 *
 * Ids are only ever added, never dropped: undo and redo bring back the earlier
 * objects under their old ids, which are then still on the list. Done takes the
 * ids that are on the workplane at that moment. The same holds for a group
 * opened inside another one: it keeps its id through Done and Cancel, so the
 * level around it needs no change.
 */
export function trackOpenGroupLevels(
  levels: readonly (readonly string[])[],
  previous: readonly { id: string }[],
  next: readonly { id: string }[],
): readonly (readonly string[])[] {
  const nextIds = new Set(next.map((shape) => shape.id));
  const previousIds = new Set(previous.map((shape) => shape.id));
  const removed = (id: string) => previousIds.has(id) && !nextIds.has(id);
  const level = levels.findLastIndex((partIds) => partIds.some(removed));
  if (level < 0) return levels;
  const known = new Set(levels.flat());
  const added = next.map((shape) => shape.id).filter((id) => !previousIds.has(id) && !known.has(id));
  if (!added.length) return levels;
  const partIds = levels[level];
  // Where the first replaced part stood, so the rebuilt group keeps its order.
  const at = partIds.findIndex(removed) + 1;
  const tracked = [...partIds.slice(0, at), ...added, ...partIds.slice(at)];
  return levels.map((ids, index) => (index === level ? tracked : ids));
}

/** The same rule for a single open group. */
export function trackOpenGroupParts(
  partIds: readonly string[],
  previous: readonly { id: string }[],
  next: readonly { id: string }[],
): readonly string[] {
  return trackOpenGroupLevels([partIds], previous, next)[0];
}

/**
 * How many levels, counted from the outermost, are still open after the
 * workplane changed to `presentIds`. A level ends when its group is back on the
 * workplane (undo went past its opening) or when nothing of it is left. A group
 * open inside it counts as one of its parts, so a level whose only remaining
 * part is the group open inside it stays open. When a level ends, every level
 * inside it ends too.
 */
export function openGroupLevelsStillOpen(
  levels: readonly { groupId: string; partIds: readonly string[] }[],
  presentIds: ReadonlySet<string>,
): number {
  const reopened = levels.findIndex((level) => presentIds.has(level.groupId));
  const candidates = reopened < 0 ? levels.length : reopened;
  let open = candidates;
  let innerAlive = false;
  for (let index = candidates - 1; index >= 0; index -= 1) {
    const alive: boolean = innerAlive || levels[index].partIds.some((id) => presentIds.has(id));
    if (!alive) open = index;
    innerAlive = alive;
  }
  return open;
}

/** A group can be edited when nothing is open, or when it is a part of the innermost open group. */
export function canEditGroupAtLevel(levels: readonly { partIds: readonly string[] }[], groupId: string): boolean {
  const innermost = levels.at(-1);
  return !innermost || innermost.partIds.includes(groupId);
}
