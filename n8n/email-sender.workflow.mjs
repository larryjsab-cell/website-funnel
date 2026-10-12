// Generates n8n Workflow SDK code for "Ryzon Landing – Email sender".
// Tokens come from the environment so they never land in the repo:
//   RYZON_EDGE_TOKEN=... RYZON_HOOK_TOKEN=... node n8n/email-sender.workflow.mjs > out.js
// (values: ryzon_landing_config keys edge_token and n8n_hook_token in Supabase).
import fs from "node:fs";

const EDGE_URL = "https://woejhqidgykrcdyktuio.supabase.co/functions/v1/ryzon-landing";
const EDGE_TOKEN = process.env.RYZON_EDGE_TOKEN;
const HOOK_TOKEN = process.env.RYZON_HOOK_TOKEN;
if (!EDGE_TOKEN || !HOOK_TOKEN) throw new Error("Set RYZON_EDGE_TOKEN and RYZON_HOOK_TOKEN");
const GMAIL = "{ gmailOAuth2: { id: 'qVRhjju5qRvvHEk0', name: 'Gmail account 2' } }";
const buildMime = fs.readFileSync(new URL("./build-mime.js", import.meta.url), "utf8");

const edgeHeaders = `{ parameters: [{ name: 'x-ryzon-token', value: ${JSON.stringify(EDGE_TOKEN)} }] }`;

const code = `import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const signal = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Emails Due Signal From Supabase',
    position: [0, 0],
    parameters: {
      httpMethod: 'POST',
      path: 'ryzon-landing-send',
      authentication: 'none',
      responseMode: 'onReceived',
      options: { noResponseBody: true, onlyRunIf: expr(${JSON.stringify(`{{ $json.headers["x-ryzon-hook"] === "${HOOK_TOKEN}" }}`)}) }
    }
  },
  output: [{ headers: { 'x-ryzon-hook': 'token' }, body: { source: 'supabase' } }]
});

const getSender = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Get Sender Address',
    position: [240, 0],
    parameters: {
      method: 'GET',
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      options: { timeout: 15000 }
    },
    credentials: ${GMAIL},
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000
  },
  output: [{ emailAddress: 'owner@gmail.com', messagesTotal: 1 }]
});

const claim = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Claim Due Emails',
    position: [480, 0],
    parameters: {
      method: 'POST',
      url: ${JSON.stringify(EDGE_URL)},
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: ${edgeHeaders},
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: '{"action":"claim_due","limit":25}',
      options: { timeout: 20000 }
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000
  },
  output: [{ emails: [{ queue_id: 1, template_key: 'request_received', to_email: 'customer@example.com', reply_to: 'owner@example.com', from_name: 'Ryzon Automation', subject: 'Subject', html: '<p>Hi</p>', text_body: 'Hi' }] }]
});

const splitEmails = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: { name: 'One Item Per Email', position: [720, 0], parameters: { fieldToSplitOut: 'emails', include: 'noOtherFields' } },
  output: [{ queue_id: 1, template_key: 'request_received', to_email: 'customer@example.com', reply_to: 'owner@example.com', from_name: 'Ryzon Automation', subject: 'Subject', html: '<p>Hi</p>', text_body: 'Hi' }]
});

const mime = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build MIME Message',
    position: [960, 0],
    parameters: { mode: 'runOnceForEachItem', language: 'javaScript', jsCode: ${JSON.stringify(buildMime)} }
  },
  output: [{ queue_id: 1, template_key: 'request_received', to_email: 'customer@example.com', raw: 'RnJvbTo' }]
});

const send = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Send With Gmail',
    position: [1200, 0],
    onError: 'continueErrorOutput',
    parameters: {
      method: 'POST',
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ raw: $json.raw }) }}'),
      options: { timeout: 30000, batching: { batch: { batchSize: 5, batchInterval: 1000 } } }
    },
    credentials: ${GMAIL}
  },
  output: [{ id: 'msg_1', threadId: 'th_1', labelIds: ['SENT'] }]
});

const markSent = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Mark Sent',
    position: [1440, -100],
    parameters: {
      method: 'POST',
      url: ${JSON.stringify(EDGE_URL)},
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: ${edgeHeaders},
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ action: "mark_sent", queue_id: $("Build MIME Message").item.json.queue_id, message_id: $json.id }) }}'),
      options: { timeout: 15000 }
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000
  },
  output: [{ ok: true }]
});

const markFailed = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Mark Failed (Retries In 10 Min)',
    position: [1440, 100],
    parameters: {
      method: 'POST',
      url: ${JSON.stringify(EDGE_URL)},
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: ${edgeHeaders},
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ action: "mark_failed", queue_id: $("Build MIME Message").item.json.queue_id, error: String(($json.error && ($json.error.message || $json.error)) || $json.message || "Gmail send failed").slice(0, 900) }) }}'),
      options: { timeout: 15000 }
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000
  },
  output: [{ ok: true }]
});

const note = sticky('## Ryzon Landing – Email sender\\nSupabase decides what is due (10 AM local schedules, offers, cancellations, pauses) and calls this webhook the moment an email is ready, plus once a minute for scheduled ones. This workflow only sends: it claims rendered emails, sends each through Gmail with HTML and plain-text parts, then marks it sent. A failed send retries after 10 minutes, up to 3 tries.', [signal, getSender, claim, splitEmails], { color: 5 });

export default workflow('ryzon-landing-email-sender', 'Ryzon Landing – Email sender')
  .add(signal)
  .to(getSender)
  .to(claim)
  .to(splitEmails)
  .to(mime)
  .to(send.onError(markFailed))
  .to(markSent)
  .add(note)
  .group('Send each email', [mime, send, markSent, markFailed], { description: 'Builds the HTML + plain-text message, sends it with Gmail and marks it sent in Supabase' });
`;
process.stdout.write(code);
