import { expect } from 'chai';
import { fakeServer, SinonFakeServer } from 'sinon';

import { Status, Transports } from '../../../src';

const testDsn = 'https://123@sentry.io/42';
const transportUrl = 'https://sentry.io/api/42/store/?sentry_key=123&sentry_version=7';
const payload = {
  event_id: '1337',
  message: 'Pickle Rick',
  user: {
    username: 'Morty',
  },
};

let server: SinonFakeServer;
let transport: Transports.BaseTransport;

describe('XHRTransport', () => {
  beforeEach(() => {
    server = fakeServer.create();
    server.respondImmediately = true;
    transport = new Transports.XHRTransport({ dsn: testDsn });
  });

  afterEach(() => {
    server.restore();
  });

  it('inherits composeEndpointUrl() implementation', () => {
    expect(transport.url).equal(transportUrl);
  });

  describe('sendEvent()', async () => {
    it('sends a request to Sentry servers', async () => {
      server.respondWith('POST', transportUrl, [200, {}, '']);

      return transport.sendEvent(payload).then(res => {
        expect(res.status).equal(Status.Success);
        const request = server.requests[0];
        expect(server.requests.length).equal(1);
        expect(request.method).equal('POST');
        expect(JSON.parse(request.requestBody)).deep.equal(payload);
      });
    });

    it('rejects with non-200 status code', done => {
      server.respondWith('POST', transportUrl, [403, {}, '']);

      transport.sendEvent(payload).catch(res => {
        expect(res.status).equal(403);

        const request = server.requests[0];
        expect(server.requests.length).equal(1);
        expect(request.method).equal('POST');
        expect(JSON.parse(request.requestBody)).deep.equal(payload);
        done();
      });
    });
  });
});
