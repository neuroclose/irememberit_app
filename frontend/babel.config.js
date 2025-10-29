module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // If you use Expo Router, include this line:
      require.resolve('expo-router/babel'),

      // If you use environment variables from .env, include
