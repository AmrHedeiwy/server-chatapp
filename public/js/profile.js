import { sendServerRequest } from './requests/auth.js';

let editProfile = document.querySelector('#edit-profile');
let pfp = document.querySelector('#pfp');

/**
 * This funciton is executed when the profile.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if the user needs email verification and redirect them back
 * to the sign-in.html page if not.
 * 2. Display the masked email and the first name of the user in the page.
 * 3. Check if user has any flash messages and display them.
 */
async function getInfo() {
  // Send request to retrive user information
  const { redirect, message } = await sendServerRequest(`/profile/view`, 'GET');

  if (redirect) {
    return (window.location.href = redirect);
  }

  message.GoogleID || message.FacebookID
    ? (editProfile.style.display = 'none')
    : (editProfile.style.display = 'block');

  const info = {
    Firstname: document.querySelector('#Firstname'),
    Lastname: document.querySelector('#Lastname'),
    Email: document.querySelector('#Email'),
    Username: document.querySelector('#Username')
  };

  Object.entries(info).forEach(([key, value]) => {
    value.innerHTML = message[key];
  });

  if (!message.Image) {
    pfp.src = './img/default_pfp.png';
  }
}

getInfo();
