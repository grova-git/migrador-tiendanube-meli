import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { AuthController } from './controllers/auth.controller';
import { MercadoLibreMapper } from './services/mercadolibre.mapper';
import { MercadoLibreService } from './services/mercadolibre.service';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const authController = new AuthController();

// Callbacks (Cuando regresan de autorizar)
app.get('/auth/tiendanube/callback', authController.handleTiendanubeCallback.bind(authController));
app.get('/auth/mercadolibre/callback', authController.handleMercadoLibreCallback.bind(authController));

// Rutas para iniciar el flujo de autenticación desde el frontend
app.get('/api/auth/tiendanube', (req, res) => {
  const clientId = process.env.TIENDANUBE_CLIENT_ID;
  if (!clientId || clientId.includes('pega_tu')) return res.status(400).send('Falta TIENDANUBE_CLIENT_ID en Render');
  const redirectUrl = `https://www.tiendanube.com/apps/${clientId}/authorize`;
  res.redirect(redirectUrl);
});

app.get('/api/auth/mercadolibre', (req, res) => {
  const clientId = process.env.ML_CLIENT_ID;
  if (!clientId || clientId.includes('pega_tu')) return res.status(400).send('Falta ML_CLIENT_ID en Render');
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const redirectUri = `${protocol}://${host}/auth/mercadolibre/callback`;
  const redirectUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  res.redirect(redirectUrl);
});

// Example endpoint to test the service
app.get('/api/test-products', async (req, res) => {
   // Assuming access_token and store_id are passed as headers for testing purposes
   const { access_token, store_id } = req.headers;
   
   if (!access_token || !store_id) {
     return res.status(400).json({ error: 'Missing access_token or store_id in headers' });
   }

   try {
     const { TiendanubeService } = await import('./services/tiendanube.service');
     const service = new TiendanubeService(
       access_token as string, 
       store_id as string, 
       'Catalog Migration SaaS', 
       'test@example.com'
     );

     const products = await service.getProducts();
     res.json(products);
   } catch (error: any) {
     res.status(500).json({ error: error.message });
   }
});

app.post('/api/preview', (req, res) => {
  try {
    const products = req.body.products || [];
    const mapper = new MercadoLibreMapper();
    const result = mapper.mapCatalog(products);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/publish', async (req, res) => {
  try {
    const mlToken = req.headers['x-ml-token'] as string;
    if (!mlToken) {
      return res.status(401).json({ error: 'Missing x-ml-token header' });
    }

    const products = req.body.products || [];
    const service = new MercadoLibreService(mlToken);
    
    const report = await service.publishBatch(products);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

let migrationState = {
  status: 'idle', // idle, running, completed
  total: 350,
  current: 0
};

app.post('/api/start-migration', (req, res) => {
  if (migrationState.status === 'running') {
    return res.status(400).json({ error: 'Migration already in progress' });
  }
  
  const { mode } = req.body;
  migrationState = {
    status: 'running',
    total: 350, // mock total
    current: 0
  };

  res.json({ message: 'Migration started' });

  // Mock progression
  const interval = setInterval(() => {
    migrationState.current += 15;
    if (migrationState.current >= migrationState.total) {
      migrationState.current = migrationState.total;
      migrationState.status = 'completed';
      clearInterval(interval);
    }
  }, 250);
});

app.get('/api/progress', (req, res) => {
  res.json(migrationState);
});

export default app;
