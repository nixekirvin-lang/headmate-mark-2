import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// We'll try to load the config from firebase-applet-config.json if it exists
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Insecure Password Reset Endpoint (As requested: No codes, no emails)
  // WARNING: This is highly insecure and for demonstration purposes only.
  app.post("/api/auth/reset-password-insecure", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required." });
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword,
      });
      res.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: error.message || "Failed to reset password." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // SPA fallback for development - serve index.html for all non-file routes
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      try {
        const indexHtml = path.join(process.cwd(), 'index.html');
        const html = await vite.transformIndexHtml(req.url, fs.readFileSync(indexHtml, 'utf-8'));
        res.type('html').send(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
