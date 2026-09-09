type Props = {
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function LoginForm({ action, error }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Meal Prep</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            Wrong password. Try again.
          </p>
        )}
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 font-medium text-white"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
