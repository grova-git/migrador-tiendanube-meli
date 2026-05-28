import { Request, Response } from 'express';
import axios from 'axios';

export class AuthController {
  async handleCallback(req: Request, res: Response) {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    try {
      const response = await axios.post('https://www.tiendanube.com/apps/authorize/token', {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code
      });

      const { access_token, token_type, scope, user_id } = response.data;

      // In a real scenario, we would save these in the database linked to our user.
      // For now, we return them or redirect.

      res.status(200).json({
        message: 'Authentication successful',
        data: {
          access_token,
          store_id: user_id
        }
      });
    } catch (error: any) {
      console.error('Error during Tiendanube OAuth:', error.response?.data || error.message);
      res.status(500).json({ error: 'OAuth authorization failed' });
    }
  }
}
