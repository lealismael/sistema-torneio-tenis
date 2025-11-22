import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';

type Tournament = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, aRes] = await Promise.all([
          fetch('/api/tournaments'),
          fetch('/api/admin/me')
        ]);

        const tData: Tournament[] = await tRes.json();
        setTournaments(tData);

        const aData: { isAdmin: boolean } = await aRes.json();
        setIsAdmin(aData.isAdmin);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function createTournament(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startDate, endDate })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setName('');
    setStartDate('');
    setEndDate('');

    const reload = await fetch('/api/tournaments');
    setTournaments(await reload.json());
  }

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Torneios de Tênis – SG São Bento</h1>

        {isAdmin ? (
          <span style={{ fontSize: 14 }}>👤 Admin logado</span>
        ) : (
          <Link href="/login">Login Admin</Link>
        )}
      </header>

      <h2>Torneios</h2>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <>
          {tournaments.length === 0 ? (
            <p>Nenhum torneio cadastrado ainda.</p>
          ) : (
            <ul>
              {tournaments.map(t => (
                <li key={t.id}>
                  <Link href={`/tournament/${t.id}`}>{t.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h3>Criar novo torneio {isAdmin ? '(admin)' : '(requer login)'}</h3>

      <form onSubmit={createTournament} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Criar torneio</button>
      </form>
    </main>
  );
}
