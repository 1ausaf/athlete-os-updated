/** Aligns with DB `profile_is_minor`: unknown DOB is not a minor. */
export function isMinorFromDateOfBirth(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return false;
  const parts = dateOfBirth.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return false;
  const dob = new Date(y, m - 1, d);
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return dob > limit;
}
