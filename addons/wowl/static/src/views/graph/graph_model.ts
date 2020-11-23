import { AbstractModel } from "../abstract_model";

export class GraphModel extends AbstractModel {
  static type = "graph";

  async load(params: {}) {
    await super.load(params);
    debugger;
    await this.loadGraph();
  }

  /**
   * Fetch and process graph data.  It is basically a(some) read_group(s)
   * with correct fields for each domain.  We have to do some light processing
   * to separate date groups in the field list, because they can be defined
   * with an aggregation function, such as my_date:week.
   *
   * @private
   * @returns {Promise}
   */
  async loadGraph() {
    // this.chart.dataPoints = [];
    // var groupBy = this.chart.processedGroupBy;
    // var fields = _.map(groupBy, function (groupBy) {
    //     return groupBy.split(':')[0];
    // });
    // if (this.chart.measure !== '__count__') {
    //     if (this.fields[this.chart.measure].type === 'many2one') {
    //         fields = fields.concat(this.chart.measure + ":count_distinct");
    //     }
    //     else {
    //         fields = fields.concat(this.chart.measure);
    //     }
    // }
    // var context = _.extend({fill_temporal: true}, this.chart.context);
    // var proms = [];
    // this.chart.domains.forEach(function (domain, originIndex) {
    //     proms.push(self._rpc({
    //         model: self.modelName,
    //         method: 'read_group',
    //         context: context,
    //         domain: domain,
    //         fields: fields,
    //         groupBy: groupBy,
    //         lazy: false,
    //     }).then(self._processData.bind(self, originIndex)));
    // });
    // return Promise.all(proms);
    // self._rpc({
    //           model: self.modelName,
    //           method: 'read_group',
    //           context: context,
    //           domain: domain,
    //           fields: fields,
    //           groupBy: groupBy,
    //           lazy: false,
    //       }
    await this.env.services.model("crm.lead").readGroup(this.domain, [], []);
  }
}
