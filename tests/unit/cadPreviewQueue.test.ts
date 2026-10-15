import { describe, expect, it } from "vitest";
import { createCadPreviewQueue } from "@/lib/cadPreviewQueue";

/*
 * Der Arbeiter rechnet eine Anfrage nach der anderen. Was hier geprueft wird,
 * ist deshalb nicht die Geometrie, sondern eine Zusage: egal wie schnell am
 * Schieberegler gezogen wird, es ist hoechstens eine Vorschau unterwegs und
 * hoechstens eine wartet. Alles dazwischen wird weggeworfen, weil niemand das
 * Ergebnis noch sehen will.
 */

type Anfrage = { amount: number };

function warteschlange() {
  const gesendet: Anfrage[] = [];
  let naechsteId = 0;
  const queue = createCadPreviewQueue<Anfrage>((payload) => {
    gesendet.push(payload);
    naechsteId += 1;
    return naechsteId;
  });
  return { queue, gesendet };
}

describe("cadPreviewQueue", () => {
  it("schickt die erste Anfrage sofort los", () => {
    const { queue, gesendet } = warteschlange();
    expect(queue.request({ amount: 1 })).toEqual({ status: "sent", requestId: 1 });
    expect(gesendet).toEqual([{ amount: 1 }]);
    expect(queue.inFlightId).toBe(1);
  });

  it("haelt alles zurueck, solange der Arbeiter rechnet", () => {
    const { queue, gesendet } = warteschlange();
    queue.request({ amount: 1 });
    expect(queue.request({ amount: 2 })).toEqual({ status: "queued", requestId: null });
    expect(gesendet).toHaveLength(1);
    expect(queue.queuedPayload).toEqual({ amount: 2 });
  });

  it("behaelt von zehn Reglerschritten nur den letzten", () => {
    const { queue, gesendet } = warteschlange();
    for (let schritt = 1; schritt <= 10; schritt += 1) queue.request({ amount: schritt });
    expect(gesendet).toEqual([{ amount: 1 }]);
    expect(queue.settle(1)).toEqual({ status: "sent", requestId: 2 });
    expect(gesendet).toEqual([{ amount: 1 }, { amount: 10 }]);
    expect(queue.queuedPayload).toBeNull();
  });

  it("wird still, wenn nichts mehr wartet", () => {
    const { queue, gesendet } = warteschlange();
    queue.request({ amount: 1 });
    expect(queue.settle(1)).toEqual({ status: "idle", requestId: null });
    expect(gesendet).toHaveLength(1);
    expect(queue.inFlightId).toBeNull();
  });

  it("laesst sich von einer alten Antwort nicht aus dem Takt bringen", () => {
    const { queue, gesendet } = warteschlange();
    queue.request({ amount: 1 });
    queue.request({ amount: 2 });
    expect(queue.settle(99)).toEqual({ status: "idle", requestId: null });
    expect(gesendet).toHaveLength(1);
    expect(queue.queuedPayload).toEqual({ amount: 2 });
  });

  it("vergisst beim Zuruecksetzen auch das Wartende", () => {
    const { queue, gesendet } = warteschlange();
    queue.request({ amount: 1 });
    queue.request({ amount: 2 });
    queue.reset();
    expect(queue.settle(1)).toEqual({ status: "idle", requestId: null });
    expect(gesendet).toHaveLength(1);
    expect(queue.request({ amount: 3 })).toEqual({ status: "sent", requestId: 2 });
  });

  it("bleibt benutzbar, wenn der Arbeiter gerade nicht erreichbar ist", () => {
    const gesendet: Anfrage[] = [];
    let erreichbar = false;
    const queue = createCadPreviewQueue<Anfrage>((payload) => {
      gesendet.push(payload);
      return erreichbar ? gesendet.length : null;
    });
    expect(queue.request({ amount: 1 })).toEqual({ status: "failed", requestId: null });
    expect(queue.inFlightId).toBeNull();
    erreichbar = true;
    expect(queue.request({ amount: 2 })).toEqual({ status: "sent", requestId: 2 });
  });

  it("meldet einen Fehlschlag auch beim Nachschieben", () => {
    const gesendet: Anfrage[] = [];
    let erreichbar = true;
    const queue = createCadPreviewQueue<Anfrage>((payload) => {
      gesendet.push(payload);
      return erreichbar ? gesendet.length : null;
    });
    queue.request({ amount: 1 });
    queue.request({ amount: 2 });
    erreichbar = false;
    expect(queue.settle(1)).toEqual({ status: "failed", requestId: null });
    expect(queue.inFlightId).toBeNull();
  });
});
