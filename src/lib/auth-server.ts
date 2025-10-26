export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  // TODO: integrate NextAuth credentials provider.
  return null;
}
