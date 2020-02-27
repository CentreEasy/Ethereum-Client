var ccache = require ("./ContractCache");

exports.writeConsole = function(txt) {
    console.log(txt);
};

exports.writeConsoleCheck = function(txt,val1,val2) {
    var FgRed = "\x1b[31m%s\x1b[0m";
    var FgGreen = "\x1b[32m%s\x1b[0m";
    if (val1 == val2) console.log(FgGreen, txt+val1);
    else console.log(FgRed, txt+val1);
};

exports.test1 = async function(ccache) {
    let project = {
        name: "project1",
        addresses: ["0x0001"],
    };
    ccache.addProject(project);

    exports.writeConsole("");
    exports.writeConsole("Contract "+project.name);
    ccache.invalidate("0x0001", "balance", ["user1"]);
    ccache.invalidate("0x0001", "balance", ["user2"]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0001", "balance", ["user1"]),false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0001", "balance", ["user2"]),false);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0001", "global", []), false);
    exports.writeConsole("Setting values");
    ccache.set("0x0001", "balance", ["user1"], 500);
    ccache.set("0x0001", "balance", ["user2"], 1000);
    ccache.set("0x0001", "global", [], 10);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0001", "balance", ["user1"]), true);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0001", "balance", ["user2"]), true);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0001", "global", []), true);
    exports.writeConsole("Changing user 1 balance");
    ccache.set("0x0001", "balance", ["user1"], 1000);
    ccache.invalidate("0x0001", "balance", ["user1"]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0001", "balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0001", "balance", ["user2"]), false);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0001", "global", []), false);
};

exports.test2 = async function(ccache) {
    project = {
        name: "project2",
        addresses: ["0x0002"],
        invalidations: [
            {
                function:{name:"balance"},
                depends:[{name:"mint"},{name:"send"}]
            },
            {
                function:{name:"global"},
                depends:[{name:"setGlobal"}]
            }
        ]
    };
    ccache.addProject(project);

    exports.writeConsole("");
    exports.writeConsole("Contract "+project.name);
    ccache.invalidate("0x0002", "balance", ["user1"]);
    ccache.invalidate("0x0002", "balance", ["user2"]);
    ccache.invalidate("0x0002", "global", []);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0002", "balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0002", "balance", ["user2"]), false);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0002", "global", []), false);
    exports.writeConsole("Setting values");
    ccache.set("0x0002", "balance", ["user1"], 500);
    ccache.set("0x0002", "balance", ["user2"], 1000);
    ccache.set("0x0002", "global", [], 10);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0002", "balance", ["user1"]), true);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0002", "balance", ["user2"]), true);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0002", "global", []), true);
    exports.writeConsole("Changing user 1 balance (mint)");
    ccache.set("0x0002", "balance", ["user1"], 1000);
    ccache.invalidate("0x0002", "mint", ["user1", 1]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0002", "balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0002", "balance", ["user2"]), false);
    exports.writeConsoleCheck("Global variable in cache? ",await ccache.exists("0x0002", "global", []), true);
};

exports.test3 = async function(ccache) {
    project = {
        name: "project3",
        addresses: ["0x0003","0x30"],
        invalidations: [
            {
                function:{name:"balance",params:["key"]},
                depends:[{name:"mint",params:["key","*"]}, {name:"send",params:["key","*","*"]}, {name:"send",params:["*","key","*"]}]
            }
        ]
    };
    ccache.addProject(project);

    exports.writeConsole("");
    exports.writeConsole("Contract "+project.name);
    ccache.invalidate("0x0003", "balance", ["user1"]);
    ccache.invalidate("0x0003","balance", ["user2"]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0003","balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0003","balance", ["user2"]), false);
    exports.writeConsole("Setting balances");
    ccache.set("0x0003","balance", ["user1"], 10);
    ccache.set("0x0003","balance", ["user2"], 20);
    ccache.set("0x0003","balanceAll", [], 1000);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0003","balance", ["user1"]), true);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0003","balance", ["user2"]), true);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), true);
    exports.writeConsole("User 1 balance from cache: "+await ccache.get("0x0003","balance", ["user1"]));
    exports.writeConsole("User 2 balance from cache: "+await ccache.get("0x0003","balance", ["user2"]));
    exports.writeConsole("Changing user 1 balance");
    ccache.set("0x0003","balance", ["user1"], 100);
    ccache.invalidate("0x0003","mint", ["user1",1]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0003","balance", ["user1"]),false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0003","balance", ["user2"]),true);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []),false);
    exports.writeConsole("Sending money from user 1 to 3");
    ccache.set("0x0003","balance", ["user1"], 99);
    ccache.set("0x0003","balance", ["user3"], 21);
    ccache.invalidate("0x0003", "send", ["user1","user3",1]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0003","balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0003","balance", ["user2"]), true);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), false);
    exports.writeConsole("Sending money from user 1 to 2");
    ccache.set("0x0003","balance", ["user1"], 99);
    ccache.set("0x0003","balance", ["user2"], 21);
    ccache.invalidate("0x0003","send", ["user1","user2",1]);
    exports.writeConsoleCheck("User 1 balance in cache? ",await ccache.exists("0x0003","balance", ["user1"]), false);
    exports.writeConsoleCheck("User 2 balance in cache? ",await ccache.exists("0x0003","balance", ["user2"]), false);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), false);

    ccache.set("0x0003","balanceAll", [], 1000);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), true);
    ccache.invalidate("0x0003","hola", ["user1","user2",1]);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), false);

    ccache.set("0x0003","balanceAll", [], 1000);
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), true);
    ccache.clear();
    exports.writeConsoleCheck("Global balance in cache? ",await ccache.exists("0x0003","balanceAll", []), false);
};

exports.test = async function() {
    let config = {
        host: "127.0.0.1",
        port: 6379
    };
    ccache.connect(config);

    await exports.test1(ccache);
    await exports.test2(ccache);
    await exports.test3(ccache);

};
exports.test();
