const WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
const apiSecret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;

const url = "wss://stream.data.alpaca.markets/v2/iex";
const ws = new WebSocket(url);

ws.on('open', () => {
    console.log("Connected to Alpaca");
    ws.send(JSON.stringify({
        action: "auth",
        key: apiKey,
        secret: apiSecret
    }));
});

ws.on('message', (data) => {
    console.log("Message:", data.toString());
    const msg = JSON.parse(data.toString());
    if (msg[0].msg === "authenticated") {
        console.log("Authenticated!");
        ws.send(JSON.stringify({
            action: "subscribe",
            trades: ["AMD"]
        }));
    }
});

ws.on('close', (code, reason) => {
    console.log("Closed:", code, reason.toString());
    process.exit(0);
});

ws.on('error', (err) => {
    console.error("Error:", err);
});

setTimeout(() => {
    console.log("Timeout");
    ws.close();
}, 10000);
