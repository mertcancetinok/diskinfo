require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "super-secret-key"; // API anahtarı

app.use(cors()); // CORS desteği
app.use(express.json()); // JSON parselleme

// API Key doğrulama middleware
const authenticate = (req, res, next) => {
    const userApiKey = req.header("x-api-key");
    if (!userApiKey || userApiKey !== API_KEY) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
    }
    next();
};

// Disk kullanımını döndüren API
app.get("/disk-usage", authenticate, (req, res) => {
    const isMac = os.platform() === "darwin"; // Mac mi, Linux mu?
    const command = isMac
        ? "df -k | awk '{print $2,$3,$4}'"  // Mac için (Kilobyte cinsinden)
        : "df -k --output=size,used,avail"; // Linux için

    exec(command, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: "Disk kullanım bilgisi alınamadı" });
        }

        const lines = stdout.trim().split("\n").slice(1); // Başlık satırını çıkar
        let totalSize = 0, totalUsed = 0, totalAvailable = 0;

        lines.forEach(line => {
            const cols = line.trim().split(/\s+/);
            if (cols.length >= 3) {
                totalSize += parseInt(cols[0], 10) || 0;  // Toplam boyut (KB)
                totalUsed += parseInt(cols[1], 10) || 0;  // Kullanılan alan (KB)
                totalAvailable += parseInt(cols[2], 10) || 0; // Boş alan (KB)
            }
        });

        // Kullanım yüzdesini hesapla
        const usagePercent = totalSize ? ((totalUsed / totalSize) * 100).toFixed(2) : "0";

        res.json({
            success: true,
            total: {
                size: `${(totalSize / 1024 / 1024).toFixed(2)} GB`,
                used: `${(totalUsed / 1024 / 1024).toFixed(2)} GB`,
                available: `${(totalAvailable / 1024 / 1024).toFixed(2)} GB`,
                usage: `${usagePercent}%`
            }
        });
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`✅ Disk API çalışıyor: http://localhost:${PORT}`);
});
