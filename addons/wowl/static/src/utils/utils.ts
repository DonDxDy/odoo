/**
 * Returns a string formatted using given values.
 * If the value is an object, its keys will replace `%(key)s` expressions.
 * If the values are a set of strings, they will replace `%s` expressions.
 * If no value is given, the string will not be formatted.
 */
export function sprintf(s: string, ...values: string[] | [{ [key: string]: string }]): string {
  if (values.length === 1 && typeof values[0] === "object") {
    const valuesDict = values[0] as { [key: string]: string };
    s = s.replace(/\%\(?([^\)]+)\)s/g, (match, value) => valuesDict[value]);
  } else if (values.length > 0) {
    s = s.replace(/\%s/g, () => values.shift() as string);
  }
  return s;
}

export function isBrowserChromium(): boolean {
  // true for the browser base on Chromium (Google Chrome, Opera, Edge)
  return navigator.userAgent.includes("Chrome");
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * Inspired by https://davidwalsh.name/javascript-debounce-function
 */
export function debounce(func: Function, wait: number, immediate?: boolean): Function {
  let timeout: number;
  return function (this: any) {
    const context = this;
    const args = arguments;
    function later() {
      if (!immediate) {
        func.apply(context, args);
      }
    }
    const callNow = immediate && !timeout;
    odoo.browser.clearTimeout(timeout);
    timeout = odoo.browser.setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 * Helper function returning an extraction handler to use on array elements to
 * return a certain attribute or mutated form of the element.
 */
function _getExtractorFrom(criterion: string | ((element: any) => any)): (element: any) => any {
  if (criterion) {
    switch (typeof criterion) {
      case "string":
        return (element) => element[criterion];
      case "function":
        return criterion;
      default:
        throw new Error(
          `Expected criterion of type 'string' or 'function' and got '${typeof criterion}'`
        );
    }
  } else {
    return (element) => element;
  }
}

/**
 * Return a shallow copy of a given array sorted by a given criterion or a default one.
 * The given criterion can either be:
 * - a string: a property name on the array elements returning the sortable primitive
 * - a function: a handler that will return the sortable primitive from a given element.
 * The default order is ascending ('asc'). It can be modified by setting the extra param 'order' to 'desc'.
 */
export function sortBy<T = any>(
  array: T[],
  criterion: string | ((element: T) => any),
  order: "asc" | "desc" = "asc"
): T[] {
  const extract = _getExtractorFrom(criterion);
  return array.slice().sort((elA, elB) => {
    const a = extract(elA);
    const b = extract(elB);
    let result;
    if (isNaN(a) && isNaN(b)) {
      result = a > b ? 1 : a < b ? -1 : 0;
    } else {
      result = a - b;
    }
    return order === "asc" ? result : -result;
  });
}
