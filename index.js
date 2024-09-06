const express = require('express');
const client = require('prom-client');
const fs = require('fs');
const axios = require('axios');

const app = express();


const config = fs.readFileSync('prometheus.yml', 'utf8');

// Prometheus API
axios.post('http://localhost:9090/-/reload', {
  yaml: config
})
  .then(response => {
    console.log('Cấu hình Prometheus đã được cập nhật thành công.');
  })
  .catch(error => {
    console.error('Lỗi khi cập nhật cấu hình Prometheus:', error);
  });


// Create counter
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
});

// Create metric
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 1.5, 2],
});

// Middleware collect dât
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({ method: req.method, route: req.path, code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, code: res.statusCode }, duration);
  });
  next();
});

// Sample route for metric
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
