const vm = require('vm');
const fs = require('fs');
const redis = require("redis");
const config = require('./config/config.json');

const main = function() {
    const track = createSandbox(['node_modules/tracking/build/tracking.js',
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

    const redisClient = redis.createClient(6379, "redis");
    redisClient.on("error", function(err) {
        console.log("Error " + err);
        main();
    });

    redisClient.brpop("requests", 5, function(err, reply) {
        if (!reply) {
            console.log("No messages to handle.")
            setTimeout(main, config.IDLE_TIMEOUT);
            return;
        }

        try {
            console.log('Received: ' + JSON.stringify(reply).substring(0, 200) + '...');
            const obj = JSON.parse(reply[1]);
            const id = obj.id;

            const vmCode = 'f = ' + obj.code + '; f(' + args(obj.args) + ');';
            const result = JSON.stringify(vm.runInNewContext(vmCode, sandbox));
            console.log('Computed: ' + result);
            redisClient.lpush(id, result);

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
