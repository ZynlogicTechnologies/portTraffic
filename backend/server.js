const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 7777;
const CSV_FILE = path.join(__dirname, 'monitor_log.csv');

// Parse date range
function getStartDate(range) {
    const now = new Date();
    const days = { '3d': 3, '7d': 7, '30d': 30 }[range] || 3;
    now.setDate(now.getDate() - days);
    return now;
}

// Read and filter CSV data
function readFilteredCSV(range, callback) {
    const startDate = getStartDate(range);
    const results = [];

    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (data) => {
            const timestamp = new Date(data.timestamp);
            if (timestamp >= startDate) {
                results.push(data);
            }
        })
        .on('end', () => {
            callback(results);
        })
        .on('error', (err) => {
            callback(null, err);
        });
}

// GET /logs?range=3d
app.get('/logs', (req, res) => {
    const range = req.query.range || '3d';

    readFilteredCSV(range, (data, err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read CSV' });
        }
        res.json(data);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});