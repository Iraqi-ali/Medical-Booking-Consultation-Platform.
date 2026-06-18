const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const db = new sqlite3.Database('./mediconnect.db', (err) => {
    if (err) console.error('خطأ في قاعدة البيانات:', err.message);
    else {
        console.log('تم الاتصال بقاعدة البيانات SQLite.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // 1. جدول العيادات
        db.run(`CREATE TABLE IF NOT EXISTS clinics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, type TEXT, lat REAL, lng REAL,
            owner TEXT, status TEXT, available INTEGER
        )`, (err) => {
            if (err) console.error(err.message);
            // البيانات الافتراضية
            db.get("SELECT count(*) as count FROM clinics", [], (err, row) => {
                if (err) return;
                if (row && row.count === 0) {
                    const clinics = [
                        { name: "مستشفى البصرة العام", type: "hospital", lat: 30.5112, lng: 47.8192, owner: "وزارة الصحة", status: "active", available: 1 },
                        { name: "عيادة الدكتور العذاري", type: "clinic", lat: 30.5081, lng: 47.7835, owner: "د. محمد", status: "active", available: 1 },
                        { name: "صيدلية الأندلس", type: "pharmacy", lat: 30.5050, lng: 47.7750, owner: "أحمد", status: "active", available: 1 }
                    ];
                    const stmt = db.prepare("INSERT INTO clinics (name, type, lat, lng, owner, status, available) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    clinics.forEach(c => stmt.run(c.name, c.type, c.lat, c.lng, c.owner, c.status, c.available));
                    stmt.finalize();
                }
            });
        });

        // 2. جدول الوصفات
        db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER, date TEXT, details TEXT
        )`);

        // 3. جدول الحجوزات (الميزة المطلوبة)
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            patient_name TEXT,
            patient_age TEXT,
            time TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

// --- API Endpoints ---

app.get('/api/clinics', (req, res) => {
    db.all("SELECT * FROM clinics", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

app.post('/api/clinics', (req, res) => {
    const { name, type, lat, lng, owner } = req.body;
    db.run("INSERT INTO clinics (name, type, lat, lng, owner, status, available) VALUES (?, ?, ?, ?, ?, 'active', 1)",
        [name, type, lat, lng, owner], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/clinics/:id', (req, res) => {
    db.run("DELETE FROM clinics WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API للحجوزات
app.post('/api/appointments', (req, res) => {
    const { clinic_id, patient_name, patient_age, time } = req.body;
    db.run("INSERT INTO appointments (clinic_id, patient_name, patient_age, time) VALUES (?, ?, ?, ?)",
        [clinic_id, patient_name, patient_age, time], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

app.get('/api/appointments/:clinicId', (req, res) => {
    db.all("SELECT * FROM appointments WHERE clinic_id = ? ORDER BY time DESC", [req.params.clinicId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

app.post('/api/prescriptions', (req, res) => {
    const { clinic_id, date, details } = req.body;
    db.run("INSERT INTO prescriptions (clinic_id, date, details) VALUES (?, ?, ?)",
        [clinic_id, date, JSON.stringify(details)], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
