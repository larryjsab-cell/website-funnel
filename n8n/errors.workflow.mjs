// Generates n8n Workflow SDK code for "Ryzon Landing – Errors".
// Usage: node n8n/errors.workflow.mjs > out.js, then validate/create with the n8n MCP tools.
const ADMIN = process.env.RYZON_ADMIN_EMAIL || "larryjsab@gmail.com";

const throttle = `// One alert per workflow and failing node per hour, so a broken credential
// doesn't flood the inbox while the database keeps retrying every minute.
const seen = $getWorkflowStaticData('global');
const input = $input.first().json;
const wf = input.workflow || {};
const ex = input.execution || {};
const key = (wf.id || 'unknown') + ':' + (ex.lastNodeExecuted || '');
const now = Date.now();
if (seen[key] && now - seen[key] < 60 * 60 * 1000) return [];
seen[key] = now;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const message = (ex.error && (ex.error.message || ex.error.description)) || 'Unknown error';
const rows = [
  ['Workflow', wf.name], ['Failed step', ex.lastNodeExecuted], ['Error', message], ['When', new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' }) + ' Detroit time'],
];
const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0B1220;">' +
  '<p style="font-size:18px;font-weight:700;">An automation step failed</p>' +
  rows.map((r) => '<p><strong>' + r[0] + ':</strong> ' + esc(r[1]) + '</p>').join('') +
  (ex.url ? '<p><a href="' + esc(ex.url) + '">Open the failed run in n8n</a></p>' : '') +
  '<p style="color:#4A5568;font-size:13px;">Queued emails are not lost: they stay in the queue and send once the problem is fixed. You will get at most one alert per hour for the same failure.</p></div>';
return [{ json: { subject: 'Automation error: ' + (wf.name || 'n8n workflow'), html } }];`;

const code = `import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const onError = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'When A Ryzon Workflow Fails', position: [0, 0] },
  output: [{ execution: { id: '1', url: 'https://ryzonmedia.app.n8n.cloud/workflow/x/executions/1', lastNodeExecuted: 'Claim Due Emails', error: { message: 'Request failed' } }, workflow: { id: 'x', name: 'Ryzon Landing – Email sender' } }]
});

const buildAlert = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Alert (Max 1 Per Hour)',
    position: [260, 0],
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(throttle)} }
  },
  output: [{ subject: 'Automation error: Ryzon Landing – Email sender', html: '<p>An automation step failed</p>' }]
});

const emailOwner = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email The Owner',
    position: [520, 0],
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: ${JSON.stringify(ADMIN)},
      subject: expr('{{ $json.subject }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false, senderName: 'Ryzon Pipeline' }
    },
    credentials: { gmailOAuth2: { id: 'qVRhjju5qRvvHEk0', name: 'Gmail account 2' } }
  },
  output: [{ id: 'msg_1', threadId: 'th_1' }]
});

const note = sticky('## Ryzon Landing – Errors\\nSet as the error workflow for every Ryzon Landing workflow. Emails the owner when a run fails, at most once an hour per failing step. Emails waiting in Supabase are never dropped: they send on the next successful run.', [onError, buildAlert, emailOwner], { color: 5 });

export default workflow('ryzon-landing-errors', 'Ryzon Landing – Errors')
  .add(onError)
  .to(buildAlert)
  .to(emailOwner)
  .add(note);
`;
process.stdout.write(code);
