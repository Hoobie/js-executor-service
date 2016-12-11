const server = require('../server');
const config = require('../config/config.json');
const AWS = require('aws-sdk');
const assert = require('assert');

describe('server', function() {
    this.timeout(20000);

    it('should handle message', function(done) {
        // given
        AWS.config.loadFromPath('config/aws_config.json');
        var requestsQueue = new AWS.SQS({
            apiVersion: config.SQS_API_VERSION,
            params: {
                QueueUrl: config.REQUESTS_SQS_QUEUE_URL
            }
        });

        var fun = {
            code: test.toString(),
            args: [1]
        }
        var msgId;
        requestsQueue.sendMessage({
            MessageBody: JSON.stringify(fun)
        }, function(err, data) {
            if (err) done(err);
            msgId = data.MessageId;
        });

        // when
        server.main();
        setTimeout(function() {
            // then
            var responsesQueue = new AWS.SQS({
                apiVersion: config.SQS_API_VERSION,
                params: {
                    QueueUrl: config.RESPONSES_SQS_QUEUE_URL
                }
            });
            responsesQueue.receiveMessage({
                MessageAttributeNames: [
                    "All"
                ]
            }, function(err, data) {
                var msg = data.Messages[0];
                if (msg.MessageAttributes.requestId.StringValue == msgId) {
                    assert.equal(msg.Body, 2);

                    responsesQueue.deleteMessage({
                        ReceiptHandle: msg.ReceiptHandle
                    }, function(err, data) {
                        if (err) done(err);
                        done();
                    });
                }
            });
        }, 5000);
    });
});

function test(arg) {
    return arg + 1;
}
