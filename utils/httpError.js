// One place to turn a caught error into a safe HTTP response.
// Validation problems are the user's fault (400, message is useful);
// everything else is logged here and hidden from the client.
export function sendServerError(res, err) {
  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
