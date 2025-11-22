import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const query = (req.query.query as string | undefined)?.trim() || '';

    let q = supabaseAdmin.from('participants').select('*').order('name', { ascending: true });

    if (query) q = q.ilike('name', `%${query}%`);

    const { data, error } = await q.limit(20);

    if (error) return res.status(500).json({ error: 'Erro ao buscar participantes' });

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const { name } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabaseAdmin
      .from('participants')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao criar participante' });

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
