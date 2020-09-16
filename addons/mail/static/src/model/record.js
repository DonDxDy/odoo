odoo.define('mail/static/src/model/record.js', function (require) {
'use strict';

const {
    RecordDeletedError,
} = require('mail/static/src/model/errors.js');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/isRelational': isRelationalField,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Delete the record. After this operation, it's as if this record never
     * existed. Note that relation are removed, which may delete more relations
     * if some of them are causal.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Record} record
     */
    'Record/delete'(
        { env },
        record
    ) {
        record.willDelete();
        const data = {};
        for (const field of record.fields) {
            if (isRelationalField(field)) {
                data[field.name] = unlinkAll();
            }
        }
        env.invoke('Record/update', record, data);
    },
    /**
     * Delete all records.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    'Record/deleteAll'(
        { env }
    ) {
        for (const record of env.records.values()) {
            env.invoke('Record/delete', record);
        }
    },
    /**
     * Perform an async function and wait until it is done. If the record
     * is deleted, it raises a RecordDeletedError.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Record} record
     * @param {function} func an async function
     * @throws {RecordDeletedError} in case the current record is not alive
     *   at the end of async function call, whether it's resolved or
     *   rejected.
     * @throws {any} forwards any error in case the current record is still
     *   alive at the end of rejected async function call.
     * @returns {any} result of resolved async function.
     */
    async 'Record/doAsync'(
        { env },
        record,
        func
    ) {
        return new Promise((resolve, reject) => {
            Promise.resolve(func()).then(result => {
                if (env.invoke('Record/exists', record.localId)) {
                    resolve(result);
                } else {
                    reject(new RecordDeletedError(record.localId));
                }
            }).catch(error => {
                if (env.invoke('Record/exists', record.localId)) {
                    reject(error);
                } else {
                    reject(new RecordDeletedError(record.localId));
                }
            });
        });
    },
    /**
     * Process an update on provided record with provided data. Updating
     * a record consists of applying direct updates first (i.e. explicit
     * ones from `data`) and then indirect ones (i.e. compute/related fields
     * and "after updates").
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Record} record
     * @param {Object} data
     * @param {Object} [options]
     */
    'Record/update'(
        { env },
        record,
        data,
        options
    ) {
        this.depth++;
        for (const fieldName of Object.keys(data)) {
            if (data[fieldName] === undefined) {
                continue;
            }
            const newVal = data[fieldName];
            const field = record.field(fieldName);
            env.invoke('RecordField/set', field, newVal, options);
        }
        this.depth--;
        if (this.depth === 0) {
            env.invoke('Record/_flush');
        }
    },
    /**
     * Terminates an update cycle by executing its pending operations: execute
     * computed fields, execute life-cycle hooks, update rev numbers.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    'Record/_flush'({ env }) {
        /**
         * 1. Process fields to compute.
         */
        /**
         * 2. Invoke created hook on newly created records.
         */
        /**
         * 3. Notify observers of their changed observees.
         */
        env.store.state.rev++;
    },
});

return defineFeatureSlice(
    'mail/static/src/model/record.js',
    actions,
);

// class Record {
//     /**
//      * @param {web.env} env
//      * @param {Model} model
//      * @param {Object} [data]
//      */
//     constructor(env, model, data) {
//         this.env = env;
//         this.model = model;
//         this.data = data;
//     }
// }

// return Record;

});
