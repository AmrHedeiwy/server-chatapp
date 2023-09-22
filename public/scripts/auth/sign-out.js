import { sendAuthRequest } from '../requests/auth.js';

async function signOut() {
  const { error, redirect } = await sendAuthRequest('/auth/sign-out', 'POST');

  if (error) {
    new Alert({
      type: 'error',
      message: error.details.message,
      withProgress: true,
      duration: 7
    });
    return;
  }

  if (redirect) window.location.href = redirect;
}

window.signOut = signOut;
