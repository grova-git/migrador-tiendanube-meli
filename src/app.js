"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_controller_1 = require("./controllers/auth.controller");
const mercadolibre_mapper_1 = require("./services/mercadolibre.mapper");
const mercadolibre_service_1 = require("./services/mercadolibre.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
const authController = new auth_controller_1.AuthController();
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
        const service = new TiendanubeService(access_token, store_id, 'Catalog Migration SaaS', 'test@example.com');
        const products = await service.getProducts();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/preview', (req, res) => {
    try {
        const products = req.body.products || [];
        const mapper = new mercadolibre_mapper_1.MercadoLibreMapper();
        const result = mapper.mapCatalog(products);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/publish', async (req, res) => {
    try {
        const mlToken = req.headers['x-ml-token'];
        if (!mlToken) {
            return res.status(401).json({ error: 'Missing x-ml-token header' });
        }
        const products = req.body.products || [];
        const service = new mercadolibre_service_1.MercadoLibreService(mlToken);
        const report = await service.publishBatch(products);
        res.json(report);
    }
    catch (error) {
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
exports.default = app;
//# sourceMappingURL=app.js.map