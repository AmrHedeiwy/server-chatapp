import { sendServerRequest } from './requests/auth.js';

const resetForgotPasswordForm = document.querySelector('#reset-password');

resetForgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formElements = {
    Password: '',
    ConfirmPassword: ''
  };

  // Reseting all the styles to its original form.
  for (const key in formElements) {
    document.querySelector(`#${key}`).classList.remove('is-invalid');
    document.querySelector(`#${key}`).innerHTML = '';
    document.querySelector(`#${key}Row`).style.paddingBottom = '';
  }
  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    if (input.id in formElements) {
      formElements[input.id] = input.value;
    }
  });

  // Extract the token from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const Token = urlParams.get('token');

  // Construct the request body
  const body = {
    Token,
    NewPassword: formElements.Password,
    ConfirmPassword: formElements.ConfirmPassword
  };

  // Send request to reset the user's password
  const { redirect, error } = await sendServerRequest(
    '/auth/reset-password',
    'POST',
    body
  );

  // Check for errors
  if (error) {
    // Showing each error based on their type
    switch (error.type) {
      case 'ValidationError':
        Object.keys(formElements).forEach((inputKey) => {
          if (inputKey in error.details) {
            document.querySelector(`#${inputKey}`).classList.add('is-invalid');

            console.log(error.details[inputKey]);
            document.querySelector(`#${inputKey}Feedback`).innerHTML =
              error.details[inputKey];

            // Calculate the height of the error message
            const errorHeight = document
              .querySelector(`#${inputKey}Feedback`)
              .getBoundingClientRect().height;

            // Add padding to the input container based on the height of the error message
            document.querySelector(`#${inputKey}Row`).style.paddingBottom =
              errorHeight + 'px';
          }
        });
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
  const { redirect } = await sendServerRequest(
    '/auth/info/reset-password',
    'GET'
  );

  if (redirect) {
    return (window.location.href = redirect);
  }
})();
