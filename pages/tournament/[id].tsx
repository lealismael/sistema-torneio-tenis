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

  // ---- PARTICIPANTES ----
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [selectedCategoryPlayers, setSelectedCategoryPlayers] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showResults, setShowResults] = useState(false);

  // ---- PARTIDAS (lista + criação + edição leve) ----
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedCategoryMatches, setSelectedCategoryMatches] = useState<number>(1);
  const [round, setRound] = useState('Quartas');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // ---- MODAL EDIÇÃO DE PARTIDA (vencedor/WO/horário) ----
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
    setMatches(data);
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

  // ---- BUSCA DE PARTICIPANTES (autocomplete) ----
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

  // ---- CRIAR PARTIDA ----
  async function createMatch() {
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

    setRound('Quartas');
    setPlayer1Id('');
    setPlayer2Id('');
    setScheduledAt('');

    await loadMatches(selectedCategoryMatches);
  }

  // ---- FORMATAR PLACAR (para listas e, se quiser, também na chave) ----
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

  // ---- MODAL: abrir com dados da partida ----
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

  // ---- FUNÇÕES AUXILIARES PARA A CHAVE (BRACKET) ----

  function getSetRow(m: Match, player: 1 | 2): (string | number)[] {
    // valores padrão (numéricos)
    const vals = [
      player === 1 ? m.set1_player1_games : m.set1_player2_games,
      player === 1 ? m.set2_player1_games : m.set2_player2_games,
      player === 1 ? m.set3_player1_games : m.set3_player2_games
    ];

    if (!m.wo) {
      return vals.map((v) => (v == null ? '' : v));
    }

    // Se WO: exibe [w][o] na linha do vencedor
    const base = ['', '', ''];
    const woArr: (string | number)[] = ['w', 'o', ''];

    const winnerId = m.winner?.id;
    const winnerRow: 1 | 2 =
      winnerId === m.player2.id ? 2 : 1; // default player1 se winner não definido

    if (player === winnerRow) {
      return woArr;
    }
    return base;
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
        <p>Carregando torneio…</p>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
        <button onClick={() => router.push('/')} style={{ marginBottom: 16 }}>
          ← Voltar para torneios
        </button>
        <p style={{ color: 'red' }}>{error || 'Torneio não encontrado'}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', fontFamily: 'system-ui' }}>
      <button onClick={() => router.push('/')} style={{ marginBottom: 16 }}>
        ← Voltar para torneios
      </button>

      <h1>{tournament.name}</h1>
      {tournament.start_date && (
        <p style={{ marginBottom: 16 }}>
          {new Date(tournament.start_date).toLocaleDateString('pt-BR')}
          {tournament.end_date
            ? ' - ' + new Date(tournament.end_date).toLocaleDateString('pt-BR')
            : ''}
        </p>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('players')}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: activeTab === 'players' ? '2px solid #000' : '1px solid #ccc',
            background: activeTab === 'players' ? '#eee' : '#fff',
            cursor: 'pointer'
          }}
        >
          Participantes
        </button>
        <button
          onClick={() => {
            setActiveTab('matches');
            loadMatches(selectedCategoryMatches);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: activeTab === 'matches' ? '2px solid #000' : '1px solid #ccc',
            background: activeTab === 'matches' ? '#eee' : '#fff',
            cursor: 'pointer'
          }}
        >
          Partidas
        </button>
        <button
          onClick={() => {
            setActiveTab('bracket');
            loadMatches(selectedCategoryMatches);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: activeTab === 'bracket' ? '2px solid #000' : '1px solid #ccc',
            background: activeTab === 'bracket' ? '#eee' : '#fff',
            cursor: 'pointer'
          }}
        >
          Chave
        </button>
      </div>

      {/* ---------------------- ABA PARTICIPANTES ---------------------- */}
      {activeTab === 'players' && (
        <>
          <h2>Participantes</h2>

          {/* Seleção de categoria para inscrição */}
          <label>
            Categoria:{' '}
            <select
              value={selectedCategoryPlayers}
              onChange={(e) => setSelectedCategoryPlayers(Number(e.target.value))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Bloco de busca e seleção */}
          <div style={{ marginTop: 20, maxWidth: 320 }}>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedParticipant(null);
              }}
              placeholder="Buscar participante..."
              style={{ width: '100%', padding: 8 }}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
            />

            {showResults && searchResults.length > 0 && (
              <div
                style={{
                  background: 'white',
                  border: '1px solid #ccc',
                  borderTop: 'none'
                }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedParticipant(p);
                      setSearch(p.name);
                      setShowResults(false);
                    }}
                    style={{
                      padding: 8,
                      cursor: 'pointer',
                      borderTop: '1px solid #eee'
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}

            {showResults && search.trim().length > 0 && searchResults.length === 0 && (
              <div
                style={{
                  background: 'white',
                  border: '1px solid #ccc',
                  borderTop: 'none',
                  padding: 8,
                  color: '#666'
                }}
              >
                Nenhum encontrado
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              {selectedParticipant ? (
                <button onClick={addExistingPlayer}>Adicionar participante selecionado</button>
              ) : (
                search.trim().length > 0 && (
                  <button onClick={addNewParticipant}>
                    Criar e adicionar “{search.trim()}”
                  </button>
                )
              )}
            </div>
          </div>

          <hr style={{ margin: '30px 0' }} />

          <h3>Jogadores por categoria</h3>

          {CATEGORIES.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              <h4>{cat.name}</h4>
              <ul>
                {players
                  .filter((p) => p.category_id === cat.id)
                  .map((p) => (
                    <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{p.participant.name}</span>
                      {isAdmin && (
                        <button
                          style={{ fontSize: 12 }}
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
        </>
      )}

      {/* ---------------------- ABA PARTIDAS ---------------------- */}
      {activeTab === 'matches' && (
        <>
          <h2>Partidas</h2>

          {/* Filtro de categoria */}
          <div style={{ marginBottom: 12 }}>
            <label>
              Categoria:{' '}
              <select
                value={selectedCategoryMatches}
                onChange={(e) => {
                  const newCat = Number(e.target.value);
                  setSelectedCategoryMatches(newCat);
                  loadMatches(newCat);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Form de criação de partida */}
          {isAdmin && (
            <div
              style={{
                marginTop: 8,
                marginBottom: 24,
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 6,
                maxWidth: 420
              }}
            >
              <h3>Criar partida</h3>

              <div style={{ marginBottom: 8 }}>
                <label>
                  Rodada:{' '}
                  <select value={round} onChange={(e) => setRound(e.target.value)}>
                    <option value="1ª Rodada">1ª Rodada</option>
                    <option value="Oitavas">Oitavas</option>
                    <option value="Quartas">Quartas</option>
                    <option value="Semi">Semi</option>
                    <option value="Final">Final</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>
                  Jogador 1:{' '}
                  <select
                    value={player1Id}
                    onChange={(e) => setPlayer1Id(e.target.value)}
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
                </label>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>
                  Jogador 2:{' '}
                  <select
                    value={player2Id}
                    onChange={(e) => setPlayer2Id(e.target.value)}
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
                </label>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>
                  Horário:{' '}
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </label>
              </div>

              <button onClick={createMatch}>Criar partida</button>
            </div>
          )}

          {/* Lista de partidas */}
          <h3>Partidas cadastradas</h3>

          {matches.length === 0 ? (
            <p>Nenhuma partida nessa categoria ainda.</p>
          ) : (
            <ul>
              {matches.map((m) => {
                const score = formatScore(m);
                const label = `${m.round} — ${m.player1.participant.name} vs ${m.player2.participant.name}`;

                return (
                  <li key={m.id} style={{ marginBottom: 10 }}>
                    <div>
                      <strong>{m.round}</strong> — {m.player1.participant.name} vs{' '}
                      {m.player2.participant.name}
                      {m.scheduled_at && (
                        <> — {new Date(m.scheduled_at).toLocaleString('pt-BR')}</>
                      )}
                      {score && <> — {score}</>}
                      {m.wo && <> — WO</>}
                      {m.winner && (
                        <> — Vencedor: {m.winner.participant.name}</>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                        <button
                          style={{ fontSize: 12 }}
                          onClick={() => openEditModal(m)}
                        >
                          Editar partida
                        </button>
                        <button
                          style={{ fontSize: 12 }}
                          onClick={() => removeMatch(m.id, label)}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ---------------------- ABA CHAVE (BRACKET) ---------------------- */}
      {activeTab === 'bracket' && (
        <>
          <h2>Chave</h2>

          <div style={{ marginBottom: 12 }}>
            <label>
              Categoria:{' '}
              <select
                value={selectedCategoryMatches}
                onChange={(e) => {
                  const newCat = Number(e.target.value);
                  setSelectedCategoryMatches(newCat);
                  loadMatches(newCat);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {matches.length === 0 ? (
            <p>Nenhuma partida nessa categoria ainda.</p>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                overflowX: 'auto',
                paddingBottom: 16
              }}
            >
              {ROUND_ORDER.map((roundName) => {
                const roundMatches = matches.filter((m) => m.round === roundName);
                if (roundMatches.length === 0) return null;

                return (
                  <div
                    key={roundName}
                    style={{
                      minWidth: 220,
                      flex: '0 0 auto'
                    }}
                  >
                    <h4 style={{ textAlign: 'center', marginBottom: 8 }}>{roundName}</h4>

                    {roundMatches.map((m) => {
                      const row1 = getSetRow(m, 1);
                      const row2 = getSetRow(m, 2);

                      return (
                        <div
                          key={m.id}
                          style={{
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            padding: 8,
                            marginBottom: 12,
                            background: '#fafafa'
                          }}
                        >
                          <div style={{ fontSize: 12, marginBottom: 4 }}>
                            {m.scheduled_at &&
                              new Date(m.scheduled_at).toLocaleString('pt-BR')}
                          </div>

                          {/* Linha jogador 1 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 4
                            }}
                          >
                            <span style={{ flex: 1, marginRight: 8, fontSize: 14 }}>
                              {m.player1.participant.name}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {row1.map((v, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: 26,
                                    height: 24,
                                    border: '1px solid #ddd',
                                    borderRadius: 4,
                                    textAlign: 'center',
                                    fontSize: 13,
                                    lineHeight: '22px',
                                    background:
                                      m.winner && m.winner.id === m.player1.id
                                        ? '#e3ffe3'
                                        : 'white'
                                  }}
                                >
                                  {v}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Linha jogador 2 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ flex: 1, marginRight: 8, fontSize: 14 }}>
                              {m.player2.participant.name}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {row2.map((v, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: 26,
                                    height: 24,
                                    border: '1px solid #ddd',
                                    borderRadius: 4,
                                    textAlign: 'center',
                                    fontSize: 13,
                                    lineHeight: '22px',
                                    background:
                                      m.winner && m.winner.id === m.player2.id
                                        ? '#e3ffe3'
                                        : 'white'
                                  }}
                                >
                                  {v}
                                </div>
                              ))}
                            </div>
                          </div>

                          {m.wo && (
                            <div style={{ marginTop: 4, fontSize: 12, color: '#b00' }}>
                              WO
                            </div>
                          )}
                          {m.winner && (
                            <div style={{ marginTop: 2, fontSize: 12 }}>
                              Vencedor: {m.winner.participant.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------------------- MODAL DE EDIÇÃO DE PARTIDA ---------------------- */}
      {editingMatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 8,
              minWidth: 320,
              maxWidth: 480,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <h3>Editar partida</h3>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              {editingMatch.player1.participant.name} vs{' '}
              {editingMatch.player2.participant.name}
            </p>

            <div style={{ marginBottom: 8 }}>
              <label>
                Horário:{' '}
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                />
              </label>
            </div>

            {/* ----- SETS ----- */}
            <div style={{ marginBottom: 12 }}>
              <h4>Placar</h4>

              {[1, 2, 3].map((setNum) => (
                <div key={setNum} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ width: 60 }}>Set {setNum}:</span>

                  {/* Player 1 */}
                  <input
                    type="number"
                    min="0"
                    disabled={editWo}
                    value={
                      setNum === 1 ? editingMatch.set1_player1_games ?? '' :
                        setNum === 2 ? editingMatch.set2_player1_games ?? '' :
                          editingMatch.set3_player1_games ?? ''
                    }
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      if (setNum === 1) editingMatch.set1_player1_games = v;
                      if (setNum === 2) editingMatch.set2_player1_games = v;
                      if (setNum === 3) editingMatch.set3_player1_games = v;
                      setEditingMatch({ ...editingMatch });
                    }}
                    style={{ width: 45, marginRight: 6 }}
                  />

                  <span style={{ marginRight: 6 }}>–</span>

                  {/* Player 2 */}
                  <input
                    type="number"
                    min="0"
                    disabled={editWo}
                    value={
                      setNum === 1 ? editingMatch.set1_player2_games ?? '' :
                        setNum === 2 ? editingMatch.set2_player2_games ?? '' :
                          editingMatch.set3_player2_games ?? ''
                    }
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      if (setNum === 1) editingMatch.set1_player2_games = v;
                      if (setNum === 2) editingMatch.set2_player2_games = v;
                      if (setNum === 3) editingMatch.set3_player2_games = v;
                      setEditingMatch({ ...editingMatch });
                    }}
                    style={{ width: 45 }}
                  />
                </div>
              ))}
            </div>

            {/* ----- WO ----- */}
            <div style={{ marginBottom: 8 }}>
              <label>
                WO:
                <input
                  type="checkbox"
                  checked={editWo}
                  onChange={(e) => {
                    setEditWo(e.target.checked);
                  }}
                  style={{ marginLeft: 6 }}
                />
              </label>
            </div>

            {/* ----- VENCEDOR ----- */}
            <div style={{ marginBottom: 12 }}>
              <label>
                Vencedor:{' '}
                <select
                  value={editWinnerId}
                  onChange={(e) => setEditWinnerId(e.target.value)}
                >
                  <option value="">Sem vencedor ainda</option>
                  <option value={editingMatch.player1.id}>
                    {editingMatch.player1.participant.name}
                  </option>
                  <option value={editingMatch.player2.id}>
                    {editingMatch.player2.participant.name}
                  </option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeEditModal}>Cancelar</button>
              <button onClick={saveEditModal}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
