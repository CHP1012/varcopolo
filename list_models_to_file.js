const https = require('https');
const fs = require('fs');

const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            fs.writeFileSync('available_models_raw.json', data);
            console.log("Written to available_models_raw.json");
        } catch (e) {
            console.error("Error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
