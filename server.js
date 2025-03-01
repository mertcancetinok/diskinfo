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
    const isMac = os.platform() === "darwin";
    const command = isMac
        ? "df -k | awk '{print $1,$2,$3,$4}'"  // Added $1 for device name
        : "df -k --output=source,size,used,avail";

    exec(command, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: "Disk kullanım bilgisi alınamadı" });
        }

        const lines = stdout.trim().split("\n").slice(1);
        let largestDisk = { size: 0, used: 0, available: 0, device: '' };

        lines.forEach(line => {
            const cols = line.trim().split(/\s+/);
            if (cols.length >= 4) {
                const size = parseInt(cols[1], 10) || 0;
                if (size > largestDisk.size) {
                    largestDisk = {
                        device: cols[0],
                        size: size,
                        used: parseInt(cols[2], 10) || 0,
                        available: parseInt(cols[3], 10) || 0
                    };
                }
            }
        });

        const usagePercent = largestDisk.size ? 
            ((largestDisk.used / largestDisk.size) * 100).toFixed(2) : "0";

        res.json({
            success: true,
            disk: {
                device: largestDisk.device,
                size: `${(largestDisk.size / 1024 / 1024).toFixed(2)} GB`,
                used: `${(largestDisk.used / 1024 / 1024).toFixed(2)} GB`,
                available: `${(largestDisk.available / 1024 / 1024).toFixed(2)} GB`,
                usage: `${usagePercent}%`
            }
        });
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`✅ Disk API çalışıyor: http://localhost:${PORT}`);
});
