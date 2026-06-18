const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // لتشغيل ملف index.html

// إعداد قاعدة البيانات (SQLite)
const db = new sqlite3.Database('./mediconnect.db', (err) => {
    if (err) {
        console.error('خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('تم الاتصال بقاعدة البيانات SQLite.');
        initDb();
    }
});

// إنشاء الجداول وإدخال البيانات الافتراضية
function initDb() {
    // جدول العيادات
    db.run(`CREATE TABLE IF NOT EXISTS clinics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        lat REAL,
        lng REAL,
        owner TEXT,
        status TEXT,
        available INTEGER
    )`, (err) => {
        if (err) console.error(err.message);
    });

    // جدول الوصفات الطبية
    db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        date TEXT,
        details TEXT,
        FOREIGN KEY(clinic_id) REFERENCES clinics(id)
    )`, (err) => {
        if (err) console.error(err.message);
    });

    // إدخال بيانات البصرة (فقط إذا كان الجدول فارغاً)
    db.get("SELECT count(*) as count FROM clinics", (err, row) => {
        if (row.count === 0) {
            const clinics = [
                { name: "مستشفى البصرة العام", type: "hospital", lat: 30.5112, lng: 47.8192, owner: "وزارة الصحة", status: "active", available: 1 },
                { name: "مستشفى ابن سينا", type: "hospital", lat: 30.5250, lng: 47.7700, owner: "جامعة البصرة", status: "active", available: 1 },
                { name: "عيادة الدكتور العذاري", type: "clinic", lat: 30.5081, lng: 47.7835, owner: "د. محمد", status: "active", available: 1 },
                { name: "صيدلية الأندلس", type: "pharmacy", lat: 30.5050, lng: 47.7750, owner: "أحمد", status: "active", available: 1 },
                { name: "عيادة القلب", type: "clinic", lat: 30.5150, lng: 47.7950, owner: "د. هاشم", status: "active", available: 1 }
            ];
            
            const stmt = db.prepare("INSERT INTO clinics (name, type, lat, lng, owner, status, available) VALUES (?, ?, ?, ?, ?, ?, ?)");
            clinics.forEach(c => {
                stmt.run(c.name, c.type, c.lat, c.lng, c.owner, c.status, c.available);
            });
            stmt.finalize();
            console.log('تم تحميل بيانات العيادات الافتراضية.');
        }
    });
}

// --- API Endpoints ---

// 1. جلب جميع العيادات
app.get('/api/clinics', (req, res) => {
    db.all("SELECT * FROM clinics", [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

// 2. إضافة عيادة جديدة
app.post('/api/clinics', (req, res) => {
    const { name, type, lat, lng, owner } = req.body;
    const sql = "INSERT INTO clinics (name, type, lat, lng, owner, status, available) VALUES (?, ?, ?, ?, ?, 'active', 1)";
    db.run(sql, [name, type, lat, lng, owner], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// 3. حذف عيادة (للإدارة)
app.delete('/api/clinics/:id', (req, res) => {
    db.run("DELETE FROM clinics WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

// 4. حفظ وصفة طبية
app.post('/api/prescriptions', (req, res) => {
    const { clinic_id, date, details } = req.body;
    const sql = "INSERT INTO prescriptions (clinic_id, date, details) VALUES (?, ?, ?)";
    db.run(sql, [clinic_id, date, JSON.stringify(details)], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
