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

app.get('/auth/tiendanube/callback', authController.handleCallback.bind(authController));

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
