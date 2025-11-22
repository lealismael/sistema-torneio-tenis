// pages/api/tournaments/[id]/matches/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tournamentId = req.query.id as string;

  if (req.method === 'GET') {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;

    let q = supabaseAdmin
      .from('matches')
      .select(
        `
        id,
        round,
        category_id,
        scheduled_at,
        wo,
        set1_player1_games,
        set1_player2_games,
        set2_player1_games,
        set2_player2_games,
        set3_player1_games,
        set3_player2_games,
        player1:tournament_players!matches_player1_id_fkey (
          id,
          participant:participants (id, name)
        ),
        player2:tournament_players!matches_player2_id_fkey (
          id,
          participant:participants (id, name)
        ),
        winner:tournament_players!matches_winner_id_fkey (
          id,
          participant:participants (id, name)
        )
      `
      )
      .eq('tournament_id', tournamentId)
      .order('scheduled_at', { ascending: true });

    if (categoryId) q = q.eq('category_id', categoryId);

    const { data, error } = await q;

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar partidas' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const { categoryId, round, player1Id, player2Id, scheduledAt } = req.body;

    if (!categoryId || !round || !player1Id || !player2Id) {
      return res
        .status(400)
        .json({ error: 'categoryId, round, player1Id e player2Id são obrigatórios' });
    }

    const { data, error } = await supabaseAdmin
      .from('matches')
      .insert({
        tournament_id: tournamentId,
        category_id: categoryId,
        round,
        player1_id: player1Id,
        player2_id: player2Id,
        scheduled_at: scheduledAt || null
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar partida' });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
