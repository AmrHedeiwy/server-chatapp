export const isAuthSocket = async (socket, next) => {
  if (!socket.request.session.passport?.user) {
    return next(new Error('not auth'));
  }
  next();
};

export const isAuthExpress = (req, res, next) => {
  // If the user is not authenticated in, redirect to the sign-in/register page with a 401 status code.
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ error: { redirect: '/' } });
};
