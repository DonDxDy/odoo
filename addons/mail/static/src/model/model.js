odoo.define('mail/static/src/model/model.js', function (require) {
'use strict';

const Record = require('mail/static/src/model/record.js');
const RecordField = require('mail/static/src/model/record-field.js');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Returns all records of provided model that match provided criteria.
     *
     * @param {Object} _
     * @param {Model} model
     * @param {function} [filterFunc]
     * @returns {Record[]} records matching criteria.
     */
    'Model/all'(
        _,
        model,
        filterFunc
    ) {
        const records = [];
        for (const record of model.records.values()) {
            if (!filterFunc || filterFunc(record)) {
                records.push(record);
            }
        }
        return records;
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Model} model
     * @param {Object|Object[]} [data={}]
     * @returns {Record|Record[]}
     */
    'Model/create'(
        { env },
        model,
        data = {}
    ) {
        const isMulti = typeof data[Symbol.iterator] === 'function';
        const dataList = isMulti ? data : [data];
        const res = dataList.map(data => {
            const record = new Record(env, model, data);
            for (const modelField of model.fields.values()) {
                new RecordField(env, modelField, record);
            }
            env.invoke('Record/update', record, data);
            return record;
        });
        return isMulti ? res : res[0];
    },
    /**
     * Get the record of provided model that has provided
     * criteria, if it exists.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Model} model
     * @param {function} findFunc
     * @returns {Record|undefined} the record of model matching criteria, if
     *   exists.
     */
    'Model/find'(
        { env },
        model,
        findFunc
    ) {
        return env.invoke(`${model.name}/all`).find(findFunc);
    },
    /**
     * Gets the unique record of provided model that matches the given
     * identifying data, if it exists.
     * @see `dataToLocalId` for criteria of identification.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Model} model
     * @param {Object} data
     * @returns {Record|undefined}
     */
    'Model/findFromId'({ env }, model, data) {
        const localId = env.invoke('Model/dataToLocalId', model, data);
        return env.invoke('Model/get', localId);
    },
    /**
     * This method returns the record of provided model that matches provided
     * local id. Useful to convert a local id to a record.
     * Note that even if there's a record in the system having provided local
     * id, if the resulting record is not an instance of this model, this getter
     * assumes the record does not exist.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Model} model
     * @param {string} localId
     * @param {Object} param2
     * @param {boolean} [param2.isCheckingInheritance=false]
     * @returns {Record|undefined} record, if exists
     */
    'Model/get'(
        { env },
        model,
        localId,
        { isCheckingInheritance = false } = {}
    ) {
        if (!localId) {
            return;
        }
        const record = model.records.get(localId);
        if (record) {
            return record;
        }
        if (!isCheckingInheritance) {
            return;
        }
        // support for inherited models (eg. relation targeting `Model`)
        for (const SubModel of Object.values(env.models)) {
            if (!(SubModel.prototype instanceof model)) {
                continue;
            }
            const record = SubModel.records.get(localId);
            if (record) {
                return record;
            }
        }
        return;
    },
    /**
     * This method creates a record or updates one of provided Model, based on
     * provided data. This method assumes that records are uniquely identifiable
     * per "unique find" criteria from data on Model.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Model} model
     * @param {Object|Object[]} data
     *  If data is an iterable, multiple records will be created/updated.
     * @returns {Record|Record[]} created or updated record(s).
     */
    'Model/insert'(
        { env },
        model,
        data
    ) {
        const isMulti = typeof data[Symbol.iterator] === 'function';
        const dataList = isMulti ? data : [data];
        const records = [];
        for (const data of dataList) {
            let record = env.invoke(`${model.name}/findFromId`, data);
            if (!record) {
                record = env.invoke(`${model.name}/create`, model, data);
            } else {
                env.invoke('Record/update', record, data);
            }
            records.push(record);
        }
        return isMulti ? records : records[0];
    },
});

return defineFeatureSlice(
    'mail/static/src/model/model.js',
    actions,
);

// /**
//  * This function generates a class that represent a model. Instances of such
//  * model (or inherited models) represent logical objects used in whole
//  * application. They could represent server record (e.g. Thread, Message) or
//  * UI elements (e.g. MessagingMenu, ChatWindow). These instances are called
//  * "records", while the classes are called "models".
//  */
// function factory() {

//     class Model {

//         /**
//          * This method generates a local id for this record that is
//          * being created at the moment.
//          *
//          * This function helps customizing the local id to ease mapping a local
//          * id to its record for the developer that reads the local id. For
//          * instance, the local id of a thread cache could combine the thread
//          * and stringified domain in its local id, which is much easier to
//          * track relations and records in the system instead of arbitrary
//          * number to differenciate them.
//          *
//          * @static
//          * @param {Object} data
//          * @returns {string}
//          */
//         static dataToLocalId(data) {
//             return _.uniqueId(`${this.modelName}_`);
//         }

//         /**
//          * Function called when the model is generated.
//          *
//          * @static
//          */
//         static generated() {
//             /**
//              * records of this model. Key is local id, and value is the record.
//              */
//             this.records = new Map();
//         }

//         /**
//          * @param {web.env} env
//          * @param {Object} data
//          */
//         constructor(env, data) {
//             this.env = env;
//             this.localId = this.constructor.dataToLocalId(data);

//             this._fields = new Map();

//             env.invoke('Record/register', this);
//         }

//         /**
//          * This function is called after the record has been created, more
//          * precisely at the end of the update cycle (which means all implicit
//          * changes such as computes have been applied too).
//          *
//          * The main use case is to register listeners on the record.
//          *
//          * @abstract
//          */
//         created() {}

//         /**
//          * This function is called when the record is about to be deleted. The
//          * record still has all of its fields values accessible, but for all
//          * intents and purposes the record should already be considered
//          * deleted, which means update shouldn't be called inside this method.
//          *
//          * The main use case is to unregister listeners on the record.
//          *
//          * @abstract
//          */
//         willDelete() {}

//         //----------------------------------------------------------------------
//         // Public
//         //----------------------------------------------------------------------

//         /**
//          * @param {Field} field
//          */
//         addField(field) {
//             this._fields.set(field.name, field.localId);
//         }

//         //----------------------------------------------------------------------
//         // Private
//         //----------------------------------------------------------------------

//         /**
//          * @returns {Set<Field>}
//          */
//         get fields() {
//             return this.fields.values();
//         }

//     }
// }

// registerModel('Model', factory);

});
