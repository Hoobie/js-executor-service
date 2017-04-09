const vm = require('vm');
const fs = require('fs');
const redis = require("redis");

global.tracking = createLibrarySandbox([
    'node_modules/tracking/build/tracking.js',
    'node_modules/tracking/build/data/eye.js',
    'node_modules/tracking/build/data/face.js',
    'node_modules/tracking/build/data/mouth.js'
], {
    window: {},
    navigator: {},
    tracking: {}
}).tracking;

global.Tesseract = require('tesseract.js');

global.redisClient = redis.createClient(6379, "redis");
global.id = 0;
global.callback = function(result) {
    var cache = [];
    var serialized = JSON.stringify(result, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                return;
            }
            cache.push(value);
        }
        return value;
    });
    cache = null;

    console.timeEnd("Run");
    console.log("Computed: " + serialized);
    redisClient.lpush(id, serialized);
};

const main = function() {
    redisClient.on("error", function(err) {
        console.log("Error " + err);
        main();
    });

    redisClient.brpop("requests", 5, function(err, reply) {
        if (!reply) {
            console.log("No messages to handle.")
            main();
            return;
        }

        try {
            const obj = JSON.parse(reply[1]);
            global.id = obj.id;
            console.log('Received: ' + JSON.stringify(obj.code).substring(0, 200) + '...');

            console.time("Compile");
            const script = new vm.Script('f = ' + obj.code + '; f(' + args(obj.args) + ');');
            console.timeEnd("Compile");
            console.time("Run");
            const result = JSON.stringify(script.runInThisContext());
            // const result = JSON.stringify(eval('f = ' + obj.code + '; f(' + args(obj.args) + ');'));
            if (!obj.withCallback) {
                console.timeEnd("Run");
                console.log('Computed: ' + result);
                redisClient.lpush(id, result);
            }

            main();
        } catch (e) {
            console.error("Error while handling a message: ", e);
            main();
        }
    });
}
exports.main = main;
if (require.main === module) {
    main();
}

function createLibrarySandbox(files, sandbox) {
    var source, script, result;
    if (!(files instanceof Array)) {
        files = [files];
    }
    source = files.map(function(file) {
        return fs.readFileSync(file, 'utf8');
    }).join('');
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
