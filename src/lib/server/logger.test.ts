import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger';

function capture() {
	const lines: string[] = [];
	const destination = new Writable({
		write(chunk: Buffer, _encoding, done) {
			lines.push(chunk.toString());
			done();
		}
	});
	return { lines, log: createLogger(destination) };
}

describe('createLogger', () => {
	it('writes one JSON line per entry', () => {
		const { lines, log } = capture();

		log.info({ route: '/' }, 'hello');

		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? '')).toMatchObject({ level: 30, route: '/', msg: 'hello' });
	});

	it('redacts a store failure carrying a sid and a token in the client error command', () => {
		const sid = 'SID-abcdefghijklmnopqrstuvwxyz0123456789ABC';
		const token = 'TOKEN-secret-value';
		const { lines, log } = capture();
		const clientError = Object.assign(new Error('connection lost'), {
			command: { name: 'set', args: [`workspace:session:${sid}`, JSON.stringify({ token })] }
		});

		log.error({ err: clientError, sid, token }, 'store failed');

		const output = lines.join('');
		expect(output).not.toContain(sid);
		expect(output).not.toContain(token);
		expect(JSON.parse(output)).toMatchObject({ sid: '***', token: '***', err: { command: '***' } });
	});

	it('redacts cookie, authorization and set-cookie headers at the top and one level down', () => {
		const { lines, log } = capture();

		log.info(
			{
				req: { headers: { cookie: 'sid=1', authorization: 'Bearer 2', accept: 'text/html' } },
				request: { headers: { cookie: 'sid=3', authorization: 'Bearer 4' } },
				response: { headers: { 'set-cookie': 'sid=5' } },
				nested: { err: { command: { args: ['sid-6'] } }, user: { token: 'tok-7', sid: 'sid-8' } }
			},
			'x'
		);

		const entry: unknown = JSON.parse(lines[0] ?? '');
		expect(entry).toMatchObject({
			req: { headers: { cookie: '***', authorization: '***', accept: 'text/html' } },
			request: { headers: { cookie: '***', authorization: '***' } },
			response: { headers: { 'set-cookie': '***' } },
			nested: { err: { command: '***' } }
		});
		expect(lines[0]).not.toMatch(/sid=|Bearer|sid-6/);
	});
});
