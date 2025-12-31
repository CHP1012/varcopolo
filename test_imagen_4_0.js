const https = require('https');

const API_KEY = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
const MODEL_NAME = "imagen-4.0-fast-generate-001"; // Found in the list!

function generateStateless() {
    const postData = JSON.stringify({
        instances: [
            { prompt: "A cyberpunk city, noir style, neon lights" }
        ],
        parameters: {
            sampleCount: 1
        }
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${MODEL_NAME}:predict?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log(`Requesting ${options.path}...`);

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('BODY:', data.substring(0, 500)); // Print first 500 chars
            try {
                const json = JSON.parse(data);
                if (json.predictions && json.predictions[0] && json.predictions[0].bytesBase64Encoded) {
                    console.log("SUCCESS! Received Base64 Image.");
                } else if (json.error) {
                    console.error("API Error:", json.error);
                }
            } catch (e) {
                console.error("Parse Error:", e);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

generateStateless();
