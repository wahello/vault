import Component from '@ember/component';
import d3 from 'd3-selection';
import d3Scale from 'd3-scale';
import d3Axis from 'd3-axis';
import d3TimeFormat from 'd3-time-format';
import { assign } from '@ember/polyfills';
import { computed } from '@ember/object';
import { run, debounce } from '@ember/runloop';
import { task, waitForEvent } from 'ember-concurrency';

/**
 * @module HttpRequestsBarChart
 * HttpRequestsBarChart components are used to render a bar chart with the total number of HTTP Requests to a Vault server per month.
 *
 * @example
 * ```js
 * <HttpRequestsBarChart @counters={{counters}} />
 * ```
 *
 * @param counters=null {Array} - A list of objects containing the total number of HTTP Requests for each month. `counters` should be the response from the `/internal/counters/requests` endpoint which looks like:
 * COUNTERS = [
 *    {
 *       "start_time": "2019-05-01T00:00:00Z",
 *       "total": 50
 *     }
 * ]
 */

const HEIGHT = 240;

export default Component.extend({
  classNames: ['http-requests-bar-chart-container'],
  counters: null,
  margin: { top: 24, right: 16, bottom: 24, left: 16 },
  width: 0,
  height() {
    const { margin } = this;
    return HEIGHT - margin.top - margin.bottom;
  },

  parsedCounters: computed('counters', function() {
    // parse the start times so bars and ticks display properly
    const { counters } = this;
    return counters.map(counter => {
      return assign({}, counter, { start_time: d3TimeFormat.isoParse(counter.start_time) });
    });
  }),

  yScale: computed('parsedCounters', 'height', function() {
    const { parsedCounters } = this;
    const height = this.height();
    const counterTotals = parsedCounters.map(c => c.total);

    return d3Scale
      .scaleLinear()
      .domain([0, Math.max(...counterTotals)])
      .range([height, 0]);
  }),

  xScale: computed('parsedCounters', 'width', function() {
    const { parsedCounters, width, margin } = this;

    return d3Scale
      .scaleBand()
      .domain(parsedCounters.map(c => c.start_time))
      .rangeRound([0, width - margin.left - margin.right], 0.05)
      .paddingInner(0.04);
  }),

  didInsertElement() {
    this._super(...arguments);
    const { margin } = this;

    // set the width after the element has been rendered because the chart axes depend on it.
    // this helps us avoid an arbitrary hardcoded width which causes alignment & resizing problems.
    run.schedule('afterRender', this, () => {
      this.set('width', this.element.clientWidth - margin.left - margin.right);
      this.renderBarChart();
    });
  },

  renderBarChart() {
    const { margin, width, xScale, yScale, parsedCounters } = this;
    const height = this.height();
    const barChartSVG = d3.select('.http-requests-bar-chart');
    const barsContainer = d3.select('#bars-container');

    // render the chart
    d3.select('.http-requests-bar-chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // scale and render the axes
    const yAxis = d3Axis.axisRight(yScale).ticks(3, '.0s');
    const xAxis = d3Axis.axisBottom(xScale).tickFormat(d3TimeFormat.timeFormat('%b %Y'));

    barChartSVG
      .select('g.x.axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    barChartSVG
      .select('g.y.axis')
      .attr('transform', `translate(${width - margin.left - margin.right}, 0)`)
      .call(yAxis);

    // render the bars
    const bars = barsContainer.selectAll('.bar').data(parsedCounters);
    const barsEnter = bars
      .enter()
      .append('rect')
      .attr('class', 'bar');

    bars
      .merge(barsEnter)
      // these attributes are only applied when bars are updated
      .attr('width', xScale.bandwidth())
      .attr('height', counter => height - yScale(counter.total))
      // the offset between each bar
      .attr('x', counter => xScale(counter.start_time))
      .attr('y', counter => yScale(counter.total));
  },

  updateDimensions() {
    const newWidth = this.element.clientWidth;
    const { margin } = this;

    this.set('width', newWidth - margin.left - margin.right);
    this.renderBarChart();
  },

  waitforResize: task(function*() {
    while (true) {
      yield waitForEvent(window, 'resize');
      debounce(this, 'updateDimensions', 200);
    }
  })
    .on('didInsertElement')
    .cancelOn('willDestroyElement')
    .drop(),
});
