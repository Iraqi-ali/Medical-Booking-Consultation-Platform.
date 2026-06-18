const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// هنا ستربط API بقاعدة البيانات (PostgreSQL) لاحقاً
// app.get('/api/clinics', (req, res) => { ... });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
