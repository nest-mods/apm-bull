/* eslint-disable @typescript-eslint/no-var-requires */
const apm = require('elastic-apm-node/start');
const shimmer = require('elastic-apm-node/lib/instrumentation/shimmer');
const Queue = require('bull/lib/queue');

shimmer.wrap(Queue.prototype, 'process', function (original) {
    return function process() {
        const args = Array.from(arguments);

        for (let i = 0; i < args.length; i++) {
            const _handler = args[i];

            // only handle function handler
            if (typeof _handler === 'function') {
                args[i] = async function (job) {
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
                break;
            }
        }

        return original.apply(this, args);
    };
});
