import Component from '@ember/component';
import d3 from 'd3-selection';
import d3Scale from 'd3-scale';
import d3Axis from 'd3-axis';
import d3TimeFormat from 'd3-time-format';
import { assign } from '@ember/polyfills';
import { run } from '@ember/runloop';

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
  tagName: '',
  counters: null,
  svgContainer: null,
  margin: { top: 12, right: 12, bottom: 24, left: 24 },
  width() {
    const margin = this.margin;
    return 1344 - margin.left - margin.right;
  },
  height() {
    const margin = this.margin;
    return 240 - margin.top - margin.bottom;
  },

  didInsertElement() {
    this._super(...arguments);

    const data = this.counters || [];
    run.schedule('afterRender', this, () => this.initBarChart(data));
  },

  initBarChart(dataIn) {
    const margin = this.margin,
      width = this.width(),
      height = this.height();

    const svgContainer = d3
      .select('.http-requests-bar-chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid')
      .append('g')
      .attr('class', 'container');

    this.set('svgContainer', svgContainer);

    this.renderBarChart(dataIn);
  },

  renderBarChart(dataIn) {
    const width = this.width(),
      height = this.height(),
      svgContainer = this.svgContainer;

    const counterTotals = dataIn.map(c => c.total);

    const yScale = d3Scale
      .scaleLinear()
      // the minimum and maximum value of the data
      .domain([0, Math.max(...counterTotals)])
      // how tall chart should be when we render it
      .range([height, 0]);

    // parse the start times so the ticks display properly
    const parsedData = dataIn.map(counter => {
      return assign({}, counter, { start_time: d3TimeFormat.isoParse(counter.start_time) });
    });

    const xScale = d3Scale
      .scaleBand()
      .domain(parsedData.map(c => c.start_time))
      // how wide it should be
      .rangeRound([0, width], 0.05)
      // what % of total width it should reserve for whitespace between the bars
      .paddingInner(0.04);

    const yAxis = d3Axis.axisRight(yScale).ticks(3, '.0s');
    const xAxis = d3Axis.axisBottom(xScale).tickFormat(d3TimeFormat.timeFormat('%b %Y'));

    const xAxis_g = svgContainer
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    const yAxis_g = svgContainer
      .append('g')
      .attr('class', 'y axis')
      .attr('transform', `translate(${width}, 0)`)
      .call(yAxis);

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

    const clipPath = svgContainer.append('g').attr('clip-path', `url(#clip-bar-rects)`);

    clipPath
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'url(#bg-gradient)');

    const bars = defs
      .append('clipPath')
      .attr('id', 'clip-bar-rects')
      .selectAll('.bar')
      .data(parsedData);

    bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('width', xScale.bandwidth())
      .attr('height', counter => height - yScale(counter.total))
      // the offset between each bar
      .attr('x', counter => xScale(counter.start_time))
      .attr('y', counter => yScale(counter.total));
  },
});
