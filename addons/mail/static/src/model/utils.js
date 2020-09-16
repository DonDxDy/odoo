odoo.define('mail/static/src/model/utils.js', function (require) {
'use strict';

const FieldCommand = require('mail/static/src/model/field-command.js');

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

/**
 * @private
 * @param {string} modelName
 * @param {Object} [options]
 */
function _relation(modelName, options) {
    return {
        fieldType: 'relation',
        relModelName: modelName,
        ...options
    };
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

/**
 * Define an attribute field.
 *
 * @param {Object} [options]
 * @returns {Object}
 */
function attr(options) {
    return {
        fieldType: 'attribute',
        ...options,
    };
}

/**
 * Returns a 'clear' command to give to the model manager at create/update.
 */
function clear() {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/clear', field, options)
    );
}

/**
 * Returns a 'create' command to give to the model manager at create/update.
 *
 * @param {Object} data
 */
function create(data) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/create', field, data, options)
    );
}

/**
 * Returns an 'insert' command to give to the model manager at create/update.
 *
 * @param {Object} data
 */
function insert(data) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/insert', field, data, options)
    );
}

/**
 * Returns an 'insert-and-replace' command to give to the model manager at create/update.
 *
 * @param {Object} data
 */
function insertAndReplace(data) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/insertAndReplace', field, data, options)
    );
}

/**
 * Returns an 'link' command to give to the model manager at create/update.
 *
 * @param {Object} value
 */
function link(value) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/link', field, value, options)
    );
}

/**
 * Define a many2many field.
 *
 * @param {string} modelName
 * @param {Object} [options]
 * @returns {Object}
 */
function many2many(modelName, options) {
    return _relation(modelName, {
        ...options,
        relType: 'many2many',
    });
}

/**
 * Define a many2one field.
 *
 * @param {string} modelName
 * @param {Object} [options]
 * @returns {Object}
 */
function many2one(modelName, options) {
    return _relation(modelName, {
        ...options,
        relType: 'many2one',
    });
}

/**
 * Define a one2many field.
 *
 * @param {string} modelName
 * @param {Object} [options]
 * @returns {Object}
 */
function one2many(modelName, options) {
    return _relation(modelName, {
        ...options,
        relType: 'one2many',
    });
}

/**
 * Define a one2one field.
 *
 * @param {string} modelName
 * @param {Object} [options]
 * @returns {Object}
 */
function one2one(modelName, options) {
    return _relation(modelName, {
        ...options,
        relType: 'one2one',
    });
}

/**
 * Returns an 'replace' command to give to the model manager at create/update.
 *
 * @param {any} [value]
 */
function replace(value) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/replace', field, value, options)
    );
}

/**
 * Returns an 'unlink' command to give to the model manager at create/update.
 *
 * @param {any} [value]
 */
function unlink(value) {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/unlink', field, value, options)
    );
}

/**
 * Returns an 'unlink-all' command to give to the model manager at create/update.
 */
function unlinkAll() {
    return new FieldCommand(
        (env, field, options) => env.invoke('RecordField/unlinkAll', field, options)
    );
}

return {
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/create': create,
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
};

});
