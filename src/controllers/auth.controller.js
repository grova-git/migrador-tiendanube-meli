"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
class AuthController {
    async handleCallback(req, res) {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Missing code parameter' });
        }
        try {
            const response = await axios_1.default.post('https://www.tiendanube.com/apps/authorize/token', {
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
        }
        catch (error) {
            console.error('Error during Tiendanube OAuth:', error.response?.data || error.message);
            res.status(500).json({ error: 'OAuth authorization failed' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map