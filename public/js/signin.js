import { signInUserReq, signInCheckReq } from './requests/auth.js';

const signInForm = document.querySelector('#signInForm');

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formElements = {
    signInEmail: '',
    signInPassword: ''
  };

  document.querySelectorAll('input').forEach((input) => {
    if (input.id in formElements) {
      formElements[input.id] = input.value;
    }
  });

  const formatedData = Object.entries(formElements).reduce(
    (acc, [key, value]) => {
      key = key.replace('signIn', '');
      acc[key] = value;
      return acc;
    },
    {}
  );

  const { error, redirect } = await signInUserReq(formatedData);
  if (error) {
    for (const key in formElements) {
      document.querySelector(`#${key}`).classList.remove('is-invalid');
      document.querySelector(`#${key}`).innerHTML = '';
    }
    switch (error.type) {
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

    return;
  }
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
