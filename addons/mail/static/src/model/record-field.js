odoo.define('mail/static/src/model/record-field.js', function (require) {
'use strict';

const FieldCommand = require('mail/static/src/model/field-command.js');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/link': link,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Clears the value of this field on the given record. It consists of
     * setting this to its default value. In particular, using `clear` is the
     * only way to write `undefined` on a field, as long as `undefined` is its
     * default value. Relational fields are always unlinked before the default
     * is applied.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/clear'(
        { env },
        field
    ) {
        let hasChanged = false;
        if (field.type === 'relation') {
            if (
                env.invoke('RecordField/unlinkAll', field)
            ) {
                hasChanged = true;
            }
        }
        if (
            env.invoke('RecordField/set', field, field.default)
        ) {
            hasChanged = true;
        }
        return hasChanged;
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     */
    'RecordField/compute'(
        { env },
        field
    ) {
        if (
            !env.invoke('RecordField/exists', field.record.localId)
        ) {
            throw Error(`Cannot execute computes for already deleted record ${
                field.record.localId
            }.`);
        }
        env.invoke('Record/update',
            field.record,
            {
                // AKU TODO
                [field.name]: this._compute(field.record),
            }
        );
    },
    /**
     * Set on this relational field in 'create' mode. Basically data provided
     * during set on this relational field contain data to create new records,
     * which themselves must be linked to record of this field by means of
     * this field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Object|Object[]} data
     * @param {Object} [options]
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/create'(
        { env },
        field,
        data,
        options
    ) {
        const other = env.invoke(`${field.relModelName}/create`, data);
        return env.invoke('RecordField/link', field, other, options);
    },
    /**
     * Set on this relational field in 'insert' mode. Basically data provided
     * during set on this relational field contain data to insert records,
     * which themselves must be linked to record of this field by means of
     * this field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Object|Object[]} data
     * @param {Object} [options]
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/insert'(
        { env },
        field,
        data,
        options
    ) {
        const other = env.invoke(`${field.relModelName}/insert`, data);
        return env.invoke('RecordField/link', field, other, options);
    },
    /**
     * Set on this relational field in 'insert-and-repalce' mode. Basically
     * data provided during set on this relational field contain data to insert
     * records, which themselves must replace value on this field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {any} data
     * @param {Object} [options]
     */
    'RecordField/insertAndReplace'(
        { env },
        field,
        data,
        options
    ) {
        const newValue = env.invoke(`${field.relModelName}/insert`, data);
        return env.invoke('RecordField/replace', field, newValue, options);
    },
    /**
     * Set a 'link' operation on this relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} value
     * @param {Object} [options]
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/link'(
        { env },
        field,
        value,
        options
    ) {
        switch (field.relType) {
            case 'many2many':
            case 'one2many':
                return env.invoke('RecordField/_linkX2Many', field, value, options);
            case 'many2one':
            case 'one2one':
                return env.invoke('RecordField/_linkX2One', field, value, options);
        }
    },
    /**
     * Get the value associated to this field. Relations must convert record
     * local ids to records.
     *
     * @param {Object} _
     * @param {RecordField} field
     * @param {any} [ctx]
     * @returns {any}
     */
    'RecordField/read'(
        _,
        field,
        ctx
    ) {
        // AKU TODO: register observer if ctx is observer-able
        if (field.type === 'attribute') {
            return field.value;
        }
        if (field.type === 'relation') {
            if (['one2one', 'many2one'].includes(field.relType)) {
                return field.value;
            }
            return [...field.value];
        }
        throw new Error(`cannot read record field with unsupported type ${field.type}.`);
    },
    /**
     * Set a 'replace' operation on this relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} value
     * @param {Object} [options]
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/replace'(
        { env },
        field,
        value,
        options
    ) {
        if (['one2one', 'many2one'].includes(field.relType)) {
            // for x2one replace is just link
            return env.invoke('RecordField/_linkX2One', field, value, options);
        }

        // for x2many: smart process to avoid unnecessary unlink/link
        let hasChanged = false;
        let hasToReorder = false;
        const otherRecordsSet = field.value;
        const otherRecordsList = [...otherRecordsSet];
        const recordsToReplaceList = [
            ...env.invoke('RecordField/_convertX2ManyValue', field, value)
        ];
        const recordsToReplaceSet = new Set(recordsToReplaceList);

        // records to link
        const recordsToLink = [];
        for (let i = 0; i < recordsToReplaceList.length; i++) {
            const recordToReplace = recordsToReplaceList[i];
            if (!otherRecordsSet.has(recordToReplace)) {
                recordsToLink.push(recordToReplace);
            }
            if (otherRecordsList[i] !== recordToReplace) {
                hasToReorder = true;
            }
        }
        if (
            env.invoke('RecordField/_linkX2Many', field, recordsToLink, options)
        ) {
            hasChanged = true;
        }

        // records to unlink
        const recordsToUnlink = [];
        for (let i = 0; i < otherRecordsList.length; i++) {
            const otherRecord = otherRecordsList[i];
            if (!recordsToReplaceSet.has(otherRecord)) {
                recordsToUnlink.push(otherRecord);
            }
            if (recordsToReplaceList[i] !== otherRecord) {
                hasToReorder = true;
            }
        }
        if (
            env.invoke('RecordField/_unlinkX2Many', field, recordsToUnlink, options)
        ) {
            hasChanged = true;
        }

        // reorder result
        if (hasToReorder) {
            otherRecordsSet.clear();
            for (const record of recordsToReplaceList) {
                otherRecordsSet.add(record);
            }
            hasChanged = true;
        }
        return hasChanged;
    },
    /**
     * Set a value on this field. The format of the value comes from business
     * code.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {any} newVal
     * @param {Object} [options]
     * @param {boolean} [options.hasToUpdateInverseFields] whether updating the
     *  current field should also update its inverse field. Only applies to
     *  relational fields. Typically set to false only during the process of
     *  updating the inverse field itself, to avoid unnecessary recursion.
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/set'(
        { env },
        field,
        newVal,
        options
    ) {
        /**
         * 0. Manage in case of field command(s).
         */
        if (newVal instanceof FieldCommand) {
            // single command given
            return newVal.execute(env, field, options);
        }
        if (typeof newVal instanceof Array && newVal[0] instanceof FieldCommand) {
            // multi command given
            let hasChanged = false;
            for (const command of newVal) {
                if (command.execute(env, field, options)) {
                    hasChanged = true;
                }
            }
            return hasChanged;
        }
        /**
         * 1. Manage standard cases.
         */
        const currentValue = field.value;
        if (field.type === 'attribute') {
            /**
             * 1.1. Case of attribute.
             */
            if (currentValue === newVal) {
                return false;
            }
            field.value = newVal;
            env.registerUpdatedField(field);
            return true;
        }
        if (field.type === 'relation') {
            throw new Error('Unsupported update on relational field without (list of) command(s)');
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Object} [options]
     */
    'RecordField/unlinkAll'(
        { env },
        field,
        options
    ) {
        return env.invoke('RecordField/unlink', field.value, options);
    },
    /**
     * Set an 'unlink' operation on this relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} value
     * @param {Object} [options]
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/unlink'(
        { env },
        field,
        value,
        options
    ) {
        switch (field.relType) {
            case 'many2many':
            case 'one2many':
                return env.invoke('RecordField/_unlinkX2Many', field, value, options);
            case 'many2one':
            case 'one2one':
                return env.invoke('RecordField/_unlinkX2One', field, options);
        }
    },
    /**
     * Converts given value to expected format for x2many processing, which is
     * an iterable of records.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} newValue
     * @param {Object} [param3={}]
     * @param {boolean} [param3.hasToVerify=true] whether the value has to be
     *  verified @see `RecordField/_verifyRelationalValue`
     * @returns {Record[]}
     */
    'RecordField/_convertX2ManyValue'(
        { env },
        field,
        value,
        { hasToVerify = true } = {}
    ) {
        if (typeof value[Symbol.iterator] === 'function') {
            if (hasToVerify) {
                for (const item of value) {
                    env.invoke('RecordField/_verifyRelationalValue', field, item);
                }
            }
            return value;
        }
        if (hasToVerify) {
            env.invoke('RecordField/_verifyRelationalValue', field, value);
        }
        return [value];
    },
    /**
     * Handling of a `set` 'link' of a x2many relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} value
     * @param {Object} [param3={}]
     * @param {boolean} [param3.hasToUpdateInverseFields=true] whether updating the
     *  current field should also update its inverse field. Typically set to
     *  false only during the process of updating the inverse field itself, to
     *  avoid unnecessary recursion.
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/_linkX2Many'(
        { env },
        field,
        value,
        { hasToUpdateInverseFields = true } = {}
    ) {
        const recordsToLink = env.invoke(
            'RecordField/_convertX2ManyValue',
            field,
            value
        );
        const otherRecords = field.value;

        let hasChanged = false;
        for (const recordToLink of recordsToLink) {
            // other record already linked, avoid linking twice
            if (otherRecords.has(recordToLink)) {
                continue;
            }
            hasChanged = true;
            // link other records to current record
            otherRecords.add(recordToLink);
            env.registerUpdatedField(field);
            // link current record to other records
            if (hasToUpdateInverseFields) {
                env.invoke('Record/update',
                    recordToLink,
                    { [field.inverseFieldName]: link(field.record) },
                    { hasToUpdateInverseFields: false }
                );
            }
        }
        return hasChanged;
    },
    /**
     * Handling of a `set` 'link' of an x2one relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record} recordToLink
     * @param {Object} [param3={}]
     * @param {boolean} [param3.hasToUpdateInverseFields=true] whether updating the
     *  current field should also update its inverse field. Typically set to
     *  false only during the process of updating the inverse field itself, to
     *  avoid unnecessary recursion.
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/_linkX2One'(
        { env },
        field,
        recordToLink,
        { hasToUpdateInverseFields = true } = {}
    ) {
        env.invoke('RecordField/_verifyRelationalValue', field, recordToLink);
        const prevOtherRecord = field.value;
        // other record already linked, avoid linking twice
        if (prevOtherRecord === recordToLink) {
            return false;
        }
        // unlink to properly update previous inverse before linking new value
        env.invoke('RecordField/_unlinkX2One', field, { hasToUpdateInverseFields });
        // link other record to current record
        field.value = recordToLink;
        env.registerUpdatedField(field);
        // link current record to other record
        if (hasToUpdateInverseFields) {
            env.invoke('Record/update',
                recordToLink,
                { [field.inverseFieldName]: link(field.record) },
                { hasToUpdateInverseFields: false }
            );
        }
        return true;
    },
    /**
     * Handling of a `set` 'unlink' of a x2one relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Object} [param2={}]
     * @param {boolean} [param2.hasToUpdateInverseFields=true] whether updating the
     *  current field should also update its inverse field. Typically set to
     *  false only during the process of updating the inverse field itself, to
     *  avoid unnecessary recursion.
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/_unlinkX2One'(
        { env },
        field,
        { hasToUpdateInverseFields = true } = {}
    ) {
        const otherRecord = field.value;
        // other record already unlinked, avoid useless processing
        if (!otherRecord) {
            return false;
        }
        // unlink other record from current record
        field.value = undefined;
        env.registerUpdatedField(field);
        // unlink current record from other record
        if (hasToUpdateInverseFields) {
            if (!env.invoke('Record/exists', otherRecord.localId)) {
                // This case should never happen ideally, but the current
                // way of handling related relational fields make it so that
                // deleted records are not always reflected immediately in
                // these related fields.
                return;
            }
            env.invoke('Record/update',
                otherRecord,
                { [field.inverseFieldName]: unlink(field.record) },
                { hasToUpdateInverseFields: false }
            );
            // apply causality
            if (field.isCausal) {
                env.invoke('Record/delete', otherRecord);
            }
        }
        return true;
    },
    /**
     * Handling of a `set` 'unlink' of a x2many relational field.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record|Record[]} newValue
     * @param {Object} [param3={}]
     * @param {boolean} [param3.hasToUpdateInverseFields=true] whether updating the
     *  current field should also update its inverse field. Typically set to
     *  false only during the process of updating the inverse field itself, to
     *  avoid unnecessary recursion.
     * @returns {boolean} whether the value changed for the current field
     */
    'RecordField/_unlinkX2Many'(
        { env },
        field,
        newValue,
        { hasToUpdateInverseFields = true } = {}
    ) {
        const recordsToUnlink = env.invoke('RecordField/_convertX2ManyValue',
            field,
            newValue,
            { hasToVerify: false }
        );
        const otherRecords = field.value;

        let hasChanged = false;
        for (const recordToUnlink of recordsToUnlink) {
            // unlink other record from current record
            const wasLinked = otherRecords.delete(recordToUnlink);
            if (!wasLinked) {
                continue;
            }
            env.registerUpdatedField(field);
            hasChanged = true;
            // unlink current record from other records
            if (hasToUpdateInverseFields) {
                if (!env.invoke('Record/exists', recordToUnlink.localId)) {
                    // This case should never happen ideally, but the current
                    // way of handling related relational fields make it so that
                    // deleted records are not always reflected immediately in
                    // these related fields.
                    continue;
                }
                env.invoke('Record/update',
                    recordToUnlink,
                    { [field.inverseFieldName]: unlink(field.record) },
                    { hasToUpdateInverseFields: false }
                );
                // apply causality
                if (field.isCausal) {
                    env.invoke('Record/delete', recordToUnlink);
                }
            }
        }
        return hasChanged;
    },
    /**
     * Verifies the given relational value makes sense for the current field.
     * In particular the given value must be a record, it must be non-deleted,
     * and it must originates from relational `to` model (or its subclasses).
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {RecordField} field
     * @param {Record} record
     * @throws {Error} if record does not satisfy related model
     */
    'RecordField/_verifyRelationalValue'(
        { env },
        field,
        record
    ) {
        if (
            !env.invoke('Record/exists', record.localId, { isCheckingInheritance: true })
        ) {
            throw Error(`Record ${record.localId} is not valid for relational field ${field.name}.`);
        }
    },
});

