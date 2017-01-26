const vm = require('vm');
const fs = require('fs');
const AWS = require('aws-sdk');
const config = require('./config/config.json');

const log4js = require('log4js');
log4js.configure({
    "appenders": [{
            "category": "logstash-logger",
            "type": "log4js-logstash",
            "host": "logstash",
            "port": 5959,
            "fields": {
                "source": "js-executor-service",
                "environment": "development"
            }
        },
        {
            "category": "logstash-logger",
            "type": "console"
        }
    ],
    "levels": {
        "logstash-logger": "INFO"
    }
});

const logger = log4js.getLogger('logstash-logger');

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

    AWS.config.loadFromPath('config/aws_config.json');

    const requestsQueue = new AWS.SQS({
        apiVersion: config.SQS_API_VERSION,
        params: {
            QueueUrl: config.REQUESTS_SQS_QUEUE_URL
        }
    });

    requestsQueue.receiveMessage(function(err, data) {
        if (err) {
            logger.error("Error while receiving a message: ", err);
            main();
        }

        if (!data.Messages) {
            logger.info("No messages to handle.")
            setTimeout(main, config.IDLE_TIMEOUT);
            return;
        }

        try {
            const json = data.Messages[0].Body;
            const requestHandle = data.Messages[0].ReceiptHandle;
            const requestId = data.Messages[0].MessageId;

            logger.info('Received: ' + json.substring(0, 200) + '...');
            const obj = JSON.parse(json);

            const vmCode = 'f = ' + obj.code + '; f(' + args(obj.args) + ');';
            const result = JSON.stringify(vm.runInNewContext(vmCode, sandbox));
            logger.info('Computed: ' + result);

            var responsesQueue = new AWS.SQS({
                apiVersion: config.SQS_API_VERSION,
                params: {
                    QueueUrl: config.RESPONSES_SQS_QUEUE_URL
                }
            });
            responsesQueue.sendMessage({
                MessageAttributes: {
                    "requestId": {
                        DataType: "String",
                        StringValue: requestId
                    }
                },
                MessageBody: result
            }, function(err, data) {
                if (err) {
                    logger.info("Error while sending a response: ", err);
                    main();
                }

                requestsQueue.deleteMessage({
                    ReceiptHandle: requestHandle
                }, function(err, data) {
                    if (err) logger.error("Error while deleting a message: ", err);
                    main();
                });
            });
        } catch (e) {
            logger.error("Error while handling a message: ", e);
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
