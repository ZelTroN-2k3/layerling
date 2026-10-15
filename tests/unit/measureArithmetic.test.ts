import { describe, expect, it } from "vitest";
import { evaluateArithmetic, parseMeasurementInput, resolveMeasurementInput } from "@/lib/measurementUnits";

describe("arithmetic in measure fields (#180)", () => {
  it("adds, subtracts, multiplies and divides, with the usual order", () => {
    expect(parseMeasurementInput("15*3")).toBe(45);
    expect(parseMeasurementInput("15+3")).toBe(18);
    expect(parseMeasurementInput("15-3")).toBe(12);
    expect(parseMeasurementInput("45/3")).toBe(15);
    expect(parseMeasurementInput("120-2*4")).toBe(112);
    expect(parseMeasurementInput("(40+2)/2")).toBe(21);
    expect(parseMeasurementInput(" 10 x 2 ")).toBe(20);
    expect(parseMeasurementInput("9÷3")).toBe(3);
    expect(parseMeasurementInput("-5+2")).toBe(-3);
    expect(parseMeasurementInput("2*-3")).toBe(-6);
  });

  it("takes a decimal comma inside a calculation", () => {
    expect(parseMeasurementInput("1,5*2")).toBe(3);
    expect(parseMeasurementInput("10,5-0,25")).toBeCloseTo(10.25, 12);
  });

  it("keeps plain numbers, a leading minus, fractions and percentages as before", () => {
    expect(parseMeasurementInput("-12.5")).toBe(-12.5);
    expect(parseMeasurementInput("12,5")).toBe(12.5);
    expect(parseMeasurementInput("1 1/2")).toBe(1.5);
    expect(resolveMeasurementInput("50%", 80)).toBe(40);
  });

  it("refuses what is not a sum", () => {
    expect(evaluateArithmetic("2**3")).toBeNaN();
    expect(evaluateArithmetic("(2+3")).toBeNaN();
    expect(evaluateArithmetic("alert(1)")).toBeNaN();
    expect(evaluateArithmetic("5/0")).toBeNaN();
    expect(parseMeasurementInput("abc")).toBeNaN();
  });
});
