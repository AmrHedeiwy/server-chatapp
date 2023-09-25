import {
  addFieldStyles,
  removeFieldStyles
} from '../interactive/fieldStyles.js';
import { normalRequest } from '../requests/normal.js';

const signInForm = document.querySelector('#signInForm');

const fields = ['Email', 'Password'];
const inputFields = {
  Email: document.getElementById('EmailInput'),
  Password: document.getElementById('PasswordInput')
};

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  removeFieldStyles(fields);

  const body = {
    Email: inputFields.Email.value,
    Password: inputFields.Password.value
  };

  // Send request to sign in the user
  const { error, redirect } = await normalRequest(
    '/auth/sign-in',
    'POST',
    JSON.stringify(body)
  );

  // Check for errors
  if (error) {
    switch (error.name) {
      // Showing each error based on their name
      case 'JoiValidationError':
        addFieldStyles(fields, error);
        break;
      default:
        new Alert({
          type: 'error',
          message: error.details.message,
          withProgress: true,
          duration: 7
        });
        break;
    }
    // return nothing to stop the rest of the funciton from executing
    return;
  }

  // reset the form and redirect the user if successfull.
  signInForm.reset();
  window.location.href = redirect;
});

/**
 * This funciton is executed when the reset-password.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if they are aleady signed in and redirect them to their profile if so.
 * 2. Check if user has any flash messages and display them.
 */
(async function getInfo() {
  // Send request to retrive user information
  const { message, redirect } = await normalRequest(
    '/auth/info/sign-in',
    'GET'
  );

  if (redirect) {
    return (window.location.href = redirect);
  }
  if (message) {
    Object.entries(message).forEach(([type, message]) => {
      new Alert({
        type: type,
        message: message,
        withProgress: true
      });
    });
  }
})();