return defineFeatureSlice(
    'mail/static/src/model/record-field.js',
    actions,
);

// class RecordField {

//     //--------------------------------------------------------------------------
//     // Public
//     //--------------------------------------------------------------------------

//     /**
//      * @param {web.env} env
//      * @param {ModelField} modelField
//      * @param {any} value
//      * @param {Record} record
//      */
//     constructor({ localId, modelField, record, value }) {
//         this.modelFieldLocalId = modelField.localId;
//         this.localId = localId;
//         this.recordLocalId = record.localId;
//         this.value = value;

//         this.env.invoke('RecordField/register', this);
//         record.addField(this);
//         if (this.type === 'relation') {
//             if (['one2many', 'many2many'].includes(this.relType)) {
//                 this.value = new Set();
//             }
//         }
//         if (this.compute) {
//             this._compute = this.compute;
//         }
//         if (this.related) {
//             this._compute = this._computeRelated;
//         }
//     }

//     //--------------------------------------------------------------------------
//     // Public
//     //--------------------------------------------------------------------------

//     /**
//      * @static
//      * @param {ModelField} definition
//      * @param {Record} record
//      * @returns {string}
//      */
//     static makeLocalId(definition, record) {
//         return `Field__${record.localId}__${definition.name}`;
//     }

//     /**
//      * @returns {ModelField}
//      */
//     get def() {
//         return this.env.invoke('ModelField/get', this._modelFieldLocalId);
//     }

