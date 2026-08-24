import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  async function handleLogin(formData) {
    'use server';

    const password = formData.get('password');
    const expectedPass = process.env.AUTH_PASS;

    if (password === expectedPass) {
      // Set the cookie directly in the server action
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'localdrop_auth',
        value: expectedPass,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      // Redirect back to home page
      redirect('/');
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black p-4 text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.png" alt="PearDrop" className="mb-3 h-14 w-14 rounded-2xl" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">PearDrop</h1>
          <p className="mt-1 text-sm text-neutral-400">Enter your password to continue</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-xl border border-neutral-700 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Access PearDrop
          </button>
        </form>
      </div>
    </main>
  );
}