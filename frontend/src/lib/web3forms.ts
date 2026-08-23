/**
 * Cliente Web3Forms (https://web3forms.com): notificação por e-mail disparada
 * do browser, depois que o backend já persistiu o dado.
 *
 * Por que no browser e não no servidor: no plano free, chamada server-side
 * costuma voltar 403. A access key é pública por design (vai no bundle Vite) —
 * proteja com **domain lock** e rate limit no painel do Web3Forms.
 *
 * O dado oficial é o que o backend salvou; o e-mail é só alerta interno. Por
 * isso o padrão de uso é fire-and-forget (`void notify(...).catch(...)`):
 * falha de e-mail nunca pode derrubar o sucesso do formulário para o usuário.
 */

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const REQUEST_TIMEOUT_MS = 15_000;

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();

type EmailField = string | number | boolean;

type Web3FormsResponse = {
  success?: boolean;
  message?: string;
};

function formatNow(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

/**
 * Envio genérico. Sem access key configurada não lança: apenas avisa no console
 * e retorna — assim o ambiente local funciona sem conta no Web3Forms.
 */
export async function submitNotification(
  subject: string,
  replyTo: string,
  fields: Record<string, EmailField>,
  options?: { fromName?: string },
): Promise<void> {
  if (!ACCESS_KEY) {
    console.warn('VITE_WEB3FORMS_ACCESS_KEY ausente: notificação por e-mail não enviada.');
    return;
  }

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      access_key: ACCESS_KEY,
      subject,
      from_name: options?.fromName ?? 'Boilerplate LP — Notificação',
      replyto: replyTo,
      ...fields,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const result = (await response.json().catch(() => ({}))) as Web3FormsResponse;
  if (!response.ok || result.success !== true) {
    throw new Error(
      `Web3Forms recusou a notificação (${response.status}): ${result.message ?? 'sem detalhes'}`,
    );
  }
}

export type ContactNotificationInput = {
  name: string;
  email: string;
  message: string;
};

/**
 * Notificação do formulário de contato. Duplique este helper (ajustando campos
 * e assunto) para cada formulário novo do projeto.
 */
export async function notifyContactMessage(contact: ContactNotificationInput): Promise<void> {
  await submitNotification(`[Contato] ${contact.name}`, contact.email, {
    'Tipo de formulário': 'Mensagem de contato',
    Nome: contact.name,
    'E-mail': contact.email,
    Mensagem: contact.message.trim() || 'Não informada',
    'Recebido em': formatNow(),
  });
}
