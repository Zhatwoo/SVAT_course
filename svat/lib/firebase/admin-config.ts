export function getAdminProjectId(): string | undefined {
  return process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function getAdminStorageBucket(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

export function isFirebaseAdminConfigured(): boolean {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  return Boolean(getAdminProjectId() && clientEmail && privateKey && getAdminStorageBucket());
}
