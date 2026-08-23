import { useState, type FormEvent } from 'react';
import { apiClient, ApiError } from '../api/client';
import { notifyContactMessage } from '../lib/web3forms';

type ContactStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ContactPage() {
  const [status, setStatus] = useState<ContactStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      message: String(form.get('message') ?? ''),
    };

    setStatus('sending');
    try {
      // 1) O backend e a fonte da verdade: a mensagem precisa estar salva.
      await apiClient.post('/contact', payload);

      // 2) Só então o alerta por e-mail, em fire-and-forget. A mensagem já está
      //    persistida, então uma falha do Web3Forms não pode virar erro na tela.
      void notifyContactMessage(payload).catch((notificationError) => {
        console.error('Falha ao notificar a equipe por e-mail:', notificationError);
      });

      setStatus('sent');
      formElement.reset();
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro inesperado.');
    }
  }

  return (
    <div>
      <h1>Contato</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Nome
          <input name="name" type="text" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Mensagem
          <textarea name="message" required />
        </label>
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Enviar'}
        </button>
        {status === 'sent' && <p>Mensagem enviada com sucesso.</p>}
        {status === 'error' && <p role="alert">{errorMessage}</p>}
      </form>
    </div>
  );
}
