const vm = require('vm');
const fs = require('fs');
const AWS = require('aws-sdk');

const SQS_URL = "https://sqs.eu-west-1.amazonaws.com/131714839949/js-functions";
exports.SQS_URL = SQS_URL;

const IDLE_TIMEOUT = 10000;

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

    AWS.config.loadFromPath('config/config.json');

    const queue = new AWS.SQS({
        apiVersion: '2012-11-05',
        params: {
            QueueUrl: SQS_URL
        }
    });

    queue.receiveMessage(function(err, data) {
        if (err) {
            console.error("Error while receiving a message: ", err);
            main();
        }

        if (!data.Messages) {
            console.log("No messages to handle.")
            setTimeout(main, IDLE_TIMEOUT);
            return;
        }

        try {
            const json = data.Messages[0].Body;

            console.log('Received: ' + json.substring(0, 200) + '...');
            const obj = JSON.parse(json);

            const vmCode = 'f = ' + obj.code + '; f(' + args(obj.args) + ');';
            const result = JSON.stringify(vm.runInNewContext(vmCode, sandbox));
            console.log('Computed: ' + result);

            queue.deleteMessage({
                ReceiptHandle: data.Messages[0].ReceiptHandle
            }, function(err, data) {
                if (err) console.log("Error while deleting a message: ", err);
                main();
            });
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
