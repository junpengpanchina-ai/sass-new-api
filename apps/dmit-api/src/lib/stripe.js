function ensureStripeReady() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
}

module.exports = {
  ensureStripeReady,
};
