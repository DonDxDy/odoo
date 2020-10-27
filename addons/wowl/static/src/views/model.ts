import { core } from "@odoo/owl";
import { makeContext, Context } from "../core/context";
import { IrFilter, ViewDescription } from "../services/view_manager";
import { OdooEnv } from "../types";
import { combineDomains, Domain, DomainListRepr } from "../core/domain";
import { Fields } from "./view";
import { DEFAULT_INTERVAL, DEFAULT_PERIOD, getComparisonOptions } from "./search_utils";
import { evaluateExpr } from "../py/index";
const { EventBus } = core;

const FAVORITE_PRIVATE_GROUP = 1;
const FAVORITE_SHARED_GROUP = 2;

const DISABLE_FAVORITE = "search_disable_custom_filters";

type SearchElementType = "filter" | /**| "groupBy" | "comparison" | "field"*/ "favorite";

interface SearchElementCommon {
  type: SearchElementType;
  id: number;
  groupId: number;
  description: string;
}

interface FilterCommon extends SearchElementCommon {
  type: "filter";
  groupNumber: number;
  context?: string;
  invisible?: true;
  isDefault?: true;
  defaultRank?: -5;
}

interface Filter extends FilterCommon {
  isDateFilter: false;
  domain: Domain;
}

interface DateFilter extends FilterCommon {
  isDateFilter: true;
  hasOptions: true;
  defaultOptionId: string;
  fieldName: string;
  fieldType: "date" | "datetime";
}

// interface Field extends SearchElementCommon {
//   type: "field";
//   context?: string;
//   invisible?: true;
//   isDefault?: true;
// }

// interface GroupBy extends SearchElementCommon {

// }

interface Favorite extends SearchElementCommon {
  type: "favorite";
  context: Context;
  domain: Domain;
  groupBys: string[];
  groupNumber: 1 | 2;
  orderedBy: { asc: boolean; name: string }[];
  removable?: true;
  serverSideId: number;
  userId: number | false;
  isDefault?: true;
  // comparison: of the form {comparisonId, fieldName, fieldDescription,
  //     *                      range, rangeDescription, comparisonRange, comparisonRangeDescription, }
}

type SearchElement = Filter | DateFilter | Favorite;

interface SearchElements {
  [filterId: number]: SearchElement;
}

interface CommonQueryElement {
  filterId: number;
  groupId: number;
}

interface FavoriteQueryElement extends CommonQueryElement {
  type: "favorite";
}

interface FilterQueryElement extends CommonQueryElement {
  type: "filter";
}

type QueryElement = FavoriteQueryElement | FilterQueryElement;

type Query = QueryElement[];

interface PreGroup {
  id: number;
  type: SearchElementType;
  activities: Query;
}

interface Group {
  id: number;
  type: SearchElementType;
  activities: {
    filter: SearchElement;
    filterQueryElements: Query;
  }[];
}

interface State {
  searchElements: SearchElements;
  query: Query;
}

export interface ModelParams {
  context: Context;
  searchViewDescription: ViewDescription;
  modelName: string;
}

let filterId: number = 1;
let groupId: number = 1;
let groupNumber: number = 1;

export class GroupBy {
  private __fieldName: string;
  private __interval?: string;
  private __descr: string;

  constructor(descr: string, fields?: Fields) {
    // add some validation using fields
    // have always interval set when groupBy based date/datetime field
    const [fieldName, interval] = descr.split(":");
    if (!fieldName) {
      throw Error(`Invalid groupBy: ${descr}`);
    }
    this.__descr = descr;
    this.__fieldName = fieldName;
    this.__interval = interval;
  }
  toJSON() {
    return this.__descr; // should be a fieldName or always fieldName:interval for date/datetime fields
  }
  get fieldName() {
    return this.__fieldName; // should be a valid fieldName
  }
  get interval() {
    return this.__interval || null;
  }
}

class Measure {
  constructor(descr: string, fields?: Fields) {
    // do something, validate measure, have always a group operator when toString is called,...
  }
}

new Measure("__count__");

