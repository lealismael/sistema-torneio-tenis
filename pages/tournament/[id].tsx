import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Tournament = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Participant = {
  id: string;
  name: string;
};

type TournamentPlayer = {
  id: string;
  category_id: number;
  participant: Participant;
};

type Match = {
  id: string;
  round: string;
  category_id: number;
  scheduled_at: string | null;
  wo: boolean;
  set1_player1_games: number | null;
  set1_player2_games: number | null;
  set2_player1_games: number | null;
  set2_player2_games: number | null;
  set3_player1_games: number | null;
  set3_player2_games: number | null;
  player1: { id: string; participant: Participant };
  player2: { id: string; participant: Participant };
  winner: { id: string; participant: Participant } | null;
};

type Category = {
  id: number;
  name: string;
};

const CATEGORIES: Category[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
  { id: 4, name: 'Feminina' },
  { id: 5, name: 'Infantil' }
];

type Tab = 'players' | 'matches' | 'bracket';

const ROUND_ORDER = ['1ª Rodada', 'Oitavas', 'Quartas', 'Semi', 'Final'];

export default function TournamentPage() {
  const router = useRouter();
  const { id } = router.query;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('players');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // PARTICIPANTES
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [selectedCategoryPlayers, setSelectedCategoryPlayers] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showResults, setShowResults] = useState(false);

  // PARTIDAS
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedCategoryMatches, setSelectedCategoryMatches] = useState<number>(1);
  const [round, setRound] = useState('');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // MODAL EDIÇÃO PARTIDA
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editWinnerId, setEditWinnerId] = useState<string>('');
  const [editWo, setEditWo] = useState<boolean>(false);
  const [editScheduledAt, setEditScheduledAt] = useState<string>('');

  async function loadTournament() {
    const res = await fetch(`/api/tournaments/${id}`);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Erro ao carregar torneio');
      return;
    }
    const data: Tournament = await res.json();
    setTournament(data);
  }

  async function loadPlayers() {
    const res = await fetch(`/api/tournaments/${id}/players`);
    const data: TournamentPlayer[] = await res.json();
    setPlayers(data);
  }

  async function loadMatches(categoryId: number) {
    const res = await fetch(
      `/api/tournaments/${id}/matches?categoryId=${encodeURIComponent(String(categoryId))}`
    );
    const data: Match[] = await res.json();

    // ordena por fase (ROUND_ORDER) e depois por horário (scheduled_at)
    const sorted = [...data].sort((a, b) => {
      const ai = ROUND_ORDER.indexOf(a.round);
      const bi = ROUND_ORDER.indexOf(b.round);
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;

      if (aIdx !== bIdx) {
        return aIdx - bIdx;
      }

      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;

      return at - bt;
    });

    setMatches(sorted);
  }

  async function loadAdmin() {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) {
      console.error(e);
      setIsAdmin(null);
    }
  }

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([loadTournament(), loadPlayers(), loadAdmin()])
      .catch((e) => {
        console.error(e);
        setError('Erro ao carregar dados do torneio');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // BUSCA DE PARTICIPANTES
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/participants?query=${encodeURIComponent(search)}`);
        const data: Participant[] = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setIsAdmin(false);
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  }

  async function addExistingPlayer() {
    if (!selectedParticipant) return;

    await fetch(`/api/tournaments/${id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: selectedCategoryPlayers,
        participantId: selectedParticipant.id
      })
    });

    setSelectedParticipant(null);
    setSearch('');
    setShowResults(false);
    await loadPlayers();
  }

  async function addNewParticipant() {
    const name = search.trim();
    if (!name) return;

    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) {
      console.error('Erro ao criar participante');
      return;
    }

    const newP: Participant = await res.json();

    await fetch(`/api/tournaments/${id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: selectedCategoryPlayers,
        participantId: newP.id
      })
    });

    setSearch('');
    setShowResults(false);
    await loadPlayers();
  }

  async function removePlayer(tournamentPlayerId: string, participantName: string) {
    if (!isAdmin) return;

    const ok = confirm(`Remover ${participantName} deste torneio?`);
    if (!ok) return;

    const res = await fetch(`/api/tournaments/${id}/players`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentPlayerId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Erro ao remover jogador');
      return;
    }

    await loadPlayers();
  }

  // CRIAR PARTIDA
  async function createMatch() {
    if (!round) {
      alert('Selecione a fase (rodada) da partida');
      return;
    }
    if (!player1Id || !player2Id) {
      alert('Selecione os dois jogadores');
      return;
    }
    if (player1Id === player2Id) {
      alert('Jogadores devem ser diferentes');
      return;
    }

    const res = await fetch(`/api/tournaments/${id}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: selectedCategoryMatches,
        round,
        player1Id,
        player2Id,
        scheduledAt: scheduledAt || null
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Erro ao criar partida');
      return;
    }

    setRound('');
    setPlayer1Id('');
    setPlayer2Id('');
    setScheduledAt('');

    await loadMatches(selectedCategoryMatches);
  }

  function formatScore(m: Match): string {
    const sets: string[] = [];

    if (m.set1_player1_games != null && m.set1_player2_games != null) {
      sets.push(`${m.set1_player1_games}-${m.set1_player2_games}`);
    }
    if (m.set2_player1_games != null && m.set2_player2_games != null) {
      sets.push(`${m.set2_player1_games}-${m.set2_player2_games}`);
    }
    if (m.set3_player1_games != null && m.set3_player2_games != null) {
      sets.push(`${m.set3_player1_games}-${m.set3_player2_games}`);
    }

    return sets.join(' ');
  }

  // MODAL
  function openEditModal(m: Match) {
    if (!isAdmin) return;
    setEditingMatch(m);
    setEditWinnerId(m.winner ? m.winner.id : '');
    setEditWo(m.wo);

    if (m.scheduled_at) {
      const d = new Date(m.scheduled_at);
      const iso = d.toISOString();
      setEditScheduledAt(iso.slice(0, 16));
    } else {
      setEditScheduledAt('');
    }
  }

  function closeEditModal() {
    setEditingMatch(null);
    setEditWinnerId('');
    setEditWo(false);
    setEditScheduledAt('');
  }

  async function saveEditModal() {
    if (!editingMatch) return;

    const body: any = {
      wo: editWo,
      winner_id: editWinnerId || null,
      set1_player1_games: editingMatch.set1_player1_games,
      set1_player2_games: editingMatch.set1_player2_games,
      set2_player1_games: editingMatch.set2_player1_games,
      set2_player2_games: editingMatch.set2_player2_games,
      set3_player1_games: editingMatch.set3_player1_games,
      set3_player2_games: editingMatch.set3_player2_games
    };

    if (editScheduledAt) {
      body.scheduled_at = new Date(editScheduledAt).toISOString();
    } else {
      body.scheduled_at = null;
    }

    const res = await fetch(`/api/matches/${editingMatch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Erro ao atualizar partida');
      return;
    }

    await loadMatches(selectedCategoryMatches);
    closeEditModal();
  }

  async function removeMatch(matchId: string, label: string) {
    if (!isAdmin) return;

    const ok = confirm(`Remover a partida "${label}"?`);
    if (!ok) return;

    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'DELETE'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert((data as any).error || 'Erro ao remover partida');
      return;
    }

    await loadMatches(selectedCategoryMatches);
  }

  // CHAVE / BRACKET
  function getSetRow(m: Match, player: 1 | 2): (string | number)[] {
    const vals = [
      player === 1 ? m.set1_player1_games : m.set1_player2_games,
      player === 1 ? m.set2_player1_games : m.set2_player2_games,
      player === 1 ? m.set3_player1_games : m.set3_player2_games
    ];

    if (!m.wo) {
      return vals.map((v) => (v == null ? '' : v));
    }

    const base = ['', '', ''];
    const woArr: (string | number)[] = ['w', 'o', ''];

    const winnerId = m.winner?.id;
    const winnerRow: 1 | 2 = winnerId === m.player2.id ? 2 : 1;

    if (player === winnerRow) {
      return woArr;
    }
    return base;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-gray-700">Carregando torneio…</p>
        </div>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            ← Voltar para torneios
          </button>
          <p className="text-red-600">{error || 'Torneio não encontrado'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* topo */}
        <button
          onClick={() => router.push('/')}
          className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          ← Voltar para torneios
        </button>

        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>

            {tournament.start_date && (
              <p className="text-sm text-gray-500 mt-1">
                {new Date(tournament.start_date).toLocaleDateString('pt-BR')}
                {tournament.end_date &&
                  ' - ' + new Date(tournament.end_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {isAdmin === true && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                👤 Admin
              </span>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Sair
              </button>
            </div>
          )}
        </header>

        {/* abas */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex gap-2">
            <button
              onClick={() => setActiveTab('players')}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === 'players'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Participantes
            </button>
            <button
              onClick={() => {
                setActiveTab('matches');
                loadMatches(selectedCategoryMatches);
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === 'matches'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Partidas
            </button>
            <button
              onClick={() => {
                setActiveTab('bracket');
                loadMatches(selectedCategoryMatches);
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === 'bracket'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Chave
            </button>
          </nav>
        </div>

        {/* ABA PARTICIPANTES */}
        {activeTab === 'players' && (
          <section className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Inscrição de participantes
              </h2>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={selectedCategoryPlayers}
                  onChange={(e) => setSelectedCategoryPlayers(Number(e.target.value))}
                  className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative max-w-xs">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedParticipant(null);
                  }}
                  placeholder="Buscar participante..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResults(true);
                  }}
                />

                {showResults && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow z-10 max-h-56 overflow-auto">
                    {searchResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedParticipant(p);
                          setSearch(p.name);
                          setShowResults(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {showResults && search.trim().length > 0 && searchResults.length === 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm text-gray-500">
                    Nenhum encontrado
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {selectedParticipant ? (
                  <button
                    onClick={addExistingPlayer}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Adicionar participante selecionado
                  </button>
                ) : (
                  search.trim().length > 0 && (
                    <button
                      onClick={addNewParticipant}
                      className="inline-flex items-center px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                    >
                      Criar e adicionar “{search.trim()}”
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Jogadores por categoria
              </h3>

              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Categoria {cat.name}
                    </h4>
                    <ul className="space-y-1">
                      {players
                        .filter((p) => p.category_id === cat.id)
                        .map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-1"
                          >
                            <span>{p.participant.name}</span>
                            {isAdmin && (
                              <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => removePlayer(p.id, p.participant.name)}
                              >
                                Remover
                              </button>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ABA PARTIDAS */}
        {activeTab === 'matches' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Partidas</h2>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Categoria:</span>
                <select
                  value={selectedCategoryMatches}
                  onChange={(e) => {
                    const newCat = Number(e.target.value);
                    setSelectedCategoryMatches(newCat);
                    loadMatches(newCat);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isAdmin && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Criar partida
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rodada
                    </label>
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione a fase</option>
                      <option value="1ª Rodada">1ª Rodada</option>
                      <option value="Oitavas">Oitavas</option>
                      <option value="Quartas">Quartas</option>
                      <option value="Semi">Semi</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jogador 1
                    </label>
                    <select
                      value={player1Id}
                      onChange={(e) => setPlayer1Id(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      {players
                        .filter((p) => p.category_id === selectedCategoryMatches)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.participant.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jogador 2
                    </label>
                    <select
                      value={player2Id}
                      onChange={(e) => setPlayer2Id(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      {players
                        .filter((p) => p.category_id === selectedCategoryMatches)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.participant.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    onClick={createMatch}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Criar partida
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Partidas cadastradas
              </h3>

              {matches.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nenhuma partida nessa categoria ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {matches.map((m) => {
                    const score = formatScore(m);
                    const label = `${m.round} — ${m.player1.participant.name} vs ${m.player2.participant.name}`;

                    return (
                      <li
                        key={m.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div>
                            <div className="font-medium text-gray-800">
                              {m.round} — {m.player1.participant.name} vs{' '}
                              {m.player2.participant.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {m.scheduled_at &&
                                new Date(m.scheduled_at).toLocaleString('pt-BR')}
                              {score && <> — {score}</>}
                              {m.wo && <> — WO</>}
                              {m.winner && (
                                <> — Vencedor: {m.winner.participant.name}</>
                              )}
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex gap-2 mt-1 sm:mt-0">
                              <button
                                className="text-xs px-2 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100"
                                onClick={() => openEditModal(m)}
                              >
                                Editar
                              </button>
                              <button
                                className="text-xs px-2 py-1 rounded bg-red-50 border border-red-300 text-red-700 hover:bg-red-100"
                                onClick={() => removeMatch(m.id, label)}
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* ABA CHAVE */}
        {/* ABA CHAVE */}
        {activeTab === 'bracket' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Chave</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Categoria:</span>
                <select
                  value={selectedCategoryMatches}
                  onChange={(e) => {
                    const newCat = Number(e.target.value);
                    setSelectedCategoryMatches(newCat);
                    loadMatches(newCat);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {matches.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nenhuma partida nessa categoria ainda.
              </p>
            ) : (
              <div className="flex gap-6 items-start overflow-x-auto pb-4">
                {ROUND_ORDER.map((roundName, roundIndex) => {
                  const roundMatches = matches.filter((m) => m.round === roundName);
                  if (roundMatches.length === 0) return null;

                  // aumenta o espaço vertical conforme a fase vai afunilando
                  const spacingClass =
                    roundIndex === 0
                      ? "space-y-4 pt-2"
                      : roundIndex === 1
                        ? "space-y-8 pt-6"
                        : roundIndex === 2
                          ? "space-y-12 pt-10"
                          : roundIndex === 3
                            ? "space-y-16 pt-16"
                            : "space-y-24 pt-20";

                  return (
                    <div key={roundName} className="min-w-[230px] flex-shrink-0">
                      <h4 className="text-center text-sm font-semibold text-gray-700 mb-2">
                        {roundName}
                      </h4>

                      <div className={spacingClass}>
                        {roundMatches.map((m) => {
                          const row1 = getSetRow(m, 1);
                          const row2 = getSetRow(m, 2);

                          return (
                            <div
                              key={m.id}
                              className="relative border border-gray-200 rounded-lg bg-white p-2 text-xs shadow-sm"
                            >
                              <div className="text-[11px] text-gray-500 mb-1">
                                {m.scheduled_at &&
                                  new Date(m.scheduled_at).toLocaleString('pt-BR')}
                              </div>

                              {/* jogador 1 */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex-1 mr-2 text-[12px] text-gray-800">
                                  {m.player1.participant.name}
                                </span>
                                <div className="flex gap-1">
                                  {row1.map((v, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-7 h-6 border border-gray-200 rounded text-center leading-[22px] text-[11px] ${m.winner && m.winner.id === m.player1.id
                                          ? "bg-emerald-50"
                                          : "bg-white"
                                        }`}
                                    >
                                      {v}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* jogador 2 */}
                              <div className="flex items-center justify-between">
                                <span className="flex-1 mr-2 text-[12px] text-gray-800">
                                  {m.player2.participant.name}
                                </span>
                                <div className="flex gap-1">
                                  {row2.map((v, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-7 h-6 border border-gray-200 rounded text-center leading-[22px] text-[11px] ${m.winner && m.winner.id === m.player2.id
                                          ? "bg-emerald-50"
                                          : "bg-white"
                                        }`}
                                    >
                                      {v}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {m.wo && (
                                <div className="mt-1 text-[11px] text-red-600">
                                  WO
                                </div>
                              )}
                              {m.winner && (
                                <div className="mt-0.5 text-[11px] text-gray-600">
                                  Vencedor: {m.winner.participant.name}
                                </div>
                              )}

                              {/* “tracinhos” sugerindo ligação entre fases */}
                              {roundIndex < ROUND_ORDER.length - 1 && (
                                <div className="hidden md:block absolute -right-4 top-1/2 w-4 h-px bg-gray-300" />
                              )}
                              {roundIndex > 0 && (
                                <div className="hidden md:block absolute -left-4 top-1/2 w-4 h-px bg-gray-300" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

      {/* MODAL EDIÇÃO PARTIDA */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Editar partida
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {editingMatch.player1.participant.name} vs{' '}
              {editingMatch.player2.participant.name}
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário
                </label>
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Placar */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Placar (sets)
                </h4>

                {[1, 2, 3].map((setNum) => (
                  <div
                    key={setNum}
                    className="flex items-center gap-2 mb-1.5 text-sm"
                  >
                    <span className="w-16 text-gray-700">Set {setNum}:</span>

                    <input
                      type="number"
                      min={0}
                      disabled={editWo}
                      value={
                        setNum === 1
                          ? editingMatch.set1_player1_games ?? ''
                          : setNum === 2
                            ? editingMatch.set2_player1_games ?? ''
                            : editingMatch.set3_player1_games ?? ''
                      }
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        if (setNum === 1) editingMatch.set1_player1_games = v;
                        if (setNum === 2) editingMatch.set2_player1_games = v;
                        if (setNum === 3) editingMatch.set3_player1_games = v;
                        setEditingMatch({ ...editingMatch });
                      }}
                      className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <span className="text-gray-500">–</span>

                    <input
                      type="number"
                      min={0}
                      disabled={editWo}
                      value={
                        setNum === 1
                          ? editingMatch.set1_player2_games ?? ''
                          : setNum === 2
                            ? editingMatch.set2_player2_games ?? ''
                            : editingMatch.set3_player2_games ?? ''
                      }
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        if (setNum === 1) editingMatch.set1_player2_games = v;
                        if (setNum === 2) editingMatch.set2_player2_games = v;
                        if (setNum === 3) editingMatch.set3_player2_games = v;
                        setEditingMatch({ ...editingMatch });
                      }}
                      className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  WO:
                </label>
                <input
                  type="checkbox"
                  checked={editWo}
                  onChange={(e) => setEditWo(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vencedor
                </label>
                <select
                  value={editWinnerId}
                  onChange={(e) => setEditWinnerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sem vencedor ainda</option>
                  <option value={editingMatch.player1.id}>
                    {editingMatch.player1.participant.name}
                  </option>
                  <option value={editingMatch.player2.id}>
                    {editingMatch.player2.participant.name}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={closeEditModal}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditModal}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}