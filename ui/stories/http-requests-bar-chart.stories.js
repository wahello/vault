/* eslint-disable import/extensions */
import hbs from 'htmlbars-inline-precompile';
import { storiesOf } from '@storybook/ember';
import notes from './http-requests-bar-chart.md';


storiesOf('HttpRequests/BarChart/', module)
  .addParameters({ options: { showPanel: true } })
  .add(`HttpRequestsBarChart`, () => ({
    template: hbs`
        <h5 class="title is-5">Http Requests Bar Chart</h5>
        <HttpRequestsBarChart @counters={{counters}}/>
    `,
    context: {
      counters: [
        {
          start_time: '2019-03-01T00:00:00Z',
          total: 5500,
        },
        {
          start_time: '2019-04-01T00:00:00Z',
          total: 4500,
        },
        {
          start_time: '2019-05-01T00:00:00Z',
          total: 5000,
        },
      ]
    },
  }),
  {notes}
);
