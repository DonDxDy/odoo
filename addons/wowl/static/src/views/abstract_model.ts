import { makeContext } from "../core/utils";
import { IrFilter } from "../services/view_manager";
import { OdooEnv, Context, Domain } from "../types";

const FAVORITE_PRIVATE_GROUP = 1;
const FAVORITE_SHARED_GROUP = 2;

interface Favorite extends Filter {
  type: "favorite";
  id: number;
  groupId: number;
  description: string;
  context: Context;
  domain: string;
  groupBys: string[];
  groupNumber: 1 | 2;
  orderedBy: { asc: boolean; name: string }[];
  removable: boolean;
  serverSideId: number;
  userId: number | false;
  isDefault?: true;
  // comparison: of the form {comparisonId, fieldName, fieldDescription,
  //     *                      range, rangeDescription, comparisonRange, comparisonRangeDescription, }
}

interface Filter {
  type: "filter" | "groupBy" | "comparison" | "field" | "favorite";
  id: number;
  groupId: number;
  description: string;
}

interface Filters {
  [filterId: number]: Favorite;
}

interface QueryElements {}

type Query = QueryElements[];

interface State {
  filters: Filters;
  query: Query;
}

let filterId: number = 1;
let groupId: number = 1;

export class AbstractModel {
  static type: string = "abstract_model";
  state: State = {
    filters: {},
    query: [],
  };
  env: OdooEnv;

  constructor(env: OdooEnv, params?: {}) {
    this.env = env;
  }

  get domain(): Domain {
    return this.getDomain();
  }

  load(params: {}) {
    const irFilters = (params as any).irFilters as IrFilter[];
    for (const irFilter of irFilters) {
      const favorite = this._irFilterToFavorite(irFilter);
      this._createGroupOfFilters([favorite]);
    }
  }

  /**
   * @returns {Array[]}
   */
  getDomain(): Domain {
    // const groups = this._getGroups();
    // const userContext = this.env.services.user.context;
    try {
      // return Domain.prototype.stringToArray(this._getDomain(groups), userContext);
      const firstFilter = Object.values(this.state.filters)[0] as Favorite | undefined;
      if (firstFilter && firstFilter.type === "favorite") {
        // return firstFilter.domain;
        return [];
      }
      return [];
    } catch (err) {
      throw new Error(
        `${this.env._t(
          "Control panel model extension failed to evaluate domain"
        )}:/n${JSON.stringify(err)}`
      );
    }
  }

  /**
   * Reconstruct the (active) groups from the query elements.
   * @private
   * @returns {Object[]}
   */
  _getGroups() {
    // const groups = this.state.query.reduce(
    //     (groups, queryElem) => {
    //         const { groupId, filterId } = queryElem;
    //         let group = groups.find(group => group.id === groupId);
    //         const filter = this.state.filters[filterId];
    //         if (!group) {
    //             const { type } = filter;
    //             group = {
    //                 id: groupId,
    //                 type,
    //                 activities: []
    //             };
    //             groups.push(group);
    //         }
    //         group.activities.push(queryElem);
    //         return groups;
    //     },
    //     []
    // );
    // groups.forEach(g => this._mergeActivities(g));
    // return groups;
    return [];
  }

  /**
   * Using a list (a 'pregroup') of 'prefilters', create new filters in `state.filters`
   * for each prefilter. The new filters belong to a same new group.
   * @private
   * @param {Object[]} pregroup, list of 'prefilters'
   * @param {string} type
   */
  _createGroupOfFilters(pregroup: {}[]) {
    pregroup.forEach((preFilter) => {
      const filter = Object.assign(preFilter, { groupId, id: filterId }) as Favorite;
      this.state.filters[filterId] = filter;
      // if (!this.defaultFavoriteId && filter.isDefault && filter.type === 'field') {
      //     this._prepareDefaultLabel(filter);
      // }
      filterId++;
    });
    groupId++;
  }

  /**
   * Returns a filter of type 'favorite' starting from an ir_filter comming from db.
   * @private
   * @param {Object} irFilter
   * @returns {Object}
   */
  _irFilterToFavorite(irFilter: IrFilter): Favorite {
    let userId: number | false = false;
    if (Array.isArray(irFilter.user_id)) {
      userId = irFilter.user_id[0];
    }
    const groupNumber = userId ? FAVORITE_PRIVATE_GROUP : FAVORITE_SHARED_GROUP;
    const context = makeContext(irFilter.context, this.env.services.user.context);
    let groupBys = [];
    if (context.group_by) {
      groupBys = context.group_by;
      delete context.group_by;
    }
    // let comparison;
    // if (context.comparison) {
    //     comparison = context.comparison;
    //     delete context.comparison;
    // }
    let sort: string[];
    try {
      sort = JSON.parse(irFilter.sort);
    } catch (err) {
      if (err instanceof SyntaxError) {
        sort = [];
      } else {
        throw err;
      }
    }
    const orderedBy = sort.map((order) => {
      let fieldName;
      let asc;
      const sqlNotation = order.split(" ");
      if (sqlNotation.length > 1) {
        // regex: \fieldName (asc|desc)?\
        fieldName = sqlNotation[0];
        asc = sqlNotation[1] === "asc";
      } else {
        // legacy notation -- regex: \-?fieldName\
        fieldName = order[0] === "-" ? order.slice(1) : order;
        asc = order[0] === "-" ? false : true;
      }
      return {
        asc: asc,
        name: fieldName,
      };
    });
    const favorite: Favorite = {
      context,
      description: irFilter.name,
      domain: irFilter.domain,
      groupBys,
      groupNumber,
      orderedBy,
      removable: true,
      serverSideId: irFilter.id,
      type: "favorite",
      userId,
    } as Favorite;
    if (irFilter.is_default) {
      favorite.isDefault = irFilter.is_default;
    }
    // if (comparison) {
    //     favorite.comparison = comparison;
    // }
    return favorite;
  }
}
