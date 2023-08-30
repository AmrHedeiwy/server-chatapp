import { sendServerRequest } from './requests/auth.js';

const forgotPasswordForm = document.querySelector('#forgot-password');

forgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.querySelector('#emailInput').value;

  // Construct the request body
  const body = { Email: email };

  // Send request for forgot password
  const { message, error, redirect } = await sendServerRequest(
    '/auth/forgot-password',
    'POST',
    body
  );

  if (redirect) return (window.location.href = redirect);

  // Check for errors
  if (error) {
    Object.entries(error.details).forEach(([key, value]) => {
      new Alert({
        type: 'error',
        message: value,
        withProgress: true
      });
    });

    return;
  }

  // Display success message if an reset password email was sent
  if (message) {
    new Alert({
      type: 'success',
      message: message,
      withProgress: true
    });
  }

  // reset the form and redirect the user if successfull.
  forgotPasswordForm.reset();
});

/**
 * This funciton is executed when the forgot-password.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if user has any flash messages and display them.
 */
(async function getInfo() {
  // Send request to retrive user information
  const { message } = await sendServerRequest(
    '/auth/info/forgot-password',
    'GET'
  );

  const { FlashMessages } = message;
  if (FlashMessages) {
    Object.entries(FlashMessages).forEach(([key, value]) => {
      new Alert({
        type: key,
        message: value,
        withProgress: true
      });
    });
  }
})();