export class Model extends EventBus {
  context: Context = {};
  env: OdooEnv;
  modelName: string = "";

  defaultFavoriteId: number | null = null;
  searchMenuTypes: Set<SearchElementType> = new Set(["favorite"]); // hard coded for now ---> what in future?
  comparisonOptions: { id: string; groupNumber?: number; description?: string }[];
  state: State = {
    searchElements: {},
    query: [],
  };

  constructor(env: OdooEnv) {
    super();
    this.env = env;
    this.comparisonOptions = getComparisonOptions();
  }

  load(params: ModelParams) {
    const { searchViewDescription, context, modelName } = params;

    this.modelName = modelName;

    this.context = context;
    const searchDefaults: { [key: string]: any } = {};
    for (const key in this.context) {
      const match = /^search_default_(.*)$/.exec(key);
      if (match) {
        const val = this.context[key];
        if (val) {
          searchDefaults[match[1]] = val;
        }
        delete this.context[key];
      }
    }

    this.processSearchViewDescription(searchViewDescription, searchDefaults);

    this.activateDefaultFilters();
  }

  processSearchViewDescription(
    searchViewDescription: ViewDescription,
    searchDefaults: { [key: string]: any }
  ) {
    const { irFilters, arch, fields } = searchViewDescription;
    const parser = new DOMParser();
    const xml = parser.parseFromString(arch, "text/xml");
    this.parseXML(xml.documentElement, {
      currentTag: null,
      currentGroup: [],
      fields,
      pregroupOfGroupBys: [],
      searchDefaults,
    });
    const dateFilters = Object.values(this.state.searchElements).filter(
        (searchElement) => searchElement.isDateFilter
    );
    if (dateFilters.length) {
        this._createGroupOfComparisons(dateFilters);
    }
    this.createGroupOfFavorites(irFilters || []);
  }

  pushGroup(
    data: {
      currentTag: string | null;
      currentGroup: any[];
      pregroupOfGroupBys: any[];
      searchDefaults: { [key: string]: any };
      fields: Fields;
    },
    tag: string | null = null
  ) {
    if (data.currentGroup.length) {
      if (data.currentTag === "groupBy") {
        data.pregroupOfGroupBys.push(...data.currentGroup);
      } else {
        this.createGroupOfSearchItems(data.currentGroup);
      }
    }
    data.currentTag = tag;
    data.currentGroup = [];
    groupNumber++;
  }

