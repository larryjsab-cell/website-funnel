const sender = $('Get Sender Address').first().json.emailAddress;
const b64 = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('base64');
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const word = (s) => {
  const chars = Array.from(s);
  const parts = [];
  for (let i = 0; i < chars.length; i += 30) parts.push('=?UTF-8?B?' + b64(chars.slice(i, i + 30).join('')) + '?=');
  return parts.join('\r\n ') || '""';
};
const clean = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
const boundary = 'rz_' + $json.queue_id + '_' + Date.now().toString(36);
const headers = [
  'From: ' + word(clean($json.from_name)) + ' <' + sender + '>',
  'To: ' + clean($json.to_email),
  $json.reply_to ? 'Reply-To: ' + clean($json.reply_to) : null,
  'Subject: ' + word(clean($json.subject)),
  'MIME-Version: 1.0',
  'Content-Type: multipart/alternative; boundary="' + boundary + '"',
].filter(Boolean);
const mime = headers.join('\r\n') + '\r\n\r\n' +
  '--' + boundary + '\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + wrap(b64($json.text_body)) +
  '--' + boundary + '\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + wrap(b64($json.html)) +
  '--' + boundary + '--\r\n';
const raw = Buffer.from(mime, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
return { json: { queue_id: $json.queue_id, template_key: $json.template_key, to_email: $json.to_email, raw } };
