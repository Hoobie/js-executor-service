const server = require('../server');
const AWS = require('aws-sdk');
const assert = require('assert');
require('mocha-sinon');

describe('server', function() {
    this.timeout(6000);

    beforeEach(function() {
        this.sinon.stub(console, 'log');
    });

    it('should handle message', function(done) {
        // given
        AWS.config.loadFromPath('config/config.json');
        var queue = new AWS.SQS({
            apiVersion: '2012-11-05',
            params: {
                QueueUrl: server.SQS_URL
            }
        });

        var fun = {
            code: test.toString(),
            args: [1]
        }
        queue.sendMessage({
            MessageBody: JSON.stringify(fun)
        }, function(err, data) {
            if (err) done(err);
        });

        // when
        server.main();
        setTimeout(function() {
            // then
            assert.ok(console.log.calledTwice);
            done();
        }, 5000);
    });
});

function test(arg) {
    return arg + 1;
}
