import { normalRequest } from '../requests/normal.js';

const emailVerificationCodeForm = document.getElementById(
  'emailVerificationCodeForm'
);

const displayElements = {
  Firstname: document.getElementById('FirstnameDisplay'),
  Email: document.getElementById('EmailDisplay')
};

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
  const { error, redirect } = await normalRequest(
    '/auth/verify-email',
    'POST',
    JSON.stringify(body)
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

async function resendVerificationCode() {
  // Send request to resend the verification code
  const { message, error } = await normalRequest(
    '/auth/request-email-verification',
    'POST'
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
}

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
  const { message, redirect } = await normalRequest(
    `/auth/info/email-verification`,
    'GET'
  );

  if (redirect) {
    return (window.location.href = redirect);
  }

  const { Email, Firstname, FlashMessages } = message;
  displayElements.Firstname.innerHTML = Firstname;
  displayElements.Email.innerHTML = Email;

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

window.resendVerificationCode = resendVerificationCode;
