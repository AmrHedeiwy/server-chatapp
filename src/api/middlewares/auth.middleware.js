export const isAuthSocket = (io) => {
  // Authenticate Socket.io connections.
  io.use(async (socket, next) => {
    if (!socket.request.session.passport?.user) {
      return next(new Error('not auth'));
    }
    next();
  });
};

export const isAuthExpress = (req, res, next) => {
  // If the user is not authenticated in, redirect to the sign-in page with a 401 status code.
  req.isAuthenticated() ? next() : res.status(401).redirect('/sign-in.html');
};
