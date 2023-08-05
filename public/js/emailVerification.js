import {
  emailVerificationCheckReq,
  emailVerificationReq
} from './requests/auth.js';

const emailVerificationCodeForm = document.querySelector(
  '#emailVerificationCode'
);

const emailDisplay = document.querySelector('#email');

emailVerificationCodeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let verificationCode = '';

  // Getting the values of the fields
  document.querySelectorAll('input').forEach((input) => {
    verificationCode += input.value;
  });

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const response = await emailVerificationReq(token, verificationCode);
  if (response?.redirected) {
    return (window.location.href = response.url);
  }

  const flashMessages = await response.json();
  if (flashMessages?.details) {
    new Alert({
      type: 'error',
      message: flashMessages.details.message,
      withProgress: true
    });
  }
});

async function checkInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const response = await emailVerificationCheckReq(token);
  if (response.redirected) {
    return (window.location.href = response.url);
  }
  const { Email, FlashMessages } = await response.json();
  emailDisplay.innerHTML = Email;

  if (FlashMessages) {
    Object.entries(FlashMessages).forEach(([key, value]) => {
      new Alert({
        type: key,
        message: value,
        withProgress: true
      });
    });
  }
}

checkInfo();
