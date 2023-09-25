import {
  addFieldStyles,
  removeFieldStyles
} from '../interactive/fieldStyles.js';
import { normalRequest } from '../requests/normal.js';

const registerForm = document.querySelector('#registerForm');

const fields = [
  'Firstname',
  'Lastname',
  'Username',
  'Email',
  'Password',
  'ConfirmPassword',
  'TermsOfAgreement'
];

const inputFields = {
  Firstname: document.querySelector('#FirstnameInput'),
  Lastname: document.querySelector('#LastnameInput'),
  Username: document.querySelector('#UsernameInput'),
  Email: document.querySelector('#EmailInput'),
  Password: document.querySelector('#PasswordInput'),
  ConfirmPassword: document.querySelector('#ConfirmPasswordInput'),
  TermsOfAgreement: document.querySelector('#TermsOfAgreementInput')
};

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  removeFieldStyles(fields);

  const body = JSON.stringify({
    Firstname: inputFields.Firstname.value,
    Lastname: inputFields.Lastname.value,
    Username: inputFields.Username.value,
    Email: inputFields.Email.value,
    Password: inputFields.Password.value,
    ConfirmPassword: inputFields.ConfirmPassword.value,
    TermsOfAgreement: inputFields.TermsOfAgreement.checked
  });

  // Send request to register the user
  const { error, redirect } = await normalRequest(
    '/auth/register',
    'POST',
    body
  );

  // Check for errors
  if (error) {
    // Showing each error based on their name
    switch (error.name) {
      case 'JoiValidationError':
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

    return;
  }

  // reset the form and redirect the user if successfull.
  registerForm.reset();
  window.location.href = redirect;
});

(async function getInfo() {
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
