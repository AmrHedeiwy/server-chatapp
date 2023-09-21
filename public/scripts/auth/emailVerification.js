import { sendServerRequest } from '../requests/auth.js';

const emailVerificationCodeForm = document.querySelector(
  '#emailVerificationCode'
);
const resendEmail = document.querySelector('#resend-email');

const name = document.querySelector('#firstname');

const email = document.querySelector('#email');

emailVerificationCodeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let verificationCode = '';

  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    verificationCode += input.value;
  });

  // Construct the request body
  const body = { VerificationCode: verificationCode };

  // Send request to verify the verification code
  const { error, redirect } = await sendServerRequest(
    '/auth/verify-email',
    'POST',
    body
  );

  if (redirect) {
    return (window.location.href = redirect);
  }

  if (error) {
    new Alert({
      type: 'error',
      message: error.details.message,
      withProgress: true
    });
    return;
  }

  // reset the form and redirect the user if successfull.
  emailVerificationCodeForm.reset();
});

resendEmail.addEventListener('click', async (e) => {
  e.preventDefault();

  // Construct the request body
  const body = { Firstname: name.innerHTML, Email: email.innerHTML };

  // Send request to resend the verification code
  const { message, error } = await sendServerRequest(
    '/auth/request-email-verification',
    'POST',
    body
  );

  // Display any success messages
  if (message) {
    new Alert({
      type: 'success',
      message: message,
      withProgress: true
    });
    return;
  }

  if (error) {
    new Alert({
      type: 'error',
      message: error.details.message,
      withProgress: true
    });
  }
});

/**
 * This funciton is executed when the email-verificaiton.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if the user needs email verification and redirect them back
 * to the sign-in.html page if not.
 * 2. Display the masked email and the first name of the user in the page.
 * 3. Check if user has any flash messages and display them.
 */
(async function getInfo() {
  // Send request to retrive user information
  const { message, redirect } = await sendServerRequest(
    `/auth/info/email-verification`,
    'GET'
  );

  if (redirect) {
    return (window.location.href = redirect);
  }

  const { Email, Firstname, FlashMessages } = message;
  email.innerHTML = Email;
  name.innerHTML = Firstname;

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
