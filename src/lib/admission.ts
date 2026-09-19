export type Admission = "unknown" | "open" | "closed" | "unavailable";

export function admissionStatus(result: boolean | Error): Admission {
  if (result instanceof Error) return "unavailable";
  return result ? "open" : "closed";
}

export function admissionFailureMessage(status: Extract<Admission, "closed" | "unavailable">) {
  return status === "closed"
    ? "Crate is not accepting new libraries right now. Please try again later."
    : "Crate couldn’t check whether a new library can be created. Check your connection and try again.";
}
