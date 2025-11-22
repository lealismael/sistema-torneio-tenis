// pages/api/admin/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminRequest } from '../../../lib/adminAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const isAdmin = isAdminRequest(req);
  return res.status(200).json({ isAdmin });
}
