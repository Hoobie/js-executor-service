const vm = require('vm');
const AWS = require('aws-sdk');

const main = function(callback) {

    const requestsQueue = new AWS.SQS({
        apiVersion: process.env.SQS_API_VERSION,
        params: {
            QueueUrl: process.env.REQUESTS_SQS_QUEUE_URL
        }
    });

    requestsQueue.receiveMessage(function(err, data) {
        if (err) {
            console.error("Error while receiving a message: ", err);
            callback(err);
            return;
        }

        if (!data.Messages) {
            console.log("No messages to handle.")
            callback(null);
            return;
        }

        try {
            const json = data.Messages[0].Body;
            const requestHandle = data.Messages[0].ReceiptHandle;
            const requestId = data.Messages[0].MessageId;

            console.log('Received: ' + json.substring(0, 200) + '...');
            const obj = JSON.parse(json);

            const vmCode = 'f = ' + obj.code + '; f(' + args(obj.args) + ');';
            const result = JSON.stringify(vm.runInNewContext(vmCode, sandbox));
            console.log('Computed: ' + result);

            var responsesQueue = new AWS.SQS({
                apiVersion: process.env.SQS_API_VERSION,
                params: {
                    QueueUrl: process.env.RESPONSES_SQS_QUEUE_URL
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
                    console.log("Error while sending a response: ", err);
                    callback(err);
                    return;
                }

                requestsQueue.deleteMessage({
                    ReceiptHandle: requestHandle
                }, function(err, data) {
                    if (err) console.log("Error while deleting a message: ", err);
                    callback(null, "Success");
                });
            });
        } catch (e) {
            console.error("Error while handling a message: ", e);
            callback(e);
        }
    });
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

exports.handler = function(event, context, callback) {
       main(callback);
};
