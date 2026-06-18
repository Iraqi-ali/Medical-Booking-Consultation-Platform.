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

// إعداد قاعدة البيانات
const db = new sqlite3.Database('./mediconnect.db', (err) => {
    if (err) {
        console.error('خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('تم الاتصال بقاعدة البيانات SQLite.');
        initDb();
    }
});

// إنشاء الجداول والبيانات الافتراضية
function initDb() {
    db.serialize(() => {
        // 1. جدول العيادات
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
            if (err) {
                console.error('خطأ في إنشاء جدول العيادات:', err.message);
                return;
            }
            
            console.log('تم التأكد من جدول العيادات.');

            // إدخال البيانات الافتراضية للبصرة (إذا كان الجدول فارغاً)
            db.get("SELECT count(*) as count FROM clinics", [], (err, row) => {
                if (err) {
                    console.error('خطأ في عد البيانات:', err.message);
                    return;
                }
                
                if (row && row.count === 0) {
                    console.log('الجدول فارغ، جاري إضافة البيانات الافتراضية للبصرة...');
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
                    console.log('تم تحميل البيانات بنجاح.');
                } else {
                    console.log('البيانات موجودة بالفعل.');
                }
            });
        });

        // 2. جدول الوصفات الطبية
        db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            date TEXT,
            details TEXT
        )`, (err) => {
            if (err) console.error('خطأ في إنشاء جدول الوصفات:', err.message);
        });

        // 3. جدول الحجوزات
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            patient_name TEXT,
            patient_age TEXT,
            time TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('خطأ في إنشاء جدول الحجوزات:', err.message);
        });

        // 4. جدول التقييمات (ميزة جديدة)
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            rating INTEGER,
            comment TEXT
        )`, (err) => {
            if (err) console.error('خطأ في إنشاء جدول التقييمات:', err.message);
        });
    });
}

// --- API Endpoints ---

// 1. جلب جميع العيادات
app.get('/api/clinics', (req, res) => {
    db.all("SELECT * FROM clinics", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

// 2. إضافة عيادة جديدة
app.post('/api/clinics', (req, res) => {
    const { name, type, lat, lng, owner } = req.body;
    const sql = "INSERT INTO clinics (name, type, lat, lng, owner, status, available) VALUES (?, ?, ?, ?, ?, 'active', 1)";
    db.run(sql, [name, type, lat, lng, owner], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// 3. حذف عيادة
app.delete('/api/clinics/:id', (req, res) => {
    db.run("DELETE FROM clinics WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 4. API للحجوزات - إضافة
app.post('/api/appointments', (req, res) => {
    const { clinic_id, patient_name, patient_age, time } = req.body;
    db.run("INSERT INTO appointments (clinic_id, patient_name, patient_age, time) VALUES (?, ?, ?, ?)",
        [clinic_id, patient_name, patient_age, time], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

// 5. API للحجوزات - جلب حجوزات عيادة معينة
app.get('/api/appointments/:clinicId', (req, res) => {
    db.all("SELECT * FROM appointments WHERE clinic_id = ? ORDER BY time DESC", [req.params.clinicId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

// 6. API لتحديث حالة الحجز (Accept/Reject)
app.put('/api/appointments/:id/status', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 7. API للوصفات الطبية
app.post('/api/prescriptions', (req, res) => {
    const { clinic_id, date, details } = req.body;
    db.run("INSERT INTO prescriptions (clinic_id, date, details) VALUES (?, ?, ?)",
        [clinic_id, date, JSON.stringify(details)], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

// 8. API للتقييمات - إضافة
app.post('/api/reviews', (req, res) => {
    const { clinic_id, rating, comment } = req.body;
    db.run("INSERT INTO reviews (clinic_id, rating, comment) VALUES (?, ?, ?)",
        [clinic_id, rating, comment], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

// 9. API للتقييمات - جلب
app.get('/api/reviews/:clinicId', (req, res) => {
    db.all("SELECT * FROM reviews WHERE clinic_id = ?", [req.params.clinicId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
