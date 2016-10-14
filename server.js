const http = require('http');
const vm = require('vm');

const server = http.createServer(function(req, res) {
    const sandbox = {
        r: 'placeholder'
    };

    var body = [];
    req.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();
        console.log('Received code: ' + body);

        const result = vm.runInNewContext('f = ' + body + '; r = f();', sandbox);
        console.log('Computed: ' + result);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end(sandbox.r);
    });
});

server.listen(8080);
