// pages/api/tournaments/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tournamentId = req.query.id as string;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Torneio não encontrado' });
  }

  return res.status(200).json(data);
}
