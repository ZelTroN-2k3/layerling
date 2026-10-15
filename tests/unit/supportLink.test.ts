import { describe, expect, it } from "vitest";
import { DEFAULT_SUPPORT_URL, supportCardEnabled, supportLink } from "@/lib/supportLink";

describe("supportLink", () => {
  it("points everyone at the project's page when nothing is set, in their language", () => {
    expect(supportLink({}, "de")).toEqual({ href: `${DEFAULT_SUPPORT_URL}?lang=de`, label: "" });
    expect(supportLink({ url: "  ", hint: "" }, "en")?.href).toBe(`${DEFAULT_SUPPORT_URL}?lang=en`);
  });

  it("uses an address of the operator's own as given, with their wording", () => {
    expect(supportLink({ url: "/support.html", label: " Spenden " }, "de")).toEqual({ href: "/support.html", label: "Spenden" });
  });

  it("drops the built-in link when switched off, but keeps an own address", () => {
    expect(supportLink({ hint: "off" }, "de")).toBeNull();
    expect(supportLink({ hint: " OFF " }, "en")).toBeNull();
    expect(supportLink({ hint: "off", url: "https://example.org/donate" }, "en")?.href).toBe("https://example.org/donate");
  });

  it("shows the reminder card everywhere unless it is switched off", () => {
    expect(supportCardEnabled({})).toBe(true);
    expect(supportCardEnabled({ url: "https://example.org/donate" })).toBe(true);
    expect(supportCardEnabled({ hint: "off" })).toBe(false);
  });
});
