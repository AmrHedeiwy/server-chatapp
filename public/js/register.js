import { sendServerRequest } from './requests/auth.js';

const registerForm = document.querySelector('#registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formElements = {
    registerFirstname: '',
    registerLastname: '',
    registerUsername: '',
    registerEmail: '',
    registerPassword: '',
    registerConfirmPassword: '',
    registerTermsOfAgreement: false
  };

  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    if (input.id in formElements) {
      if (input.type === 'checkbox') {
        formElements[input.id] = input.checked;
      } else {
        formElements[input.id] = input.value;
      }
    }
  });

  // Reseting all the styles to its original form.
  for (const key in formElements) {
    document.querySelector(`#${key}`).classList.remove('is-invalid');
    document.querySelector(`#${key}`).innerHTML = '';
    document.querySelector(`#${key}Row`).style.paddingBottom = '';
  }

  /**
   * Formating the key names
   *
   * @example { registerEmail -> Email }
   */
  const formatedData = Object.entries(formElements).reduce(
    (acc, [key, value]) => {
      // removing the word `register` from the key name.
      key = key.replace('register', '');
      acc[key] = value;
      return acc;
    },
    {}
  );

  // Send request to register the user
  const { error, redirect } = await sendServerRequest(
    '/auth/register',
    'POST',
    formatedData
  );

  // Check for errors
  if (error) {
    // Showing each error based on their type
    switch (error.type) {
      case 'ValidationError':
        Object.keys(formatedData).forEach((inputKey) => {
          if (inputKey in error.details) {
            document
              .querySelector(`#register${inputKey}`)
              .classList.add('is-invalid');

            document.querySelector(`#${inputKey}`).innerHTML =
              error.details[inputKey];

            // Calculate the height of the error message
            const errorHeight = document
              .querySelector(`#${inputKey}`)
              .getBoundingClientRect().height;

            // Add padding to the input container based on the height of the error message
            document.querySelector(
              `#register${inputKey}Row`
            ).style.paddingBottom = errorHeight + 'px';
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

  // reset the form and redirect the user if successfull.
  registerForm.reset();
  window.location.href = redirect;
});
