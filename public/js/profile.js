import { sendServerRequest } from './requests/auth.js';

/**
 * This funciton is executed when the profile.html page is loaded to check
 * the user's session for the following reasons:
 *
 * 1. Check if the user needs email verification and redirect them back
 * to the sign-in.html page if not.
 * 2. Display the masked email and the first name of the user in the page.
 * 3. Check if user has any flash messages and display them.
 */
(async function getInfo() {
  // Send request to retrive user information
  const { redirect } = await sendServerRequest(`/auth/info/profile`, 'GET');

  if (redirect) {
    return (window.location.href = redirect);
  }
})();
