`use strict`;
const elastic = require('@elastic/elasticsearch');

exports.register = function(server, opts, next) {
    const client = new elastic.Client(opts.elastic);
    const regexes = opts.regexes.map((regex)=> new RegExp(regex));

    server.ext('onPreResponse', async (request, h) => {
        const eligible = request.auth.credentials && regexes.reduce((acc, regex)=> acc || regex.test(request.path), false);

        if(!eligible){
            return h.continue();
        }
        const now = Date.now();
        const doc = {
            timestamp: now,
            tenant: request.auth.credentials.tenant,
            path: request.path,
            execTime: request.time,
            method: request.method,
            host: request.info.host,
            responsetime: (now - request.info.received)
        };

        try{
            await client.index({
                id: `${doc.tenant}-${doc.timestamp}`,
                index: opts.index,
                type: 'entry',
                body: doc
            });
        }
        catch(err) {
            console.error(`Error logging request: ${err}`)
        }

        return h.continue();
    });
    next();
};

exports.register.attributes = { name: 'es-request-log' }
