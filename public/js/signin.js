import { signInUserReq, signInCheckReq } from './requests/auth.js';

const signInForm = document.querySelector('#signInForm');

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formElements = {
    signInEmail: '',
    signInPassword: ''
  };

  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    if (input.id in formElements) {
      formElements[input.id] = input.value;
    }
  });

  // Reseting all the styles to its original form.
  for (const key in formElements) {
    document.querySelector(`#${key}`).classList.remove('is-invalid');
    document.querySelector(`#${key}`).innerHTML = '';
  }

  // Formating the key names
  const formatedData = Object.entries(formElements).reduce(
    (acc, [key, value]) => {
      // removing the word `signIn` from the key name.
      key = key.replace('signIn', '');
      acc[key] = value;
      return acc;
    },
    {}
  );

  // Make the sign in request to the server
  const { error, redirect } = await signInUserReq(formatedData);

  // Check for errors
  if (error) {
    switch (error.type) {
      // Showing each error based on their type
      case 'ValidationError':
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
          withProgress: true
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

async function checkInfo() {
  const response = await signInCheckReq();
  if (response.redirected) {
    return (window.location.href = response.url);
  }
  const flashMessages = await response.json();
  if (flashMessages) {
    Object.entries(flashMessages).forEach(([key, value]) => {
      new Alert({
        type: key,
        message: value,
        withProgress: true
      });
    });
  }
}

checkInfo();