  parseXML(
    node: Element | ChildNode,
    data: {
      currentTag: string | null;
      currentGroup: any[];
      pregroupOfGroupBys: any[];
      searchDefaults: { [key: string]: any };
      fields: Fields;
    }
  ) {
    if (!(node instanceof Element)) {
      return;
    }
    if (node.nodeType === 1) {
      switch (node.tagName) {
        case "search":
          for (let child of node.childNodes) {
            this.parseXML(child, data);
          }
          this.pushGroup(data);
          if (data.pregroupOfGroupBys.length) {
            this.createGroupOfSearchItems(data.pregroupOfGroupBys);
          }
          break;
        case "group":
          this.pushGroup(data);
          for (let child of node.childNodes) {
            this.parseXML(child, data);
          }
          this.pushGroup(data);
          break;
        case "separator":
          this.pushGroup(data);
          break;
        case "field":
          this.pushGroup(data, "field");

          const preField: any = { type: "field" };

          if (node.hasAttribute("modifiers")) {
            const modifiers = JSON.parse(node.getAttribute("modifiers")!);
            if (modifiers.invisible) {
              preField.invisible = true;
            }
          }

          if (node.hasAttribute("domain")) {
            preField.domain = new Domain(node.getAttribute("domain")!);
          }
          if (node.hasAttribute("filter_domain")) {
            preField.filterDomain = new Domain(node.getAttribute("filter_domain")!);
          } else if (node.hasAttribute("operator")) {
            preField.operator = node.getAttribute("operator");
          }
          if (node.getAttribute("context")) {
            preField.context = node.getAttribute("context");
          }

          if (node.hasAttribute("name")) {
            const name = node.getAttribute("name")!;
            preField.fieldName = name;
            preField.fieldType = data.fields[name].type;

            if (name in data.searchDefaults) {
              preField.isDefault = true;
              const value = data.searchDefaults[name];
              let operator = preField.operator;
              if (!operator) {
                let type = preField.fieldType;
                if (node.hasAttribute("widget")) {
                  type = node.getAttribute("widget")!;
                }
                // Note: many2one as a default filter will have a
                // numeric value instead of a string => we want "="
                // instead of "ilike".
                if (["char", "html", "many2many", "one2many", "text"].includes(type)) {
                  operator = "ilike";
                } else {
                  operator = "=";
                }
              }
              preField.defaultRank = -10;
              preField.defaultAutocompleteValue = {
                operator,
                value: Array.isArray(value) ? value[0] : value,
              };
            }
          }

          if (node.hasAttribute("string")) {
            preField.description = node.getAttribute("string");
          } else if (preField.fieldName) {
            preField.description = data.fields[preField.fieldName].string;
          } else {
            preField.description = "Ω";
          }

          data.currentGroup.push(preField);
          break;
        case "filter":
          const preSearchItem: any = { type: "filter" };

          if (node.hasAttribute("context")) {
            const context = node.getAttribute("context")!;
            try {
              const groupBy = makeContext(context).group_by;
              if (groupBy) {
                preSearchItem.type = "groupBy";
                const [fieldName, defaultInterval] = makeContext(context).group_by.split(":");
                preSearchItem.fieldName = fieldName;
                preSearchItem.fieldType = data.fields[fieldName].type;
                if (["date", "datetime"].includes(preSearchItem.fieldType)) {
                  preSearchItem.hasOptions = true;
                  preSearchItem.defaultOptionId = defaultInterval || DEFAULT_INTERVAL;
                }
              }
            } catch (e) {}
            if (preSearchItem.type === "filter") {
              preSearchItem.context = context;
            }
          }

          if (preSearchItem.type !== data.currentTag) {
            this.pushGroup(data, preSearchItem.type);
          }

          if (preSearchItem.type === "filter") {
            if (node.hasAttribute("date")) {
              const fieldName = node.getAttribute("date")!;
              preSearchItem.isDateFilter = true;
              preSearchItem.hasOptions = true;
              preSearchItem.fieldName = fieldName;
              preSearchItem.fieldType = data.fields[fieldName].type;
              preSearchItem.defaultOptionId = DEFAULT_PERIOD;
              if (node.hasAttribute("default_period")) {
                preSearchItem.defaultOptionId = node.getAttribute("default_period");
              }
            } else {
              let stringRepr = "[]";
              if (node.hasAttribute("domain")) {
                stringRepr = node.getAttribute("domain")!;
              }
              preSearchItem.domain = new Domain(stringRepr);
            }
          }

          if (node.hasAttribute("modifiers")) {
            const modifiers = JSON.parse(node.getAttribute("modifiers")!);
            if (modifiers.invisible) {
              preSearchItem.invisible = true;
              let fieldName = preSearchItem.fieldName;
              if (fieldName && !data.fields[fieldName]) {
                // In some case when a field is limited to specific groups
                // on the model, we need to ensure to discard related filter
                // as it may still be present in the view (in 'invisible' state)
                return;
              }
            }
          }

          preSearchItem.groupNumber = groupNumber;

          if (node.hasAttribute("name")) {
            const name = node.getAttribute("name")!;
            if (name in data.searchDefaults) {
              preSearchItem.isDefault = true;
              if (preSearchItem.type === "groupBy") {
                const value = data.searchDefaults[name];
                preSearchItem.defaultRank = typeof value === "number" ? value : 100;
              } else {
                preSearchItem.defaultRank = -5;
              }
            }
          }

          if (node.hasAttribute("string")) {
            preSearchItem.description = node.getAttribute("string");
          } else if (preSearchItem.fieldName) {
            preSearchItem.description = data.fields[preSearchItem.fieldName].string;
          } else {
            preSearchItem.description = "Ω";
          }

          data.currentGroup.push(preSearchItem);
          break;
      }
    }
  }

