export const isAuthSocket = async (socket, next) => {
  if (!socket.request.session.passport?.user) {
    return next(new Error('authentication_error'));
  }
  next();
};

export const isAuthExpress = (req, res, next) => {
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ error: { redirect: '/' } });
};
