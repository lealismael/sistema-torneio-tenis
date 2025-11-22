import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tournamentId = req.query.id as string;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('tournament_players')
      .select('id, category_id, participant:participants (id, name)')
      .eq('tournament_id', tournamentId)
      .order('category_id', { ascending: true });

    if (error) return res.status(500).json({ error: 'Erro ao buscar jogadores' });

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const { categoryId, participantId } = req.body;

    if (!categoryId || !participantId)
      return res.status(400).json({ error: 'categoryId e participantId são obrigatórios' });

    const { data, error } = await supabaseAdmin
      .from('tournament_players')
      .insert({
        tournament_id: tournamentId,
        category_id: categoryId,
        participant_id: participantId
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao adicionar jogador' });

    return res.status(201).json(data);
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;

    const { tournamentPlayerId } = req.body as { tournamentPlayerId?: string };

    if (!tournamentPlayerId) {
      return res.status(400).json({ error: 'tournamentPlayerId é obrigatório' });
    }

    // tenta remover; pode falhar se existirem partidas ligadas a esse jogador
    const { error } = await supabaseAdmin
      .from('tournament_players')
      .delete()
      .eq('id', tournamentPlayerId)
      .eq('tournament_id', tournamentId);

    if (error) {
      // 23503 = violação de FK (provavelmente já tem partidas usando esse jogador)
      if ((error as any).code === '23503') {
        return res.status(400).json({
          error: 'Não é possível remover: este jogador já está em partidas cadastradas.'
        });
      }

      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover jogador' });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