//     /**
//      * @returns {Record}
//      */
//     get record() {
//         return this.env.invoke('Record/get', this._recordLocalId);
//     }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    // /**
    //  * Compute method when this field is related.
    //  *
    //  * @private
    //  * @param {RecordField} field
    //  * @returns {any}
    //  */
    // 'RecordField/_computeRelated'(field) {
    //     const [relationName, relatedFieldName] = field.related.split('.');
    //     const model = field.record.model;
    //     const relationField = model.fields.get(relationName);
    //     if (['one2many', 'many2many'].includes(relationField.relType)) {
    //         const newVal = [];
    //         for (const otherRecord of field.record[relationName]()) {
    //             const otherField = otherRecord.field(relatedFieldName);
    //             const otherValue = this.env.invoke('RecordField/read', otherField);
    //             if (otherValue) {
    //                 if (otherValue instanceof Array) {
    //                     // avoid nested array if otherField is x2many too
    //                     // TODO IMP task-2261221
    //                     for (const v of otherValue) {
    //                         newVal.push(v);
    //                     }
    //                 } else {
    //                     newVal.push(otherValue);
    //                 }
    //             }
    //         }
    //         if (field.type === 'relation') {
    //             return replace(newVal);
    //         }
    //         return newVal;
    //     }
    //     const otherRecord = field.record[relationName]();
    //     if (otherRecord) {
    //         const otherField = otherRecord.field(relatedFieldName);
    //         const newVal = this.env.invoke('RecordField/read', otherField);
    //         if (field.type === 'relation') {
    //             if (newVal) {
    //                 return replace(newVal);
    //             } else {
    //                 return unlinkAll();
    //             }
    //         }
    //         return newVal;
    //     }
    //     if (field.type === 'relation') {
    //         return [];
    //     }
    // }

});
