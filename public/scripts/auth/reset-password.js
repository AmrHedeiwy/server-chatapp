import {
  addFieldStyles,
  removeFieldStyles
} from '../interactive/fieldStyles.js';
import { normalRequest } from '../requests/normal.js';

const resetForgotPasswordForm = document.querySelector('#reset-password');

const fields = ['Password', 'ConfirmPassword'];
const inputFields = {
  Password: document.getElementById('PasswordInput'),
  ConfirmPassword: document.getElementById('ConfirmPasswordInput')
};

resetForgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  removeFieldStyles(fields);

  // Extract the token from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const Token = urlParams.get('token');

  // Construct the request body
  const body = {
    Token,
    NewPassword: inputFields.Password.value,
    ConfirmPassword: inputFields.ConfirmPassword.value
  };

  // Send request to reset the user's password
  const { redirect, error } = await normalRequest(
    '/auth/reset-password',
    'POST',
    JSON.stringify(body)
  );

  // Check for errors
  if (error) {
    // Showing each error based on their name
    switch (error.type) {
      case 'ValidationError':
        addFieldStyles(fields, error);
        break;
      default:
        new Alert({
          type: 'error',
          message: error.details.message,
          withProgress: true
        });
        break;
    }

    // return nothing to stop the rest of the funciton from executing
    return;
  }

  if (redirect) {
    window.location.href = redirect;
  }

  // reset the form if successfull.
  resetForgotPasswordForm.reset();
});

/**
 * This funciton is executed when the reset-password.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if the user made a request to reset their password and redirect them back
 * to the sign-in.html page if not.
 */
(async function getInfo() {
  // Send request to retrive user information
  const { redirect } = await normalRequest('/auth/info/reset-password', 'GET');

  if (redirect) {
    return (window.location.href = redirect);
  }
})();
