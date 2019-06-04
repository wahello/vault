import Component from '@ember/component';
import d3 from 'd3-selection';
import d3Scale from 'd3-scale';
import d3Axis from 'd3-axis';
import d3TimeFormat from 'd3-time-format';
import { assign } from '@ember/polyfills';
import { computed } from '@ember/object';
import { run } from '@ember/runloop';
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

const COUNTERS = [
  {
    start_time: '2019-05-01T00:00:00Z',
    total: 50000,
  },
  {
    start_time: '2019-04-01T00:00:00Z',
    total: 4500,
  },
  {
    start_time: '2019-03-01T00:00:00Z',
    total: 550000,
  },
];

export default Component.extend({
  classNames: ['http-requests-bar-chart-container'],
  counters: COUNTERS,
  svgContainer: null,
  barsContainer: null,
  clipPath: null,
  margin: { top: 12, right: 12, bottom: 24, left: 24 },
  width: 0,
  height() {
    const { margin } = this;
    return 240 - margin.top - margin.bottom;
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
    const { parsedCounters, width } = this;

    return d3Scale
      .scaleBand()
      .domain(parsedCounters.map(c => c.start_time))
      .rangeRound([0, width], 0.05)
      .paddingInner(0.04);
  }),

  didInsertElement() {
    this._super(...arguments);
    const { margin } = this;

    run.schedule('afterRender', this, () => {
      this.set('width', this.element.clientWidth - margin.left - margin.right);
      this.initBarChart();
    });
  },

  initBarChart() {
    const { margin, width } = this;
    const height = this.height();

    const svgContainer = d3
      .select('.http-requests-bar-chart')
      .append('g')
      .attr('class', 'container');

    this.set('svgContainer', svgContainer);

    const defs = svgContainer.append('defs');

    const bgGradient = defs
      .append('linearGradient')
      .attr('id', 'bg-gradient')
      .attr('gradientTransform', 'rotate(90)');

    bgGradient
      .append('stop')
      // this corresponds to $blue-500
      .attr('stop-color', '#1563ff')
      .attr('stop-opacity', '0.8')
      .attr('offset', '0%');
    bgGradient
      .append('stop')
      // this corresponds to $blue-500
      .attr('stop-color', '#1563ff')
      .attr('stop-opacity', '0.3')
      .attr('offset', '100%');

    const clipPath = svgContainer
      .append('g')
      .attr('clip-path', `url(#clip-bar-rects)`)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', 'url(#bg-gradient)');

    this.set('clipPath', clipPath);

    const barsContainer = d3
      .select('.http-requests-bar-chart')
      .append('clipPath')
      .attr('id', 'clip-bar-rects');

    this.set('barsContainer', barsContainer);

    svgContainer.append('g').attr('class', 'x axis');
    svgContainer.append('g').attr('class', 'y axis');

    this.renderBarChart();
  },

  renderBarChart() {
    const data = this.counters || [];
    const height = this.height();
    const { margin, width, svgContainer, xScale, yScale, parsedCounters, barsContainer, clipPath } = this;

    d3.select('.http-requests-bar-chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const yAxis = d3Axis.axisRight(yScale).ticks(3, '.0s');
    const xAxis = d3Axis.axisBottom(xScale).tickFormat(d3TimeFormat.timeFormat('%b %Y'));

    svgContainer
      .select('g.x.axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    svgContainer
      .select('g.y.axis')
      .attr('transform', `translate(${width}, 0)`)
      .call(yAxis);

    clipPath.attr('width', width).attr('height', height);

    const bars = barsContainer.selectAll('.bar').data(parsedCounters);
    const barsEnter = bars
      .enter()
      .append('rect')
      .attr('class', 'bar');

    bars
      .merge(barsEnter)
      .attr('width', xScale.bandwidth())
      .attr('height', counter => height - yScale(counter.total))
      // the offset between each bar
      .attr('x', counter => xScale(counter.start_time))
      .attr('y', counter => yScale(counter.total));
  },

  updateDimensions(event) {
    const newWidth = event.target.innerWidth;
    const { margin } = this;

    this.set('width', newWidth - margin.left - margin.right);
    this.renderBarChart();
  },

  waitforResize: task(function*() {
    while (true) {
      let event = yield waitForEvent(window, 'resize');
      this.updateDimensions(event);
    }
  })
    .on('didInsertElement')
    .cancelOn('willDestroyElement'),
});
