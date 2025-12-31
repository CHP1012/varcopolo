const https = require('https');

const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => {
                    if (m.name.includes('gemini')) {
                        console.log("- " + m.name);
                        if (m.supportedGenerationMethods) console.log("  Methods: " + m.supportedGenerationMethods.join(', '));
                    }
                });
            } else {
                console.log("No models found or error:", JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error("Parse error:", e);
            console.log("Raw:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
