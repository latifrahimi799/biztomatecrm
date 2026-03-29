import { getMicrosoftAccessToken } from '../../store/microsoftAuthStore';

export async function sendMailViaGraph(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const token = await getMicrosoftAccessToken();
  if (!token) {
    throw new Error('Not connected to Microsoft. Connect in Settings first.');
  }

  const payload = {
    message: {
      subject: opts.subject,
      body: {
        contentType: 'HTML',
        content: opts.html,
      },
      toRecipients: [{ emailAddress: { address: opts.to.trim() } }],
    },
    saveToSentItems: true,
  };

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Send failed (${res.status})`);
  }
}
