import { Request, Response } from 'express';
import axios from 'axios';

// Mock DB en memoria para almacenar los tokens en esta versión MVP
export const mockDatabase = {
  tiendanubeToken: '',
  tiendanubeStoreId: '',
  mlToken: ''
};

export class AuthController {
  async handleTiendanubeCallback(req: Request, res: Response) {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/?error=missing_tn_code');
    }

    try {
      const response = await axios.post('https://www.tiendanube.com/apps/authorize/token', {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code
      });

      const { access_token, user_id } = response.data;
      
      // Guardamos en nuestra "base de datos"
      mockDatabase.tiendanubeToken = access_token;
      mockDatabase.tiendanubeStoreId = user_id;

      // Redirigimos al frontend con bandera de éxito
      res.redirect('/?tn_success=true');
    } catch (error: any) {
      console.error('Error during Tiendanube OAuth:', error.response?.data || error.message);
      res.redirect('/?error=tn_oauth_failed');
    }
  }

  async handleMercadoLibreCallback(req: Request, res: Response) {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/?error=missing_ml_code');
    }

    try {
      // Determinamos el host dinámicamente para la redirect_uri de ML
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/auth/mercadolibre/callback`;

      const response = await axios.post('https://api.mercadolibre.com/oauth/token', new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID || '',
        client_secret: process.env.ML_CLIENT_SECRET || '',
        code: code as string,
        redirect_uri: redirectUri
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      // Guardamos el token en nuestra "base de datos"
      mockDatabase.mlToken = response.data.access_token;

      // Redirigimos al frontend con bandera de éxito
      res.redirect('/?ml_success=true');
    } catch (error: any) {
      console.error('Error during ML OAuth:', error.response?.data || error.message);
      res.redirect('/?error=ml_oauth_failed');
    }
  }
}
