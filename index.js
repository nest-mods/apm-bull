/* eslint-disable @typescript-eslint/no-var-requires */
const apm = require('elastic-apm-node/start');
const shimmer = require('elastic-apm-node/lib/instrumentation/shimmer');
const Queue = require('bull/lib/queue');

shimmer.wrap(Queue.prototype, 'setHandler', function (original) {
    return function setHandler(name, handler) {
        if (typeof handler === 'function') {
            const _handler = handler;
            handler = async function (job) {
                const transName = `${job.queue.name}[${job.name}]`;
                const trans = apm.startTransaction(transName, 'queue');
                apm.setCustomContext(job.toJSON());
                try {
                    return await _handler(job);
                } catch (e) {
                    trans.result = e.message;
                    trans.outcome = 'failure';
                    apm.captureError(e);
                    throw e;
                } finally {
                    trans.end();
                }
            };
        }
        return original.call(this, name, handler);
    }
});
