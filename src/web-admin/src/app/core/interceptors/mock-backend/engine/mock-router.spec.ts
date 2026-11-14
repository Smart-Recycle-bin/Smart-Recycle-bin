import { describe, it, expect } from 'vitest';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { MockRouter } from './mock-router';

describe('MockRouter', () => {
  it('registers and matches GET route with path parameters', () => {
    const router = new MockRouter();
    router.get('/api/v1/bins/:id', (ctx) => {
      return new HttpResponse({
        status: 200,
        body: { id: ctx.params['id'], queryStatus: ctx.query.get('status') },
      });
    });

    const req = new HttpRequest('GET', '/api/v1/bins/bin_123?status=active');
    const matched = router.match(req);

    expect(matched).not.toBeNull();
    expect(matched?.context.params['id']).toBe('bin_123');
    expect(matched?.context.query.get('status')).toBe('active');
  });

  it('differentiates HTTP methods for the same path', () => {
    const router = new MockRouter();
    router.get('/api/v1/collectors', () => new HttpResponse({ status: 200, body: 'GET' }));
    router.post('/api/v1/collectors', () => new HttpResponse({ status: 201, body: 'POST' }));

    const getReq = new HttpRequest('GET', '/api/v1/collectors');
    const postReq = new HttpRequest('POST', '/api/v1/collectors', {});
    const putReq = new HttpRequest('PUT', '/api/v1/collectors', {});

    const getMatch = router.match(getReq);
    const postMatch = router.match(postReq);
    const putMatch = router.match(putReq);

    expect(getMatch).not.toBeNull();
    expect(postMatch).not.toBeNull();
    expect(putMatch).toBeNull();
  });

  it('executes handler and returns observable response', () => {
    const router = new MockRouter();
    router.get('/api/v1/test', () => new HttpResponse({ status: 200, body: { ok: true } }));

    const req = new HttpRequest('GET', '/api/v1/test');
    let responseBody: unknown = null;

    router.execute(req)?.subscribe((res) => {
      if (res instanceof HttpResponse) {
        responseBody = res.body;
      }
    });

    expect(responseBody).toEqual({ ok: true });
  });

  it('catches thrown error in handler and converts to 500 HttpErrorResponse', () => {
    const router = new MockRouter();
    router.get('/api/v1/crash', () => {
      throw new Error('Something broke');
    });

    const req = new HttpRequest('GET', '/api/v1/crash');
    let errorStatus = 0;

    router.execute(req)?.subscribe((res) => {
      errorStatus = res.status;
    });

    expect(errorStatus).toBe(500);
  });
});
