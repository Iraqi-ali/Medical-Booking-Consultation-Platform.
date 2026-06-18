const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const db = new sqlite3.Database('./mediconnect.db', (err) => {
    if (err) console.error('خطأ:', err.message);
    else { console.log('Connected to SQLite.'); initDb(); }
});

function initDb() {
    db.serialize(() => {
        // الجداول الموجودة
        db.run(`CREATE TABLE IF NOT EXISTS clinics (...)`, (err) => { /* نفس الكود السابق */ });
        db.run(`CREATE TABLE IF NOT EXISTS prescriptions (...)`);
        db.run(`CREATE TABLE IF NOT EXISTS appointments (...)`);
        
        // الجدول الجديد: التقييمات
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            rating INTEGER,
            comment TEXT
        )`);
    });
}

// ... باقي API السابق ...

// API جديد: إضافة تقييم
app.post('/api/reviews', (req, res) => {
    const { clinic_id, rating, comment } = req.body;
    db.run("INSERT INTO reviews (clinic_id, rating, comment) VALUES (?, ?, ?)",
        [clinic_id, rating, comment], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

// API جديد: جلب التقييمات لعيادة معينة
app.get('/api/reviews/:clinicId', (req, res) => {
    db.all("SELECT * FROM reviews WHERE clinic_id = ?", [req.params.clinicId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

// API محدث: تحديث حالة الحجز
app.put('/api/appointments/:id/status', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