  //--------------------------------------------------------------------------
  // Getters
  //--------------------------------------------------------------------------

  get domain(): DomainListRepr {
    return this.getDomain().toList(this.env.services.user.context);
  }

  get domains(): DomainListRepr[] {
    return [this.domain]; /** for comparisons @todo  to adapt */
  }

  get groupBy(): string[] {
    return this.getGroupBy();
  }

  /**
   * Return an array containing enriched copies of the filters of the provided type.
   */
  getFilters(predicate: (filter: SearchElement) => boolean) {
    const filters: any[] = [];
    Object.values(this.state.searchElements).forEach((filter) => {
      if ((!predicate || predicate(filter)) && !filter.invisible) {
        const filterQueryElements = this.state.query.filter(
          (queryElem) => queryElem.filterId === filter.id
        );
        const enrichedFilter = this.enrichFilterCopy(filter, filterQueryElements);
        if (enrichedFilter) {
          filters.push(enrichedFilter);
        }
      }
    });
    if (filters.some((f) => f.type === "favorite")) {
      filters.sort((f1, f2) => f1.groupNumber - f2.groupNumber);
    }
    return filters;
  }

  //--------------------------------------------------------------------------
  // "Actions"
  //--------------------------------------------------------------------------

  /**
   * Delete a filter of type 'favorite' with given filterId server side and
   * in control panel model. Of course the filter is also removed
   * from the search query.
   */
  async deleteFavorite(filterId: number) {
    const filter = this.state.searchElements[filterId];
    if (filter.type !== "favorite") {
      return;
    }
    const { serverSideId } = filter;
    await this.env.services
      .model("ir.filters")
      .unlink([
        serverSideId,
      ]); /** @todo we should maybe expose some method in view_manager: before, the filter cache was invalidated */
    const index = this.state.query.findIndex((queryElem) => queryElem.filterId === filterId);
    delete this.state.searchElements[filterId];
    if (index >= 0) {
      this.state.query.splice(index, 1);
    }
    this.trigger("UPDATE");
  }

  /**
   * Activate or deactivate the simple filter with given filterId, i.e.
   * add or remove a corresponding query element.
   */
  toggleFilter(filterId: number) {
    const index = this.state.query.findIndex((queryElem) => queryElem.filterId === filterId);
    if (index >= 0) {
      this.state.query.splice(index, 1);
    } else {
      const { groupId, type } = this.state.searchElements[filterId];
      if (type === "favorite") {
        this.state.query = [];
      }
      this.state.query.push({ groupId, filterId, type });
    }
    this.trigger("UPDATE");
  }

  //--------------------------------------------------------------------------
  // Private
  //--------------------------------------------------------------------------

  /**
   * Activate the default favorite (if any) or all default filters.
   */
  private activateDefaultFilters() {
    const activateFavorite =
      DISABLE_FAVORITE in this.context ? this.context[DISABLE_FAVORITE] : true;
    if (activateFavorite && this.defaultFavoriteId) {
      // Activate default favorite
      this.toggleFilter(this.defaultFavoriteId);
    } else {
      // Activate default filters
      Object.values(this.state.searchElements)
        .filter((f) => f.isDefault && f.type !== "favorite")
        .sort((f1, f2) => (f1.defaultRank || 100) - (f2.defaultRank || 100))
        .forEach((f) => {
          // if (f.hasOptions) {
          //     this.toggleFilterWithOptions(f.id);
          // } else if (f.type === 'field') {
          //     let { operator, label, value } = f.defaultAutocompleteValue;
          //     this.addAutoCompletionValues({
          //         filterId: f.id,
          //         value,
          //         operator,
          //         label,
          //     });
          // } else {
          this.toggleFilter(f.id);
          // }
        });
    }
  }

