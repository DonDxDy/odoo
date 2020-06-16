odoo.define('web.SampleServer', function (require) {
    "use strict";

    const session = require('web.session');

    const MAIN_RECORDSET_SIZE = 12;
    const SUB_RECORDSET_SIZE = 5;
    const SEARCH_READ_LIMIT = 5;

    const SAMPLE_COUNTRIES = ["Belgium", "France", "Portugal", "Singapore", "Australia"];
    const SAMPLE_PEOPLE = [
        "John Miller", "Henry Campbell", "Carrie Helle", "Wendi Baltz", "Thomas Passot",
    ];
    const SAMPLE_TEXTS = [
        "Laoreet id", "Volutpat blandit", "Integer vitae", "Viverra nam", "In massa",
    ];

    const PEOPLE_MODELS = ['res.users', 'res.partner', 'hr.employee', 'mail.followers'];

    class SampleServer {

        /**
         * @param {string} modelName
         * @param {Object} fields
         */
        constructor(modelName, fields) {
            this.mainModel = modelName;
            this.data = {};
            this.data[modelName] = {
                fields,
                records: [],
            };
            // Generate relational fields' co models
            for (const fieldName in fields) {
                const field = fields[fieldName];
                if (['many2one', 'one2many', 'many2many'].includes(field.type)) {
                    this.data[field.relation] = this.data[field.relation] || {
                        fields: {
                            display_name: { type: 'char' },
                            id: { type: 'integer' },
                            color: { type: 'integer' },
                        },
                        records: [],
                    };
                }
            }
            // Sample records generation is only done if necessary, so we delay
            // it to the first "mockRPC" call. These flags allow us to know if
            // the records have been generated or not.
            this.populated = false;
            this.existingGroupsPopulated = false;
            // This only concerns kanban views: read_group calls may return
            // existing (empty) groups, that we will populate with sample data.
            // In addition, there may be a progressbar displayed. In this case,
            // two RPCS are done simultaneously: web_read_group and read_progress_bar.
            // Here, we need to wait for the (mock) read_group to be called before
            // executing the (mock) read_progress_bar, as we need to first update
            // the sample data with the description of the groups returned by the
            // rpc.
            this.readProgressBarProm = new Promise(resolve => {
                this.readGroupDone = resolve;
            });
        }

        //---------------------------------------------------------------------
        // Public
        //---------------------------------------------------------------------

        /**
         * Determines if the SampleServer can mock a call to a given method or
         * route on a model.
         * @param {Object} params
         * @param {string} params.model
         * @param {string} [params.method]
         * @param {string} [params.route]
         * @returns {boolean}
         */
        canMock(params) {
            if (!(params.model in this.data)) {
                return false;
            }
            switch (params.method || params.route) {
                case '/web/dataset/search_read':
                case 'web_read_group':
                case 'read_group':
                case 'read_progress_bar':
                case 'read':
                    return true;
            }
            return false;
        }

        /**
         * Given a model method/server route, and the result of a request to
         * that method/route, determines if the result is empty (there is no
         * real data on the server).
         * @param {Object} params
         * @param {string} params.model
         * @param {string} [params.method]
         * @param {string} [params.route]
         * @param {any} result the result of the real call to the method/route
         * @returns {boolean}
         */
        isEmpty(params, result) {
            switch (params.method || params.route) {
                case '/web/dataset/search_read':
                    return result.length === 0;
                case 'web_read_group': {
                    const groupBy = params.groupBy[0];
                    return result.groups.every(group => group[`${groupBy}_count`] === 0);
                }
                case 'read_group':
                    const length = result.length;
                    if (!result.length || (length === 1 && result[0].__count === 0)) {
                        return true;
                    }
                    return false;
                case 'read_progress_bar':
                    return Object.keys(result).length === 0;
            }
            return false;
        }

        /**
         * This is the main entry point of the SampleServer. Mocks a request to
         * the server with sample data.
         * @param {Object} params
         * @param {any} result the result of the real RPC
         * @returns {Promise<any>} the result obtained with the sample data
         * @throws {Error} If called on a route/method we do not handle
         */
        async mockRpc(params, result) {
            this._populateModels();
            switch (params.method || params.route) {
                case '/web/dataset/search_read':
                    return this._mockSearchReadController(params);
                case 'web_read_group':
                    return this._mockWebReadGroup(params, result);
                case 'read_group':
                    return this._mockReadGroup(params, result);
                case 'read_progress_bar':
                    return this._mockReadProgressBar(params);
                case 'read':
                    return this._mockRead(params);
            }
            throw new Error(`SampleServer: unimplemented route ${params.method || params.route}`);
        }

        //---------------------------------------------------------------------
        // Private
        //---------------------------------------------------------------------

        /**
         * Generates field values based on heuristics according to field types
         * and names.
         *
         * @private
         * @param {string} modelName
         * @param {string} fieldName
         * @param {number} id the record id
         * @returns {any} the field value
         */
        _generateFieldValue(modelName, fieldName, id) {
            const field = this.data[modelName].fields[fieldName];
            switch (field.type) {
                case "boolean":
                    return fieldName === 'active' ? true : Math.random() < 0.5;
                case "char":
                case "text":
                    if (fieldName === "display_name") {
                        let sample;
                        if (PEOPLE_MODELS.includes(modelName)) {
                            sample = SAMPLE_PEOPLE;
                        } else if (modelName === 'res.country') {
                            sample = SAMPLE_COUNTRIES;
                        } else {
                            sample = SAMPLE_TEXTS;
                        }
                        return sample[(id - 1) % sample.length];
                    } else if (fieldName === "name") {
                        return `REF000${id}`;
                    } else if (fieldName.includes("email")) {
                        return `sample${id}@sample.demo`;
                    } else if (fieldName.includes("phone")) {
                        return `+1 555 754 000${id}`;
                    } else if (fieldName.includes("url")) {
                        return `http://sample${id}.com`;
                    } else if (fieldName.includes("description")) {
                        const index = Math.floor(Math.random * SAMPLE_TEXTS.length);
                        return SAMPLE_TEXTS[index];
                    } else {
                        return false;
                    }
                case "date":
                case "datetime": {
                    const delta = Math.floor((Math.random() - Math.random()) * 24 * 7);
                    const date = new moment().add(delta, "hour").format("YYYY-MM-DD HH:mm:ss");
                    return date;
                }
                case "float":
                    return Math.random() * 100;
                case "integer": {
                    const max = fieldName.includes('color') ? 8 : 100;
                    return Math.floor(Math.random() * max);
                }
                case "monetary":
                    return Math.floor(Math.random() * 100000);
                case "many2one":
                    if (field.relation === 'res.currency') {
                        return session.company_currency_id;
                    } else {
                        return this._getRandomSubRecordId();
                    }
                case "one2many":
                case "many2many": {
                    const ids = [this._getRandomSubRecordId(), this._getRandomSubRecordId()];
                    return [...new Set(ids)];
                }
                case "selection": {
                    const index = Math.floor(Math.random() * field.selection.length);
                    return field.selection[index][0];
                }
                default:
                    return false;
            }
        }

        /**
         * Generates a random id in the range of ids generated for sub models.
         * @private
         * @returns {number} id in [1, SUB_RECORDSET_SIZE]
         */
        _getRandomSubRecordId() {
            return Math.floor(Math.random() * SUB_RECORDSET_SIZE) + 1;
        }

        /**
         * Updates the sample data such that the existing groups (in database)
         * also exists in the sample, and such that there are sample records in
         * those groups.
         * @private
         * @param {Object[]} groups empty groups returned by the server
         * @param {Object} params
         * @param {string} params.model
         * @param {string[]} params.groupBy
         */
        _populateExistingGroups(groups, params) {
            if (!this.existingGroupsPopulated) {
                this.groupsInfo = groups;
                const groupBy = params.groupBy[0];
                const values = groups.map(g => g[groupBy]);
                const groupByField = this.data[params.model].fields[groupBy];
                const groupedByM2O = groupByField.type === 'many2one';
                if (groupedByM2O) { // re-populate co model with relevant records
                    this.data[groupByField.relation].records = values.map(v => {
                        return { id: v[0], display_name: v[1] };
                    });
                }
                this.data[params.model].records.forEach(r => {
                    const value = values[r.id % values.length];
                    r[groupBy] = groupedByM2O ? value[0] : value;
                });
                this.existingGroupsPopulated = true;
            }
        }

        /**
         * Generates sample records for the models in this.data. Records will be
         * generated once, and subsequent calls to this function will be skipped.
         * @private
         */
        _populateModels() {
            if (!this.populated) {
                for (const modelName in this.data) {
                    const model = this.data[modelName];
                    const fieldNames = Object.keys(model.fields).filter(f => f !== 'id');
                    const size = modelName === this.mainModel ?
                        MAIN_RECORDSET_SIZE :
                        SUB_RECORDSET_SIZE;
                    for (let id = 1; id <= size; id++) {
                        const record = { id };
                        fieldNames.forEach(fieldName => {
                            record[fieldName] = this._generateFieldValue(modelName, fieldName, id);
                        });
                        model.records.push(record);
                    }
                }
                this.populated = true;
            }
            window.models = this.data; // FIXME: remove me
        }

        /**
         * Mocks calls to the read method.
         * @private
         * @param {Object} params
         * @param {string} params.model
         * @param {Array[]} params.args (args[0] is the list of ids, args[1] is
         *   the list of fields)
         * @returns {Object[]}
         */
        _mockRead(params) {
            const model = this.data[params.model];
            const ids = params.args[0];
            const fieldNames = params.args[1];
            return model.records
                .filter(r => ids.includes(r.id))
                .map(r => {
                    const record = { id: r.id };
                    for (const fieldName of fieldNames) {
                        const field = model.fields[fieldName];
                        if (!field) {
                            record[fieldName] = false; // unknown field
                        } else if (field.type === 'many2one') {
                            const relModel = this.data[field.relation];
                            const relRecord = relModel.records.find(relR => {
                                return r[fieldName] === relR.id;
                            });
                            record[fieldName] = relRecord ?
                                [relRecord.id, relRecord.display_name] :
                                false;
                        } else {
                            record[fieldName] = r[fieldName];
                        }
                    }
                    return record;
                });
        }

        /**
         * Mocks calls to the read_group method.
         * @param {Object} params
         * @param {string} params.model
         * @param {string[]} params.fields
         * @param {string[]} params.groupBy
         * @param {boolean} [params.lazy=true]
         * @returns {Object} Object with keys groups and length
         */
        _mockReadGroup(params) {
            // there is no group: mock the read_group result
            if (!('lazy' in params)) {
                params.lazy = true;
            }
            const model = params.model;
            const fields = this.data[model].fields;
            const aggregatedFields = params.fields.filter(field => {
                const split = field.split(":");
                const fieldName = split[0];
                if (params.groupBy.indexOf(fieldName) > 0) {
                    // grouped fields are not aggregated
                    return false;
                }
                if (fields[fieldName] && (fields[fieldName].type === 'many2one') && split[1] !== 'count_distinct') {
                    return false;
                }
                return true;
            });
            let groupBy = [];
            if (params.groupBy.length) {
                groupBy = params.lazy ? [params.groupBy[0]] : params.groupBy;
            }
            const records = this.data[model].records;

            function aggregateFields(group, records) {
                var type;
                for (var i = 0; i < aggregatedFields.length; i++) {
                    type = fields[aggregatedFields[i]].type;
                    if (type === 'float' || type === 'integer') {
                        group[aggregatedFields[i]] = null;
                        for (var j = 0; j < records.length; j++) {
                            var value = group[aggregatedFields[i]] || 0;
                            group[aggregatedFields[i]] = value + records[j][aggregatedFields[i]];
                        }
                    }
                    if (type === 'many2one') {
                        var ids = _.pluck(records, aggregatedFields[i]);
                        group[aggregatedFields[i]] = _.uniq(ids).length || null;
                    }
                }
            }
            function formatValue(groupByField, val) {
                var fieldName = groupByField.split(':')[0];
                var aggregateFunction = groupByField.split(':')[1] || 'month';
                if (fields[fieldName].type === 'date') {
                    if (!val) {
                        return false;
                    } else if (aggregateFunction === 'day') {
                        return moment(val).format('YYYY-MM-DD');
                    } else if (aggregateFunction === 'week') {
                        return moment(val).format('ww YYYY');
                    } else if (aggregateFunction === 'quarter') {
                        return 'Q' + moment(val).format('Q YYYY');
                    } else if (aggregateFunction === 'year') {
                        return moment(val).format('Y');
                    } else {
                        return moment(val).format('MMMM YYYY');
                    }
                } else {
                    return val instanceof Array ? val[0] : (val || false);
                }
            }
            function groupByFunction(record) {
                var value = '';
                _.each(groupBy, function (groupByField) {
                    value = (value ? value + ',' : value) + groupByField + '#';
                    var fieldName = groupByField.split(':')[0];
                    if (fields[fieldName].type === 'date') {
                        value += formatValue(groupByField, record[fieldName]);
                    } else {
                        value += JSON.stringify(record[groupByField]);
                    }
                });
                return value;
            }

            if (!groupBy.length) {
                var group = { __count: records.length };
                aggregateFields(group, records);
                return [group];
            }

            const groups = _.groupBy(records, groupByFunction);
            const result = _.map(groups, group => {
                const res = {
                    __domain: params.domain || [],
                };
                groupBy.forEach(groupByField => {
                    var fieldName = groupByField.split(':')[0];
                    var val = formatValue(groupByField, group[0][fieldName]);
                    var field = this.data[model].fields[fieldName];
                    if (field.type === 'many2one' && !_.isArray(val)) {
                        var related_record = _.findWhere(this.data[field.relation].records, {
                            id: val
                        });
                        if (related_record) {
                            res[groupByField] = [val, related_record.display_name];
                        } else {
                            res[groupByField] = false;
                        }
                    } else {
                        res[groupByField] = val;
                    }

                    if (field.type === 'date' && val) {
                        var aggregateFunction = groupByField.split(':')[1];
                        var startDate, endDate;
                        if (aggregateFunction === 'day') {
                            startDate = moment(val, 'YYYY-MM-DD');
                            endDate = startDate.clone().add(1, 'days');
                        } else if (aggregateFunction === 'week') {
                            startDate = moment(val, 'ww YYYY');
                            endDate = startDate.clone().add(1, 'weeks');
                        } else if (aggregateFunction === 'year') {
                            startDate = moment(val, 'Y');
                            endDate = startDate.clone().add(1, 'years');
                        } else {
                            startDate = moment(val, 'MMMM YYYY');
                            endDate = startDate.clone().add(1, 'months');
                        }
                        res.__domain = [[fieldName, '>=', startDate.format('YYYY-MM-DD')], [fieldName, '<', endDate.format('YYYY-MM-DD')]].concat(res.__domain);
                    } else {
                        res.__domain = [[fieldName, '=', val]].concat(res.__domain);
                    }

                });

                // compute count key to match dumb server logic...
                var countKey;
                if (params.lazy) {
                    countKey = groupBy[0].split(':')[0] + "_count";
                } else {
                    countKey = "__count";
                }
                res[countKey] = group.length;
                aggregateFields(res, group);

                return res;
            });
            return result;
        }

        /**
         * Mocks calls to the read_progress_bar method.
         * @private
         * @param {Object} params
         * @param {string} params.model
         * @param {Object} params.kwargs
         * @return {Object}
         */
        async _mockReadProgressBar(params) {
            await this.readProgressBarProm;
            const groupBy = params.kwargs.group_by;
            const progress_bar = params.kwargs.progress_bar;
            const groupByField = this.data[params.model].fields[groupBy];
            const data = {};
            this.data[params.model].records.forEach(record => {
                let groupByValue = record[groupBy];
                if (groupByField.type === "many2one") {
                    const relatedRecords = this.data[groupByField.relation].records;
                    const relatedRecord = relatedRecords.find(r => r.id === groupByValue);
                    groupByValue = relatedRecord.display_name;
                }
                if (!(groupByValue in data)) {
                    data[groupByValue] = {};
                    Object.keys(progress_bar.colors).forEach(key => {
                        data[groupByValue][key] = 0;
                    });
                }
                const fieldValue = record[progress_bar.field];
                if (fieldValue in data[groupByValue]) {
                    data[groupByValue][fieldValue]++;
                }
            });
            return data;
        }

        /**
         * Mocks calls to the /web/dataset/search_read route to return sample
         * records.
         * @private
         * @param {Object} params
         * @param {string} params.model
         * @param {string[]} params.fields
         * @returns {{ records: Object[], length: number }}
         */
        _mockSearchReadController(params) {
            const model = this.data[params.model];
            const rawRecords = model.records.slice(0, SEARCH_READ_LIMIT);
            const records = this._mockRead({
                model: params.model,
                args: [rawRecords.map(r => r.id), params.fields],
            });
            return { records, length: records.length };
        }

        /**
         * Mocks calls to the web_read_group method to return groups populated
         * with sample records. Only handles the case where the real call to
         * web_read_group returned groups, but none of these groups contain
         * records. In this case, we keep the real groups, and populate them
         * with sample records.
         * @private
         * @param {Object} params
         * @param {Object} [result] the result of an real call to web_read_group
         * @returns {{ groups: Object[], length: number }}
         */
        _mockWebReadGroup(params, result) {
            let groups = [];
            if (result && result.groups.length) {
                // there are (real) groups: populate them with sample records
                groups = this._tweakExistingGroups(result.groups, params);
            }
            this.readGroupDone();
            return {
                groups,
                length: groups.length,
            };
        }

        /**
         * A real (web_)read_group call has been done, and it returned groups,
         * but they are all empty. This function updates the sample data such
         * that those group values exist and those groups contain sample records.
         * @private
         * @param {Object[]} groups empty groups returned by the server
         * @param {Object} params
         * @param {string} params.model
         * @param {string[]} params.fields
         * @param {string[]} params.groupBy
         * @returns {Object[]} groups with count and aggregate values updated
         */
        _tweakExistingGroups(groups, params) {
            this._populateExistingGroups(groups, params);

            // update count and aggregates for each group
            const groupBy = params.groupBy[0].split(':')[0];
            const groupByField = this.data[params.model].fields[groupBy];
            const groupedByM2O = groupByField.type === 'many2one';
            const records = this.data[params.model].records;
            groups.forEach(g => {
                const groupValue = groupedByM2O ? g[groupBy][0] : g[groupBy];
                const recordsInGroup = records.filter(r => r[groupBy] === groupValue);
                g[`${groupBy}_count`] = recordsInGroup.length;
                for (const field of params.fields) {
                    const fieldType = this.data[params.model].fields[field].type;
                    if (['integer, float', 'monetary'].includes(fieldType)) {
                        g[field] = recordsInGroup.reduce((acc, r) => acc + r[field], 0);
                    }
                }
                g.__data = {
                    records: this._mockRead({
                        model: params.model,
                        args: [recordsInGroup.map(r => r.id), params.fields],
                    }),
                    length: recordsInGroup.length,
                };
            });

            return groups;
        }
    }

    return SampleServer;
});
