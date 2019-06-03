import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

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

module('Integration | Component | http-requests-bar-chart', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.set('counters', COUNTERS);
  });

  test('it renders', async function(assert) {
    await render(hbs`<HttpRequestsBarChart @counters={{counters}}/>`);

    assert.dom('.http-requests-bar-chart').exists();
  });
});
