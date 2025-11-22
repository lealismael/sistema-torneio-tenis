// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // podemos aceitar POST ou GET; se quiser restringir, troca aqui
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // zera o cookie sgtenis_admin
  const cookie = serialize('sgtenis_admin', '', {
    path: '/',
    maxAge: 0, // expira imediatamente
  });

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}