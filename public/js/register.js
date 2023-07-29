import { registerUserReq } from './requests/auth.js';

const registerForm = document.querySelector('#registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formElements = {
    registerFirstname: '',
    registerLastname: '',
    registerUsername: '',
    registerEmail: '',
    registerPassword: '',
    registerRepeatPassword: '',
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
    console.log(document.querySelector(`#${key}Row`));
    document.querySelector(`#${key}Row`).style.paddingBottom = '';
  }
  // Formating
  const formatedData = Object.entries(formElements).reduce(
    (acc, [key, value]) => {
      key = key.replace('register', '');
      acc[key] = value;
      return acc;
    },
    {}
  );

  const { error, redirect } = await registerUserReq(formatedData);
  console.log(error);

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

    return;
  }
  registerForm.reset();
  window.location.href = redirect;
});
