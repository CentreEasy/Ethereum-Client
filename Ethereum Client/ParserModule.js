const ContractModule = require('./ContractModule');

const getEventSignature = (event) => {
    if (event.signature) return event.signature;
    return web3.eth.abi.encodeEventSignature(event);
};

const getAllEventsDefinitions = (abi) => {
    const eventsDefinition = [];
    for (const item of abi) {
        if (item.type === 'event') {
            const signature = getEventSignature(item);
            eventsDefinition[signature] = item;
        }
    }
    return eventsDefinition;
};

const getEventsDefinitionByTopics = (abi, topics) => {
    const eventsDefinition = getAllEventsDefinitions(abi);
    for (const topic of topics) {
        const event = eventsDefinition[topic];
        if (event) {
            return event;
        }
    }
    return null;
};

const prettierLog = (log) => {
    const prettierLog = {};
    for (let key of Object.keys(log)) {
        if (key !== '__length__' && isNaN(key)) {
            prettierLog[key] = log[key];
        }
    }
    return prettierLog;
};

exports.parseLogsToEvents = async (logs) => {
    if (!logs || !logs.length) return [];
    const events = [];

    for (const log of logs) {
        if (log && log.address && log.data) {
            let contractInfo = await ContractModule.getContractAbi(log.address);
            if (contractInfo) {

                const abi = contractInfo.contractAbi;
                const eventDefinition = getEventsDefinitionByTopics(abi, log.topics);

                if (eventDefinition) {
                    const processedLog = web3.eth.abi.decodeLog(eventDefinition.inputs, log.data, log.topics);
                    if (processedLog) {
                        events.push({name: eventDefinition.name, result: prettierLog(processedLog)});
                    }
                }

            }
        }
    }

    return events;
};
