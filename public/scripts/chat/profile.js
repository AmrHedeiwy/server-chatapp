import { formDataRequest } from '../requests/formData.js';

let userProfile = {};

const profileCredentialsDisplayAndInputElements = {
  Firstname: document.querySelectorAll('#Firstname'),
  Lastname: document.querySelectorAll('#Lastname'),
  Email: document.querySelectorAll('#Email'),
  Username: document.querySelectorAll('#Username')
};
const profileImageDisplayElements = {
  ViewImageDisplay: document.getElementById('ViewImageDisplay'),
  EditImageDisplay: document.getElementById('EditImageDisplay')
};

const editProfileForm = document.querySelector('#editProfileForm');

(async function getProfile() {
  // Send a request to retrieve the user's profile information
  const { redirect, user } = await formDataRequest(`/profile/view`, 'GET');

  if (redirect) {
    return (window.location.href = redirect);
  }
  userProfile = user;

  // Update the profile display elements with the user's information
  updateProfileCredentials();

  // Display the user's profile image
  updateProfileImage();
})();

editProfileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Reseting all the styles to its original form.
  Object.entries(profileCredentialsDisplayAndInputElements).forEach(
    ([id, elements]) => {
      elements[1].classList.remove('is-invalid');
      elements[1].innerHTML = '';

      // remove the padding to the input container
      document.querySelector(`#${id}Row`).style.paddingBottom = '0px';
    }
  );

  const formData = new FormData();

  const profileImageInputElement = document.getElementById('Image');

  // Check if the use changed their profile picture
  if (profileImageInputElement.files[0]) {
    formData.append('Image', profileImageInputElement.files[0]);
  }
  // Iterate over each input element and add its value to the form data if it has been changed
  Object.entries(profileCredentialsDisplayAndInputElements).forEach(
    ([id, elements]) => {
      let input = elements[1];

      if (id == 'Username') {
        if (input.value != userProfile['Username'].split('#')[0]) {
          formData.append(id, input.value);
        }
      } else if (input?.value != userProfile[id]) {
        formData.append(id, input.value);
      }
    }
  );

  // Check if the user changed the credentials
  let count = 0;
  for (const entry of formData.entries()) {
    count++;
  }
  if (count == 0) {
    new Alert({
      type: 'warning',
      message: 'No changes made.',
      withProgress: true
    });
    return;
  }

  // Send a request to update the user's profile with the form data
  const { redirect, error, message, user } = await formDataRequest(
    '/profile/edit',
    'POST',
    formData
  );

  // Redirect the page if necessary
  if (redirect) return (window.location.href = redirect);

  // Check for errors
  if (error) {
    // Display specific error messages based on their types
    switch (error.name) {
      case 'JoiValidationError':
        Object.entries(profileCredentialsDisplayAndInputElements).forEach(
          ([id, element]) => {
            if (id in error.details) {
              console.log(element);
              element[1].classList.add('is-invalid');

              document.querySelector(`#${id}Feedback`).innerHTML =
                error.details[id];

              // Calculate the height of the error message
              const errorHeight = document
                .querySelector(`#${id}Feedback`)
                .getBoundingClientRect().height;

              // Add padding to the input container based on the height of the error message
              document.querySelector(`#${id}Row`).style.paddingBottom =
                errorHeight + 'px';
            }
          }
        );
        break;
      default:
        new Alert({
          type: 'error',
          message: error.details.message,
          withProgress: true
        });
        break;
    }

    // Stop the execution of the function
    return;
  }

  // Handle success message and update the user's profile information and image
  if (message && user) {
    userProfile = user;
    new Alert({
      type: 'success',
      message: message,
      withProgress: true
    });

    // Update the profile display with the new user information
    updateProfileCredentials();

    // Display user image
    updateProfileImage();
  }
});

function updateProfileCredentials() {
  Object.entries(profileCredentialsDisplayAndInputElements).forEach(
    ([id, elements]) => {
      elements[0].innerHTML = userProfile[id];
      elements[1].value =
        id == 'Username' ? userProfile[id].split('#')[0] : userProfile[id];
    }
  );
  document.querySelectorAll('#Fullname').forEach((element) => {
    const { Firstname, Lastname } = userProfile;
    element.innerHTML = `${Firstname} ${Lastname}`;
  });
}

function updateProfileImage() {
  if (!userProfile.Image) {
    profileImageDisplayElements.ViewImageDisplay.src = './img/default_pfp.png';
    profileImageDisplayElements.EditImageDisplay.src = './img/default_pfp.png';
  } else {
    const uint8Array = new Uint8Array(userProfile.Image.data);

    try {
      const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
      profileImageDisplayElements.ViewImageDisplay.src = `data:image/png;base64,${base64}`;
      profileImageDisplayElements.EditImageDisplay.src = `data:image/png;base64,${base64}`;
    } catch (error) {
      profileImageDisplayElements.ViewImageDisplay.src =
        './img/default_pfp.png';
      profileImageDisplayElements.EditImageDisplay.src =
        './img/default_pfp.png';
      new Alert({
        type: 'warning',
        message: 'Failed to load your profile picture!',
        withProgress: true
      });
    }
  }
}
