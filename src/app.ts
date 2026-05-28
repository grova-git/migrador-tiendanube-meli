import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { AuthController, mockDatabase } from './controllers/auth.controller';
import { MercadoLibreMapper } from './services/mercadolibre.mapper';
import { MercadoLibreService } from './services/mercadolibre.service';
import { TiendanubeService } from './services/tiendanube.service';

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

app.post('/api/start-migration', async (req, res) => {
  if (migrationState.status === 'running') {
    return res.status(400).json({ error: 'Migration already in progress' });
  }
  
  const { tiendanubeToken, tiendanubeStoreId, mlToken } = mockDatabase;

  if (!tiendanubeToken || !tiendanubeStoreId || !mlToken) {
    return res.status(401).json({ error: 'Faltan credenciales de conexión en la sesión.' });
  }

  // Responder inmediatamente al frontend para liberar el request
  res.json({ message: 'Migration started' });

  migrationState = {
    status: 'running',
    total: 0, 
    current: 0
  };

  try {
    // 1. Extraer de Tiendanube
    const tnService = new TiendanubeService(tiendanubeToken, tiendanubeStoreId, 'MigradorSaaS', 'test@test.com');
    const customProducts = await tnService.getProducts();
    
    migrationState.total = customProducts.length;

    if (customProducts.length === 0) {
      migrationState.status = 'completed';
      return;
    }

    // 2. Mapear al formato ML
    const mapper = new MercadoLibreMapper();
    const mappedCatalog = mapper.mapCatalog(customProducts);

    // 3. Publicar en ML (con progreso real en base a los lotes)
    const mlService = new MercadoLibreService(mlToken);
    
    const report = await mlService.publishBatch(mappedCatalog.products, (currentProgress) => {
      migrationState.current = currentProgress;
    });

    console.log('\n================ RESUMEN DE MIGRACIÓN ================');
    console.log(`✅ Exitosos: ${report.successful.length}`);
    console.log(`❌ Fallidos: ${report.failed.length}`);
    if (report.failed.length > 0) {
      console.log('Detalle de errores de Mercado Libre:');
      report.failed.forEach(f => console.log(`- ${f.title}: ${f.error}`));
    }
    console.log('======================================================\n');

    migrationState.status = 'completed';
    console.log('Migración finalizada con éxito.');
  } catch (error) {
    console.error('Error durante la migración real:', error);
    migrationState.status = 'error';
  }
});

app.get('/api/progress', (req, res) => {
  res.json(migrationState);
});

export default app;
