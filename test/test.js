const server = require('../server');
const config = require('../config/config.json');
const redis = require('redis');
const assert = require('assert');

describe('server', function() {
    this.timeout(15000);

    it('should handle message', function(done) {
        // given
        const redisClient = redis.createClient(6379, "localhost");
        redisClient.on("error", function(err) {
            done(err);
        });

        const id = Date.now();
        const fun = {
            id: id,
            code: test.toString(),
            args: [1]
        };

        // when
        redisClient.lpush("requests", JSON.stringify(fun));

        // then
        redisClient.brpop(id, 10, function(err, data) {
            if (err) {
                done(err);
            }

            assert.equal(JSON.parse(data[1]), 2);
            done();
        });
    });
});

function test(arg) {
    return arg + 1;
}
