// Centralized error handler - keeps internal error details out of responses
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "P2002") {
    return res.status(409).json({ error: "A record with that value already exists." });
  }

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong on our end." : err.message;
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
