const http = require('http');

http.get('http://localhost:5000/api/labels', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const labels = JSON.parse(data);
      if (!Array.isArray(labels) || labels.length === 0) {
        console.log("No labels found or error:", data);
        return;
      }
      const label = labels[0];
      console.log("Testing patch on label:", label.name, label.id);

      const postData = JSON.stringify({
        color: { textColor: '#ffffff', backgroundColor: '#3d85c6' }
      });

      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/labels/' + label.id,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          console.log("Response:", res2.statusCode, data2);
        });
      });
      req.write(postData);
      req.end();

    } catch (e) {
      console.error(e);
    }
  });
});
