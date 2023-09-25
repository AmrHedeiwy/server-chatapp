import {
  addFieldStyles,
  removeFieldStyles
} from '../interactive/fieldStyles.js';
import { normalRequest } from '../requests/normal.js';

const forgotPasswordForm = document.querySelector('#forgot-password');

const fields = ['Email'];
const inputElements = {
  Email: document.getElementById('EmailInput')
};

forgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  removeFieldStyles(fields);

  // Construct the request body
  const body = { Email: inputElements.Email.value };

  // Send request for forgot password
  const { message, error, redirect } = await normalRequest(
    '/auth/forgot-password',
    'POST',
    JSON.stringify(body)
  );

  if (redirect) return (window.location.href = redirect);

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
    }
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
  const { message } = await normalRequest('/auth/info/forgot-password', 'GET');

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
