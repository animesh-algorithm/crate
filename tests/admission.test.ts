import { describe, expect, it } from "vitest";
import { admissionFailureMessage, admissionStatus } from "../src/lib/admission";

describe("online-library admission", () => {
  it("keeps an explicit closed release distinct from a failed check", () => {
    expect(admissionStatus(false)).toBe("closed");
    expect(admissionFailureMessage("closed")).toContain("not accepting new libraries");
  });

  it("makes a failed availability check retryable without claiming capacity is closed", () => {
    expect(admissionStatus(new Error("network unavailable"))).toBe("unavailable");
    expect(admissionFailureMessage("unavailable")).toContain("couldn’t check");
    expect(admissionFailureMessage("unavailable")).not.toContain("capacity");
  });
});
