const socket = io();

socket.on('connect', () => {
  console.log(socket.id, socket);
});

socket.on('flash', (data) => {
  new Alert({
    type: data.type,
    message: data.message,
    withProgress: true
  });
});

socket.on('connect_error', () => {
  console.log('client error');
  window.location.href = '/sign-in.html';
});
