import { sendServerRequest } from './requests/auth.js';

const signInForm = document.querySelector('#signInForm');

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formElements = {
    signInEmail: '',
    signInPassword: ''
  };

  // Reseting all the styles to its original form.
  for (const key in formElements) {
    document.querySelector(`#${key}`).classList.remove('is-invalid');
    document.querySelector(`#${key}`).innerHTML = '';
  }

  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    if (input.id in formElements) {
      formElements[input.id] = input.value;
    }
  });

  /**
   * Formating the key names
   *
   * @example { signInEmail -> Email }
   */
  const formatedData = Object.entries(formElements).reduce(
    (acc, [key, value]) => {
      // removing the word `signIn` from the key name.
      key = key.replace('signIn', '');
      acc[key] = value;
      return acc;
    },
    {}
  );

  // Send request to sign in the user
  const { error, redirect } = await sendServerRequest(
    '/auth/sign-in',
    'POST',
    formatedData
  );

  // Check for errors
  if (error) {
    switch (error.name) {
      // Showing each error based on their type
      case 'JoiValidationError':
        Object.keys(formatedData).forEach((inputKey) => {
          if (inputKey in error.details) {
            document
              .querySelector(`#signIn${inputKey}`)
              .classList.add('is-invalid');
            document.querySelector(`#${inputKey}`).innerHTML =
              error.details[inputKey];
          }
        });
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
  const { message, redirect } = await sendServerRequest(
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
