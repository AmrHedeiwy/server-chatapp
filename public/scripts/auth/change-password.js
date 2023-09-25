import {
  addFieldStyles,
  removeFieldStyles
} from '../interactive/fieldStyles.js';
import { normalRequest } from '../requests/normal.js';

const modal = document.querySelector('#editProfileModal');
const changePasswordModal = document.getElementById('change-password-modal');

const fields = ['CurrentPassword', 'Password', 'ConfirmPassword'];
const inputFields = {
  CurrentPassword: document.getElementById('CurrentPasswordInput'),
  Password: document.getElementById('PasswordInput'),
  ConfirmPassword: document.getElementById('ConfirmPasswordInput')
};

async function changePassword() {
  removeFieldStyles(fields);

  document.getElementById('change-password-row-id')?.remove();

  const body = {
    CurrentPassword: inputFields.CurrentPassword.value,
    NewPassword: inputFields.Password.value,
    ConfirmPassword: inputFields.ConfirmPassword.value
  };

  const { error, message } = await normalRequest(
    '/profile/change-password',
    'POST',
    JSON.stringify(body)
  );

  if (error) {
    switch (error.name) {
      // Showing each error based on their name
      case 'JoiValidationError':
        addFieldStyles(fields, error);
        break;
      case 'ChangePasswordError':
        inputFields.CurrentPassword.classList.add('is-invalid');
        document.querySelector(`#CurrentPasswordFeedback`).innerHTML =
          error.details.message;
        break;
      default:
        const changePasswordErrorRow = document.createElement('div');
        changePasswordErrorRow.style.paddingBottom = '10px';
        changePasswordErrorRow.id = 'change-password-row-id';

        const changePasswordErrorContent = document.createElement('div');
        changePasswordErrorContent.textContent = error.details.message;
        changePasswordErrorContent.style.fontSize = '16px;';
        changePasswordErrorContent.style.color = 'rgba(214, 45, 48, 1)';

        changePasswordErrorRow.appendChild(changePasswordErrorContent);
        changePasswordModal.prepend(changePasswordErrorRow);
    }
  }

  if (message) {
    inputFields.CurrentPassword.value = '';
    inputFields.Password.value = '';
    inputFields.ConfirmPassword.value = '';

    dismissModal();
    new Alert({
      type: 'success',
      message: message,
      withProgress: true,
      duration: 7
    });
  }
}

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

window.changePassword = changePassword;
