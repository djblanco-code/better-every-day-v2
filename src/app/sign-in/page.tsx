import { SignInButtons } from "./buttons";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Better Every Day</h1>
        <p className="mt-1 text-neutral-600">Sign in with an account you already have. No password is stored here.</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      ) : null}
      <SignInButtons next={next} />
      <p className="text-xs text-neutral-500">Invite only. Your data is visible to you alone, enforced by the database.</p>
    </main>
  );
}
