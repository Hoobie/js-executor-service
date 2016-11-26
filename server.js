const http = require('http');
const vm = require('vm');

const port = process.env.PORT || 8080;

const server = http.createServer(function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/json');
    const sandbox = {
        r: 'placeholder'
    };

    var body = [];
    req.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        try {
            const json = JSON.parse(Buffer.concat(body).toString());
            console.log('Received code: ' + json.code);
            console.log('Received arguments: ' + json.args);

            const vmCode = 'f = ' + json.code + '; r = f(' + args(json) + ');';
            const result = vm.runInNewContext(vmCode, sandbox);
            console.log('Computed: ' + result);

            res.writeHead(200);
            res.end(sandbox.r.toString());
        } catch (e) {
            console.error("Error while handling request: ", e);
            res.writeHead(400);
            res.end("ERR");
        }
    });
});

console.log("Running on port: ", port);
server.listen(port);

function args(obj) {
    var arguments = '';
    for (i = 0; i < obj.args.length; i++) {
        console.log(obj.args[i]);
        arguments += obj.args[i] + ', ';
    }
    return arguments.substring(0, arguments.length - 2);
}
