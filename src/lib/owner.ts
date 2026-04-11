const OWNER_EMAIL = process.env.OWNER_EMAIL;

export function isOwner(email: string | undefined): boolean {
  if (!OWNER_EMAIL || !email) return false;
  return email === OWNER_EMAIL;
}
