/* eslint-disable @typescript-eslint/no-var-requires */
const apm = require('elastic-apm-node/start');
const shimmer = require('elastic-apm-node/lib/instrumentation/shimmer');
const { Worker } = require('bullmq');

shimmer.wrap(Worker.prototype, 'callProcessJob', function (original) {
    return function callProcessJob(job, token) {
        const transName = `${job.queueName}[${job.name}]`;
        const trans = apm.startTransaction(transName, 'queue');
        apm.setCustomContext(job.toJSON());
        try {
            trans.outcome = 'success';
            return original.call(this, job, token);
        } catch (e) {
            trans.result = e.message;
            trans.outcome = 'failure';
            apm.captureError(e);
            throw e;
        } finally {
            trans.end();
        }
    };
});
