let mediaQuery = window.matchMedia('(min-width: 1000px)');

let frameSidepanel = document.querySelector('#frame #sidepanel');
let frameContent = document.querySelector('#frame .content');
let frameBackOption = document.querySelector(
  '#frame .content .contact-profile .social-media'
);
let chatContact = document.querySelector('#frame #sidepanel #chat-contact');
let viewProfile = document.querySelector('#frame #sidepanel #view-profile');
let chatHeader = document.querySelector('#frame #sidepanel #chat-header');
let editProfile = document.querySelector('#frame #sidepanel #edit-profile');
let contactHeader = document.querySelector('#frame #sidepanel #contact-header');
let contactList = document.querySelector('#frame #sidepanel #contact-list');

function getPage(element) {
  switch (element.id) {
    case 'chat-button':
      viewProfile.style.display = 'none';
      editProfile.style.display = 'none';
      contactHeader.style.display = 'none';
      contactList.style.display = 'none';

      chatContact.style.display = 'block';
      chatHeader.style.display = 'block';
      break;
    case 'user-profile-button':
      chatContact.style.display = 'none';
      chatHeader.style.display = 'none';
      editProfile.style.display = 'none';
      contactHeader.style.display = 'none';
      contactList.style.display = 'none';

      viewProfile.style.display = 'block';
      break;
    case 'edit-profile-button':
      viewProfile.style.display = 'none';
      chatContact.style.display = 'none';
      chatHeader.style.display = 'none';
      contactHeader.style.display = 'none';
      contactList.style.display = 'none';

      editProfile.style.display = 'block';
      break;
    case 'contact-button':
      viewProfile.style.display = 'none';
      chatContact.style.display = 'none';
      chatHeader.style.display = 'none';
      editProfile.style.display = 'none';

      contactHeader.style.display = 'block';
      contactList.style.display = 'block';
  }
}

function loadFile(event) {
  var image = document.getElementById('EditImageDisplay');
  console.log(image);
  image.src = URL.createObjectURL(event.target.files[0]);
}

function back() {
  frameSidepanel.style.display = 'block';

  frameContent.forEach(function (content) {
    content.style.display = 'none';
  });
}

function handleScreenSizeChange(mediaQuery) {
  if (mediaQuery.matches) {
    frameSidepanel.style.removeProperty('min-width');

    frameContent.style.display = 'block';
    frameContent.style.removeProperty('width');

    frameBackOption.style.display = 'none';
  } else {
    frameContent.style.display = 'none';
    frameContent.style.width = '100%';

    frameSidepanel.style['min-width'] = '100%';

    frameBackOption.style.display = 'block';
  }
}

handleScreenSizeChange(mediaQuery); // Check initial screen size

mediaQuery.addListener(handleScreenSizeChange); // Listen for screen size changes
