// pages/api/matches/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const matchId = req.query.id as string;

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;

    const {
      set1_player1_games,
      set1_player2_games,
      set2_player1_games,
      set2_player2_games,
      set3_player1_games,
      set3_player2_games,
      wo,
      winner_id,
      scheduled_at
    } = req.body;

    const update: Record<string, any> = {};

    if (typeof set1_player1_games !== 'undefined') update.set1_player1_games = set1_player1_games;
    if (typeof set1_player2_games !== 'undefined') update.set1_player2_games = set1_player2_games;
    if (typeof set2_player1_games !== 'undefined') update.set2_player1_games = set2_player1_games;
    if (typeof set2_player2_games !== 'undefined') update.set2_player2_games = set2_player2_games;
    if (typeof set3_player1_games !== 'undefined') update.set3_player1_games = set3_player1_games;
    if (typeof set3_player2_games !== 'undefined') update.set3_player2_games = set3_player2_games;
    if (typeof wo !== 'undefined') update.wo = wo;
    if (typeof winner_id !== 'undefined') update.winner_id = winner_id || null;
    if (typeof scheduled_at !== 'undefined') update.scheduled_at = scheduled_at || null;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar partida' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;

    const { error } = await supabaseAdmin
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover partida' });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
