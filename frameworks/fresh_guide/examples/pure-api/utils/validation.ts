export type ValidationRules = Record<
  string,
  {
    required?: boolean;
    type?: "string" | "number" | "boolean" | "email";
    min?: number;
    max?: number;
    pattern?: RegExp;
  }
>;

export function validate(
  data: Record<string, unknown>,
  rules: ValidationRules,
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const fieldErrors: string[] = [];

    if (
      rule.required && (value === undefined || value === null || value === "")
    ) {
      fieldErrors.push(`${field} is required`);
    }

    if (value !== undefined && value !== null && value !== "") {
      if (
        rule.type === "email" && typeof value === "string" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        fieldErrors.push(`${field} must be a valid email`);
      }

      if (
        rule.min !== undefined && typeof value === "string" &&
        value.length < rule.min
      ) {
        fieldErrors.push(`${field} must be at least ${rule.min} characters`);
      }

      if (
        rule.max !== undefined && typeof value === "string" &&
        value.length > rule.max
      ) {
        fieldErrors.push(`${field} must be at most ${rule.max} characters`);
      }

      if (
        rule.pattern && typeof value === "string" && !rule.pattern.test(value)
      ) {
        fieldErrors.push(`${field} format is invalid`);
      }
    }

    if (fieldErrors.length > 0) errors[field] = fieldErrors;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
