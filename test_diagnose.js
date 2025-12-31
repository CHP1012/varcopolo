const https = require('https');
const fs = require('fs');
const path = require('path');

// LOAD API KEY
let apiKey = "";
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY=(.*)/);
        if (match && match[1]) {
            apiKey = match[1].trim();
        }
    }
} catch (e) {
    console.error("Error reading .env.local:", e);
}

if (!apiKey) {
    // Try to find it in other env files if .env.local fails
    console.error("COULD NOT FIND GEMINI_API_KEY in .env.local");
    process.exit(1);
}

console.log("API Key loaded (starts with): " + apiKey.substring(0, 5) + "...");

async function testModel(modelName) {
    console.log(`\n----------------------------------------`);
    console.log(`Testing Model: ${modelName}`);
    console.log(`----------------------------------------`);

    return new Promise((resolve) => {
        const data = JSON.stringify({
            instances: [{ prompt: "A futuristic city" }],
            parameters: { sampleCount: 1 }
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`STATUS: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log("✅ SUCCESS! This model works.");
                } else {
                    console.log(`❌ FAILED. Response Body: ${body.substring(0, 200)}...`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`❌ NETWORK ERROR: ${e.message}`);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    // 1. User recommended name (Likely standard Imagen 3)
    await testModel("image-generation-001");

    // 2. The explicit 3.0 name (Previously 404)
    await testModel("imagen-3.0-generate-001");

    // 3. The fast 4.0 (Previously 429 - Quota)
    await testModel("imagen-4.0-fast-generate-001");
}

run();
