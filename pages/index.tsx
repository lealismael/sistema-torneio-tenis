import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Tournament = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export default function Home() {
  const router = useRouter();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // form de novo torneio (apenas admin)
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadTournaments() {
    try {
      setLoading(true);
      const res = await fetch('/api/tournaments');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao buscar torneios');
      }
      const data: Tournament[] = await res.json();
      setTournaments(data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao buscar torneios');
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmin() {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        setIsAdmin(null);
        return;
      }
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) {
      console.error(e);
      setIsAdmin(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
      });
      setIsAdmin(false);
      // opcional: limpar coisas de admin aqui, se tiver
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadTournaments();
    loadAdmin();
  }, []);

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do torneio');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          startDate: startDate || null,
          endDate: endDate || null
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao criar torneio');
      }

      setName('');
      setStartDate('');
      setEndDate('');
      await loadTournaments();
      alert('Torneio criado com sucesso!');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao criar torneio');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">
              Torneios de Tênis
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Sociedade Ginástica de São Bento do Sul
            </p>
          </div>

          <div>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
                  <span className="text-lg">👤</span>
                  Admin logado
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                onClick={() => router.push('/login')}
              >
                Login Admin
              </button>
            )}
          </div>
        </header>

        {/* Form de criação de torneio (apenas admin) */}
        {isAdmin && (
          <section className="mb-8">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-3">
                Novo torneio
              </h2>

              <form
                onSubmit={handleCreateTournament}
                className="grid gap-3 sm:grid-cols-3"
              >
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do torneio
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Novembro 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data início
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data fim
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full sm:w-auto inline-flex justify-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {creating ? 'Salvando...' : 'Criar torneio'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Lista de torneios */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Torneios cadastrados
            </h2>
          </div>

          {loading && <p className="text-gray-600">Carregando...</p>}

          {error && (
            <p className="text-sm text-red-600 mb-2">
              {error}
            </p>
          )}

          {!loading && !error && tournaments.length === 0 && (
            <p className="text-gray-600">
              Nenhum torneio cadastrado ainda.
            </p>
          )}

          <ul className="mt-2 space-y-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/tournament/${t.id}`)}
                  className="w-full text-left bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {t.name}
                    </h3>
                    {t.start_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(t.start_date).toLocaleDateString('pt-BR')}
                        {t.end_date &&
                          ' - ' +
                          new Date(t.end_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    Ver detalhes →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
