import { sendProfileRequest } from './requests/profile.js';
const editProfileForm = document.querySelector('#editProfileForm');
const modal = document.querySelector('#editProfileModal');

const mainProfileDisplay = {
  Firstname: document.querySelector('#FirstnameDisplay'),
  Lastname: document.querySelector('#LastnameDisplay'),
  Email: document.querySelector('#EmailDisplay'),
  Username: document.querySelector('#UsernameDisplay')
};

const editProfileDisplay = {
  Firstname: document.querySelector('#FirstnameEdit'),
  Lastname: document.querySelector('#LastnameEdit'),
  Email: document.querySelector('#EmailEdit'),
  Username: document.querySelector('#UsernameEdit')
};

let imageDisplay = document.querySelector('#ImageDisplay');
var imageEdit = document.getElementById('output');

var userProfile = {};

async function getProfile() {
  // Send a request to retrieve the user's profile information
  const { redirect, user } = await sendProfileRequest(`/profile/view`, 'GET');

  if (redirect) {
    return (window.location.href = redirect);
  }
  userProfile = user;

  // Update the profile display elements with the user's information
  updateUser();

  // Display the user's profile image
  displayUserImage();
}

// Call the getProfile function to initialize the profile display
getProfile();

// Function to dismiss the modal
function dismissModal() {
  modal.classList.remove('show');
  modal.style.display = 'none';
  modal.setAttribute('aria-modal', 'false');
  modal.removeAttribute('aria-hidden');

  // Remove the modal backdrop
  const backdrop = document.getElementsByClassName('modal-backdrop');
  if (backdrop && backdrop.length > 0) {
    backdrop[0].parentNode.removeChild(backdrop[0]);
  }
}

// Update the profile display elements with the user's information
function updateUser() {
  Object.entries(mainProfileDisplay).forEach(([id, element]) => {
    element.innerHTML = userProfile[id];
  });

  Object.entries(editProfileDisplay).forEach(([id, element]) => {
    id == 'Username'
      ? (element.value = userProfile[id].split('#')[0])
      : (element.value = userProfile[id]);
  });
}

// Display the user's profile image
function displayUserImage() {
  if (!userProfile.Image) {
    imageDisplay.src = './img/default_pfp.png';
    imageEdit.src = './img/default_pfp.png';
  } else {
    const uint8Array = new Uint8Array(userProfile.Image.data);

    try {
      const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
      imageDisplay.src = `data:image/png;base64,${base64}`;
      imageEdit.src = `data:image/png;base64,${base64}`;
    } catch (error) {
      imageDisplay.src = './img/default_pfp.png';
      imageEdit.src = './img/default_pfp.png';
      new Alert({
        type: 'warning',
        message: 'Failed to load your profile picture!',
        withProgress: true
      });
    }
  }
}

// Add an event listener to the editProfileForm for the submit event
editProfileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fields = ['Firstname', 'Lastname', 'Username', 'Email'];
  const formData = new FormData();

  // Iterate over each input element and add its value to the form data if it has been changed
  document.querySelectorAll('input').forEach((input) => {
    input.id = input.id.replace('Edit', '');

    if (input.value != userProfile[input.id]) {
      if (input.id == 'Image') {
        if (input.files[0]) formData.append(input.id, input.files[0]);
      } else if (input.id == 'Username') {
        if (input.value != userProfile[input.id].split('#')[0]) {
          formData.append(input.id, input.value);
        }
      } else {
        formData.append(input.id, input.value);
      }
    }
  });

  // Check if the user changed the credentials
  let count = 0;
  for (const entry of formData.entries()) {
    count++;
  }
  if (count == 0) {
    // Call the dismissModal function to dismiss the modal if no changes were made by the user
    dismissModal();
    new Alert({
      type: 'warning',
      message: 'No changes made.',
      withProgress: true
    });
    return;
  }

  // Send a request to update the user's profile with the form data
  const { redirect, error, message, user } = await sendProfileRequest(
    '/profile/edit',
    'PATCH',
    formData
  );

  // Redirect the page if necessary
  if (redirect) return (window.location.href = redirect);

  // Check for errors
  if (error) {
    // Display specific error messages based on their types
    switch (error.name) {
      case 'JoiValidationError':
        fields.forEach((inputKey) => {
          if (inputKey in error.details) {
            document.querySelector(`#${inputKey}`).classList.add('is-invalid');

            document.querySelector(`#${inputKey}Feedback`).innerHTML =
              error.details[inputKey];

            // Calculate the height of the error message
            const errorHeight = document
              .querySelector(`#${inputKey}Feedback`)
              .getBoundingClientRect().height;

            // Add padding to the input container based on the height of the error message
            document.querySelector(`#${inputKey}Row`).style.paddingBottom =
              errorHeight + 'px';
          }
        });
        break;
      default:
        dismissModal();
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
    // Call the dismissModal function to dismiss the modal
    dismissModal();
    new Alert({
      type: 'success',
      message: message,
      withProgress: true
    });

    // Update the profile display with the new user information
    updateUser();

    // Display user image
    displayUserImage();
  }
});
