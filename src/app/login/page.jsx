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
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-100 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">LocalDrop</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your password to continue</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors"
          >
            Access LocalDrop
          </button>
        </form>
      </div>
    </main>
  );
}