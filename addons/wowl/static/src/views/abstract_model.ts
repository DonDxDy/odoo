import { evaluateExpr } from "../core/py/index";
import { makeContext } from "../core/utils";
import { IrFilter } from "../services/view_manager";
import { OdooEnv, Context, Domain } from "../types";
import { assembleDomains } from "./search_utils";

const FAVORITE_PRIVATE_GROUP = 1;
const FAVORITE_SHARED_GROUP = 2;

type FilterType = "filter" | "groupBy" | "comparison" | "field" | "favorite";

interface CommonFilter {
  type: FilterType;
  id: number;
  groupId: number;
  description: string;
}

// interface Filter extends CommonFilter {

// }

// interface GroupBy extends CommonFilter {

// }

interface Favorite extends CommonFilter {
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

type ABC = Favorite;

interface ABCs {
  [filterId: number]: ABC;
}

interface CommonQueryElement {
  type: FilterType;
  filterId: number;
  groupId: number;
  optionId?: string;
}

interface FavoriteQueryElement extends CommonQueryElement {
  type: "favorite";
}

type QueryElement = FavoriteQueryElement;

type Query = QueryElement[];

interface PreGroup {
  id: number;
  type: FilterType;
  activities: Query;
}

interface Group {
  id: number;
  type: FilterType;
  activities: {
    filter: ABC;
    filterQueryElements: Query;
  }[];
}

interface State {
  filters: ABCs;
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
  searchMenuTypes: Set<FilterType>;

  constructor(env: OdooEnv, params?: {}) {
    this.env = env;
    this.searchMenuTypes = new Set(["favorite"]); // hard coded for now ---> what in future?
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
    const groups = this._getGroups();
    const userContext = this.env.services.user.context;
    try {
      return evaluateExpr(this._getDomain(groups), userContext);
    } catch (err) {
      throw new Error(`${this.env._t("Failed to evaluate domain")}:/n${JSON.stringify(err)}`);
    }
  }

  /**
   * Return the string or array representation of a domain created by combining
   * appropriately (with an 'AND') the domains coming from the active groups
   * of type 'filter', 'favorite', and 'field'.
   */
  _getDomain(groups: Group[]) {
    const types = ["filter", "favorite", "field"];
    const domains = [];
    for (const group of groups) {
      if (types.includes(group.type)) {
        domains.push(this._getGroupDomain(group));
      }
    }
    return assembleDomains(domains, "AND");
  }

  /**
   * Return the string representation of a domain created by combining
   * appropriately (with an 'OR') the domains coming from the filters
   * active in the given group.
   */
  _getGroupDomain(group: Group) {
    const domains = group.activities.map(({ filter, filterQueryElements }) => {
      return this._getFilterDomain(filter, filterQueryElements);
    });
    return assembleDomains(domains, "OR");
  }

  /**
   * Return the domain of the provided filter.
   */
  _getFilterDomain(filter: ABC, filterQueryElements: Query): string {
    // if (filter.type === 'filter' && filter.hasOptions) {
    //     const { dateFilterId } = this.activeComparison || {};
    //     if (this.searchMenuTypes.includes('comparison') && dateFilterId === filter.id) {
    //         return "[]";
    //     }
    //     return this._getDateFilterDomain(filter, filterQueryElements);
    // } else if (filter.type === 'field') {
    //     return this._getAutoCompletionFilterDomain(filter, filterQueryElements);
    // }
    if (filter.type === "favorite") {
      return filter.domain;
    }
    return "[]";
  }

  /**
   * Reconstruct the (active) groups from the query elements.
   * @private
   * @returns {Object[]}
   */
  _getGroups() {
    const preGroups: PreGroup[] = [];
    for (const queryElem of this.state.query) {
      const { groupId, filterId } = queryElem;
      let group = preGroups.find((group) => group.id === groupId);
      const filter = this.state.filters[filterId];
      if (!group) {
        const { type } = filter;
        group = {
          id: groupId,
          type,
          activities: [],
        };
        preGroups.push(group);
      }
      group.activities.push(queryElem);
    }
    return preGroups.map((preGroup) => this._mergeActivities(preGroup));
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

  /**
   * Group the query elements in group.activities by qe -> qe.filterId
   * and changes the form of group.activities to make it more suitable for further
   * computations.
   */
  _mergeActivities(preGroup: PreGroup): Group {
    const { activities, id, type } = preGroup;
    let res: { filter: ABC; filterQueryElements: Query }[] = [];
    switch (type) {
      case "filter":
      case "groupBy": {
        for (const activity of activities) {
          const { filterId } = activity;
          let a = res.find(({ filter }) => filter.id === filterId);
          if (!a) {
            a = {
              filter: this.state.filters[filterId],
              filterQueryElements: [],
            };
            res.push(a);
          }
          a.filterQueryElements.push(activity);
        }
        break;
      }
      case "favorite":
      case "field":
      case "comparison": {
        // all activities in the group have same filterId
        const { filterId } = preGroup.activities[0];
        const filter = this.state.filters[filterId];
        res.push({
          filter,
          filterQueryElements: preGroup.activities,
        });
        break;
      }
    }
    // if (type === 'groupBy') {
    //     res.forEach(activity => {
    //         activity.filterQueryElements.sort(
    //             (qe1, qe2) => rankInterval(qe1.optionId) - rankInterval(qe2.optionId)
    //         );
    //     });
    // }
    return {
      id,
      type,
      activities: res,
    };
  }
}