  /**
   * Starting from the array of date filters, create the filters of type
   * 'comparison'.
   * @private
   * @param {Object[]} dateFilters
   */
  _createGroupOfComparisons(dateFilters: DateFilter[]) {
    const preSearchItem = [];
    for (const dateFilter of dateFilters) {
        for (const comparisonOption of this.comparisonOptions) {
            const { id: dateFilterId, description } = dateFilter;
            const preFilter = {
                type: 'comparison',
                comparisonOptionId: comparisonOption.id,
                description: `${description}: ${comparisonOption.description}`,
                dateFilterId,
            };
            preSearchItem.push(preFilter);
        }
    }
    this.createGroupOfSearchItems(preSearchItem);
}

  /**
   * Add filters of type 'favorite' determined by the array this.favoriteFilters.
   */
  private createGroupOfFavorites(irFilters: IrFilter[]) {
    this.defaultFavoriteId = null;
    irFilters.forEach((irFilter) => {
      const favorite = this.irFilterToFavorite(irFilter);
      this.createGroupOfSearchItems([favorite]);
      if (favorite.isDefault) {
        this.defaultFavoriteId = favorite.id;
      }
    });
  }

  /**
   * Using a list (a 'pregroup') of 'prefilters', create new filters in `state.searchElements`
   * for each prefilter. The new filters belong to a same new group.
   */
  private createGroupOfSearchItems(pregroup: {}[]) {
    pregroup.forEach((preFilter) => {
      const filter = Object.assign(preFilter, { groupId, id: filterId }) as SearchElement;
      this.state.searchElements[filterId] = filter;
      // if (!this.defaultFavoriteId && filter.isDefault && filter.type === 'field') {
      //     this._prepareDefaultLabel(filter);
      // }
      filterId++;
    });
    groupId++;
  }

  /**
   * Returns null or a copy of the provided filter with additional information
   * used only outside of the control panel model, like in search bar or in the
   * various menus. The value null is returned if the filter should not appear
   * for some reason.
   */
  private enrichFilterCopy(filter: SearchElement, filterQueryElements: Query): object | null {
    const isActive = Boolean(filterQueryElements.length);
    const f = Object.assign({ isActive }, filter);

    // function _enrichOptions(options) {
    //     return options.map(o => {
    //         const { description, id, groupNumber } = o;
    //         const isActive = filterQueryElements.some(a => a.optionId === id);
    //         return { description, id, groupNumber, isActive };
    //     });
    // }

    // switch (f.type) {
    //     case 'comparison': {
    //         const { dateFilterId } = filter;
    //         const dateFilterIsActive = this.state.query.some(
    //             queryElem => queryElem.filterId === dateFilterId
    //         );
    //         if (!dateFilterIsActive) {
    //             return null;
    //         }
    //         break;
    //     }
    //     case 'filter':
    //         if (f.hasOptions) {
    //             f.options = _enrichOptions(this.optionGenerators);
    //         }
    //         break;
    //     case 'groupBy':
    //         if (f.hasOptions) {
    //             f.options = _enrichOptions(this.intervalOptions);
    //         }
    //         break;
    //     case 'field':
    //         f.autoCompleteValues = filterQueryElements.map(
    //             ({ label, value, operator }) => ({ label, value, operator })
    //         );
    //         break;
    // }
    return f;
  }

  /**
   * Return the array representation of a domain created by combining
   * appropriately (with an 'AND') the domains coming from the active groups
   * of type 'filter', 'favorite', and 'field'.
   */
  private getDomain(): Domain {
    const groups = this.getGroups();
    const types = ["filter", "favorite", "field"];
    const domains = [];
    for (const group of groups) {
      if (types.includes(group.type)) {
        domains.push(this.getGroupDomain(group));
      }
    }

    try {
      return combineDomains(domains, "AND");
    } catch (err) {
      throw new Error(`${this.env._t("Failed to evaluate domain")}:/n${JSON.stringify(err)}`);
    }
  }

  /**
   * Return the domain of the provided filter.
   */
  private getFilterDomain(filter: SearchElement, filterQueryElements: Query): Domain {
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
    return new Domain([]);
  }

