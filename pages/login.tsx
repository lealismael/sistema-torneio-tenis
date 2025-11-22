import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function checkAdmin() {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) {
      console.error(e);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Informe usuário e senha.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as any).error || 'Usuário ou senha inválidos.');
        return;
      }

      // login OK → volta pra home
      router.push('/');
    } catch (e) {
      console.error(e);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-4 inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            ← Voltar para torneios
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Login do administrador
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Acesso restrito à organização do torneio.
          </p>

          {/* Info se já estiver logado */}
          {checkingAdmin ? (
            <p className="text-sm text-gray-500 mb-4">Verificando sessão…</p>
          ) : isAdmin ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Você já está logado como administrador.
            </div>
          ) : null}

          {/* Form de login */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-400 text-center">
            As credenciais são definidas nas variáveis de ambiente do sistema.
          </p>
        </div>
      </div>
    </main>
  );
}