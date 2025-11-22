import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || '1234';

  if (username === adminUser && password === adminPass) {
    const cookie = serialize('sgtenis_admin', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    });

    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Usuário ou senha inválidos' });
}