  /**
   * Return the groupBys of the provided filter.
   * @private
   * @param {Object} filter
   * @param {Object[]} filterQueryElements
   * @returns {string[]} groupBys
   */
  private getFilterGroupBys(filter: SearchElement, filterQueryElements: Query): string[] {
    if (filter.type === "favorite") {
      return filter.groupBys;
    }
    return [];

    // if (filter.type === 'groupBy') {
    //     const fieldName = filter.fieldName;
    //     if (filter.hasOptions) {
    //         return filterQueryElements.map(
    //             ({ optionId }) => `${fieldName}:${optionId}`
    //         );
    //     } else {
    //         return [fieldName];
    //     }
    // } else {
    // return filter.groupBys;
    // }
  }

  /**
   * Return the concatenation of groupBys comming from the active filters of
   * type 'favorite' and 'groupBy'.
   * The result respects the appropriate logic: the groupBys
   * coming from an active favorite (if any) come first, then come the
   * groupBys comming from the active filters of type 'groupBy' in the order
   * defined in this.state.query. If no groupBys are found, one tries to
   * find some grouBys in the this.context.
   */
  private getGroupBy(): string[] {
    const groups = this.getGroups();
    const types = ["groupBy", "favorite"];

    const groupBys: string[] = [];
    for (const group of groups) {
      if (types.includes(group.type)) {
        groupBys.push(...this.getGroupGroupBys(group));
      }
    }

    const groupBy = groupBys.length ? groupBys : this.context.group_by || [];
    return typeof groupBy === "string" ? [groupBy] : groupBy;
  }

  /**
   * Return the groupBys coming form the filters active in the given group.
   * @private
   * @param {Object} group
   * @returns {string[]}
   */
  private getGroupGroupBys(group: Group): string[] {
    const groupBys: string[] = [];
    for (const activity of group.activities) {
      groupBys.push(...this.getFilterGroupBys(activity.filter, activity.filterQueryElements));
    }
    return groupBys;
  }

  /**
   * Return the string representation of a domain created by combining
   * appropriately (with an 'OR') the domains coming from the filters
   * active in the given group.
   */
  private getGroupDomain(group: Group): Domain {
    const domains = group.activities.map(({ filter, filterQueryElements }) => {
      return this.getFilterDomain(filter, filterQueryElements);
    });
    return combineDomains(domains, "OR");
  }

  /**
   * Reconstruct the (active) groups from the query elements.
   * @private
   * @returns {Object[]}
   */
  private getGroups() {
    const preGroups: PreGroup[] = [];
    for (const queryElem of this.state.query) {
      const { groupId, filterId } = queryElem;
      let group = preGroups.find((group) => group.id === groupId);
      const filter = this.state.searchElements[filterId];
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
    return preGroups.map((preGroup) => this.mergeActivities(preGroup));
  }

  private irFilterToFavorite(irFilter: IrFilter): Favorite {
    let userId: number | false = false;
    if (Array.isArray(irFilter.user_id)) {
      userId = irFilter.user_id[0];
    }
    const groupNumber = userId ? FAVORITE_PRIVATE_GROUP : FAVORITE_SHARED_GROUP;
    const context = evaluateExpr(irFilter.context, this.env.services.user.context);
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
      domain: new Domain(irFilter.domain),
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
  private mergeActivities(preGroup: PreGroup): Group {
    const { activities, id, type } = preGroup;
    let res: { filter: SearchElement; filterQueryElements: Query }[] = [];
    switch (type) {
      case "filter":
        // case "groupBy":
        for (const activity of activities) {
          const { filterId } = activity;
          let a = res.find(({ filter }) => filter.id === filterId);
          if (!a) {
            a = {
              filter: this.state.searchElements[filterId],
              filterQueryElements: [],
            };
            res.push(a);
          }
          a.filterQueryElements.push(activity);
        }
        break;
      case "favorite":
        // case "field":
        // case "comparison":
        // all activities in the group have same filterId
        const { filterId } = preGroup.activities[0];
        const filter = this.state.searchElements[filterId];
        res.push({
          filter,
          filterQueryElements: preGroup.activities,
        });
        break;
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
