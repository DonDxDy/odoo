// /**
//      * Returns a string representing an many2one.  If the value is false, then we
//      * return an empty string.  Note that it accepts two types of input parameters:
//      * an array, in that case we assume that the many2one value is of the form
//      * [id, nameget], and we return the nameget, or it can be an object, and in that
//      * case, we assume that it is a record datapoint from a BasicModel.
//      *
//      * @param {Array|Object|false} value
//      * @param {Object} [field]
//      *        a description of the field (note: this parameter is ignored)
//      * @param {Object} [options] additional options
//      * @param {boolean} [options.escape=false] if true, escapes the formatted value
//      * @returns {string}
//      */
//     export function formatMany2one(value: any, field:any, options: any) {
//         if (!value) {
//             value = '';
//         } else if (value.isArray()) {
//             // value is a pair [id, nameget]
//             value = value[1];
//         } else {
//             // value is a datapoint, so we read its display_name field, which
//             // may in turn be a datapoint (if the name field is a many2one)
//             while (value.data) {
//                 value = value.data.display_name || '';
//             }
//         }
//         if (options && options.escape) {
//             value = escape(value);
//         }
//         return value;
//     }

//     /**
//  * Returns a string representing a datetime.  If the value is false, then we
//  * return an empty string.  Note that this is dependant on the localization
//  * settings
//  *
//  * @params {Moment|false}
//  * @param {Object} [field]
//  *        a description of the field (note: this parameter is ignored)
//  * @param {Object} [options] additional options
//  * @param {boolean} [options.timezone=true] use the user timezone when formating the
//  *        date
//  * @returns {string}
//  */
// export function formatDateTime(value: any, field:any , options: any) {
//     if (value === false) {
//         return "";
//     }
//     if (!options || !('timezone' in options) || options.timezone) {
//         value = value.clone().add( -new Date(value).getTimezoneOffset(), 'minutes');
//     }
//     return value.format(time.getLangDatetimeFormat());
// }
