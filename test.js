const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();
yf.search('Trade Desk Inc').then(res => console.log(JSON.stringify(res.quotes, null, 2))).catch(console.error);
