import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) return res.status(500).json({ error: 'Erro ao buscar torneios' });

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const { name, startDate, endDate } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .insert({ name, start_date: startDate || null, end_date: endDate || null })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao criar torneio' });

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
