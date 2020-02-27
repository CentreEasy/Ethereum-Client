var cache = require("./RedisCache");

let projects = [];

exports.connect = function(config) {
    cache.connect(config);
};

exports.addProject = function(config) {
    projects.push({
        addresses: config.addresses,
        name: config.name,
        invalidations: config.invalidations
    });
};

exports.get = async function(contract, functionName, params) {
    if (!cache.isConnected()) return null;
    let group = exports.getGroup(contract, functionName, params);
    let key = exports.getKey(functionName, params);
    if (cache.hexists(group, key, false)) {
        let value = await cache.hmget(group, key);
        let val = JSON.parse(value);
        return val;
    } else {
        return null;
    }
};

exports.exists = function(contract, functionName, params) {
    if (!cache.isConnected()) return false;
    let group = exports.getGroup(contract, functionName, params);
    let key = exports.getKey(functionName, params);
    return cache.hexists(group, key);
};

exports.set = function(contract, functionName, params, value) {
    if (!cache.isConnected()) return;
    let group = exports.getGroup(contract, functionName, params);
    let key = exports.getKey(functionName, params);
    cache.hset(group, key, JSON.stringify(value));
};

exports.getKey = function(functionName, params) {
    let key = functionName;
    for (let val of params) key += "," + val;
    return key;
};

exports.getProject = function(contract) {
    for (let project of projects) {
        if (project.addresses.indexOf(contract) > -1) {
            return project;
        }
    }
    return null;
};

exports.getGroup = function(contract, functionName, params) {
    let group = "*";
    let project = exports.getProject(contract);
    if (project) {
        if (project.invalidations) {
            for (let invalidation of project.invalidations) {
                let group_params = "";
                if (invalidation.function && invalidation.function.name == functionName) {
                    group = functionName;
                    if (invalidation.function.params && invalidation.function.params.length == params.length) {
                        for (let i in invalidation.function.params) {
                            if (invalidation.function.params[i] == "key") {
                                group_params += ":" + params[i];
                            } else {
                                group_params += ":*";
                            }
                        }
                        group += group_params;
                    }
                }
            }
        }
        return project.name + "[" + group + "]";
    } else {
        console.error("Project for contract not found. Contract: " + contract);
        return contract + "[" + group + "]";
    }
};

exports.invalidate = function(contract, functionName, params) {
    if (!cache.isConnected()) return;
    let project = exports.getProject(contract);
    if (project && project.invalidations) {
        for (let invalidation of project.invalidations) {
            if (invalidation.function) {
                let depends = invalidation.depends;
                let group = invalidation.function.name;
                for (let function_item of depends) {
                    if (function_item.name == functionName) {
                        let group_params = "";
                        let param_key = "";
                        if (function_item.params) {
                            for (let param_index in function_item.params) {
                                if (function_item.params[param_index] == "key") {
                                    param_key = params[param_index];
                                }
                            }
                            if (function_item.params.length == params.length) {
                                for (let i in invalidation.function.params) {
                                    if (invalidation.function.params[i] == "key") {
                                        group_params += ":" + param_key;
                                    } else {
                                        group_params += ":*";
                                    }
                                }
                                cache.delete(project.name + "[" + group + group_params + "]");
                            }
                        } else {
                            cache.delete(project.name + "[" + group + group_params + "]");
                        }
                    }
                }
            }
        }
    }

    let group_all = exports.getGroup(contract, functionName, params);
    cache.delete(group_all);
};

exports.getCache = function() {
    return cache;
};

exports.clear = function() {
    cache.clearAll();
};

exports.test = async function() {
    let config = {
        host: "127.0.0.1",
        port: 6379,
        debug: false
    };
    exports.connect(config);

    let project = {
        name: "project1",
        addresses: ["0x0001"],
        invalidations: [
            {
                function:{name:"balance",params:["key"]},
                depends:[{name:"mint",params:["key","*","*"]}, {name:"send",params:["key","*","*"]}, {name:"send",params:["*","key","*"]}]
            }
        ]
    };
    exports.addProject(project);

    let res;

    exports.set("0x0001", "balance", ["user1"], 10);
    exports.invalidate("0x0001", "balance", ["user2"]);
    exports.invalidate("0x0001", "balanceAll", []);
    res = await exports.exists("0x0001", "balance", ["user1"]); console.log((res==true?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balance", ["user2"]); console.log((res==false?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balanceAll", []); console.log((res==false?"OK":"KO")+": "+res);

    exports.set("0x0001", "balance", ["user1"], 2);
    exports.set("0x0001", "balance", ["user2"], 0);
    exports.set("0x0001", "balanceAll", [], 2);
    res = await exports.exists("0x0001", "balance", ["user1"]); console.log((res==true?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balance", ["user2"]); console.log((res==true?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balanceAll", []); console.log((res==true?"OK":"KO")+": "+res);

    exports.set("0x0001", "balance", ["user1"], 1);
    exports.set("0x0001", "balance", ["user2"], 1);
    exports.invalidate("0x0001", "send", ["user1","user2",1]);
    res = await exports.exists("0x0001", "balance", ["user1"]); console.log((res==false?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balance", ["user2"]); console.log((res==false?"OK":"KO")+": "+res);
    res = await exports.exists("0x0001", "balanceAll", []); console.log((res==false?"OK":"KO")+": "+res);
};
//exports.test();