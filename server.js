const http = require('http');
const vm = require('vm');

const port = process.env.PORT || 8080;

const server = http.createServer(function(req, res) {
    const sandbox = {
        r: 'placeholder'
    };

    var body = [];
    req.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        var json = JSON.parse(Buffer.concat(body).toString());
        console.log('Received code: ' + json.code);
        console.log('Received arguments: ' + json.args);

        var vmCode = 'f = ' + json.code + '; r = f(' + args(json) + ');';
        const result = vm.runInNewContext(vmCode, sandbox);
        console.log('Computed: ' + result);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/json');
        res.writeHead(200);
        res.end(sandbox.r.toString());
    });
});

server.listen(port);

function args(obj) {
  var arguments = '';
  for (i = 0; i < obj.args.length; i++) {
    console.log(obj.args[i]);
    arguments += obj.args[i] + ', ';
  }
  return arguments.substring(0, arguments.length - 2);
}
