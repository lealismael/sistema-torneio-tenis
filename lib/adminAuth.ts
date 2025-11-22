import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';

export function isAdminRequest(req: NextApiRequest): boolean {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parse(cookieHeader);
  return cookies['sgtenis_admin'] === '1';
}

export function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Não autorizado' });
    return false;
  }
  return true;
}
