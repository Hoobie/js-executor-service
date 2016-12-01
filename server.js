const http = require('http');
const vm = require('vm');
const fs = require('fs');

const port = process.env.PORT || 8080;

const server = http.createServer(function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/json');

    var track = createSandbox(['node_modules/tracking/build/tracking.js',
        'node_modules/tracking/build/data/eye.js',
        'node_modules/tracking/build/data/face.js',
        'node_modules/tracking/build/data/mouth.js'
    ], {
        navigator: {},
        tracking: {},
        window: {}
    }).tracking;
    const sandbox = {
        tracking: track
    };

    var body = [];
    req.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        try {
            const json = Buffer.concat(body).toString();
            console.log('Received: ' + json.substring(0, 200) + '...');
            const obj = JSON.parse(json);

            const vmCode = 'f = ' + obj.code + '; f(' + args(obj.args) + ');';
            const result = JSON.stringify(vm.runInNewContext(vmCode, sandbox));
            console.log('Computed: ' + result);

            res.writeHead(200);
            res.end(result);
        } catch (e) {
            console.error("Error while handling request: ", e);
            res.writeHead(400);
            res.end("ERR");
        }
    });
});

console.log("Running on port: ", port);
server.listen(port);

function createSandbox(files, /*optional*/ sandbox) {
    var source, script, result;
    if (!(files instanceof Array)) {
        files = [files];
    }
    source = files.map(function(file) {
        return fs.readFileSync(file, 'utf8');
    }).join('');
    if (!sandbox) {
        sandbox = {};
    }
    script = new vm.Script(source);
    result = script.runInNewContext(sandbox);
    return sandbox;
};

function args(a) {
    var arguments = '';
    for (i = 0; i < a.length; i++) {
        if (typeof a[i] === 'string') arguments += '\'' + a[i] + '\''
        else arguments += JSON.stringify(a[i]);

        if (i < a.length - 1) arguments += ', ';
    }
    return arguments;
}
