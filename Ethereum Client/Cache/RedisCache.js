var redis = require("redis");
var client;
let debug = false;
let connected = false;

exports.connect = function(config) {
    if (config && config.port && config.host) {
        client = redis.createClient(config.port, config.host);
        debug = config.debug;
        connected = true;

        client.on('error', function (err) {
            console.error(err);
            connected = false;
        }).on('ready', function () {
            connected = true;
        });
    }
};

exports.isConnected = function() {
    return connected || (client && client.connected);
};

exports.set = function(key, value) {
    if (!exports.isConnected()) return;
    if (debug) console.log("--- Setting " + key + " = " + value);
    client.set(key, value);
};

exports.hset = function(key, field, value) {
    if (!exports.isConnected()) return;
    if (debug) console.log("--- Setting " + key + "(" + field + ")" + " = " + value);
    client.hset(key, field, value);
};

exports.hmget = function(key, field) {
    if (!exports.isConnected()) return null;
    if (debug) console.log("--- Getting " + key + "(" + field + "):");
    return new Promise((resolve, reject) => {
        client.hmget(key, field, function (err, reply) {
            if (err) {
                if (debug) console.log("--- ERROR");
                reject(err);
            } else {
                if (debug) console.log("--- " + reply[0]);
                resolve(reply[0]);
            }
        });
    });
};

exports.hexists = function(key, field, bdebug = true) {
    if (!exports.isConnected()) return false;
    if (debug && bdebug) console.log("--- Checking if exists " + key + "(" + field + ")");
    return new Promise((resolve, reject) => {
        client.hexists(key, field, function (err, reply) {
            if (reply === 1) {
                if (debug && bdebug) console.log("--- YES");
                resolve(true);
            } else {
                if (debug && bdebug) console.log("--- NO");
                resolve(false);
            }
        });
    });
};

exports.get = function(key) {
    if (!exports.isConnected()) return null;
    if (debug) console.log("--- Getting " + key);
    return new Promise((resolve, reject) => {
        client.get(key, function (err, reply) {
            if (err) {
                if (debug) console.log("--- ERROR");
                reject(err);
            } else {
                if (debug) console.log("--- " + reply);
                resolve(reply);
            }
        });
    });
};

exports.exists = function(key) {
    if (!exports.isConnected()) return false;
    if (debug) console.log("--- Checking " + key);
    return new Promise((resolve, reject) => {
        client.exists(key, function (err, reply) {
            if (reply === 1) {
                if (debug) console.log("--- YES");
                resolve(true);
            } else {
                if (debug) console.log("--- NO");
                resolve(false);
            }
        });
    });
};

exports.delete = function(key) {
    if (!exports.isConnected()) return;
    if (debug) console.log("--- Deleting " + key);
    client.del(key);
};

exports.clearAll = function() {
    if (!exports.isConnected()) return;
    client.flushdb();
};

/*exports.test = async function() {
    exports.set("a", "b");
    console.log(await exports.exists("a"));
    console.log(await exports.get("a"));

    exports.hset("0x1", "a", 15);
    exports.hset("0x1", "b", 20);
    console.log(await exports.hmget("0x1", "a"));
    console.log(await exports.hmget("0x1", "b"));
    exports.delete("0x1");
    console.log(await exports.exists("0x1"));
    console.log(await exports.hmget("0x1", "b"));
};
exports.test();*/