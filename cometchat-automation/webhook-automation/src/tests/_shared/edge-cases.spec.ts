import { test, expect } from '@playwright/test';
import { sendMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, assertNoWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { fillerText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { timestampToken } from '../../utils/id-generator';

test.beforeEach(async () => {
  await resetEvents();
});

test('unicode and emoji text round-trips byte-for-byte through the webhook', async () => {
  const text = `héllo 世界 🚀🔥 مرحبا Здравствуй ${timestampToken()}`;

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));

  expect(payload.data.message.data.text).toBe(text);
});

test('special/HTML-like characters are preserved exactly, not escaped or stripped', async () => {
  const text = `<script>alert('x')</script> "quotes" 'apos' \\backslash\\ & ampersand ${timestampToken()}`;

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));

  expect(payload.data.message.data.text).toBe(text);
});

test('a large but valid message (9000 chars, under the 10KB data cap) is delivered intact', async () => {
  const text = `${timestampToken()}-` + fillerText(9000);

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));

  expect(payload.data.message.data.text).toBe(text);
  expect(payload.data.message.data.text.length).toBe(text.length);
});

test('an oversized message (70000 chars, over the payload cap) is rejected and fires no webhook', async () => {
  const text = `${timestampToken()}-` + fillerText(70000);

  await expect(sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text })).rejects.toThrow(/400/);

  await assertNoWebhookEvent('message_sent', (p) => p?.data?.message?.data?.text === text);
});

test('rapid consecutive messages each produce their own distinct, correctly-matched webhook', async () => {
  const stamp = timestampToken();
  const texts = [`rapid-1-${stamp}`, `rapid-2-${stamp}`, `rapid-3-${stamp}`];

  // Fire all three with no delay between them — this is the scenario most
  // likely to expose lost events or id mix-ups if the receiver or the
  // matching logic has a race condition.
  const messages = await Promise.all(texts.map((text) => sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text })));

  expect(new Set(messages.map((m: any) => m.id)).size).toBe(3); // sanity: 3 distinct message ids from CometChat itself

  for (let i = 0; i < messages.length; i++) {
    const payload = await expectWebhookEvent('message_sent', matchers.byMessageId(messages[i].id));
    expect(payload.data.message.data.text).toBe(texts[i]);
  }
});
