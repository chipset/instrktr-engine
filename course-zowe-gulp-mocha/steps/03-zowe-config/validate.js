module.exports = async function validate(context) {
  if (!await context.files.exists('zowe.config.json')) {
    return context.fail('zowe.config.json not found. It should have been scaffolded into your workspace — if not, create it manually using the template in the instructions.');
  }

  let config;
  try {
    config = JSON.parse(await context.files.read('zowe.config.json'));
  } catch {
    return context.fail('zowe.config.json is not valid JSON. Check for missing commas or brackets.');
  }

  if (!config.profiles || typeof config.profiles !== 'object') {
    return context.fail('zowe.config.json must have a "profiles" object at the top level.');
  }

  const profiles = config.profiles;

  const endevorProfile = Object.values(profiles).find(p => p.type === 'endevor');
  if (!endevorProfile) {
    return context.fail('No profile with "type": "endevor" found. Add an endevor profile — see the template in the instructions.');
  }

  const host = endevorProfile.properties && endevorProfile.properties.host;
  if (!host) {
    return context.warn('The endevor profile is missing a "host" property. Add the hostname of your Endevor REST API server.');
  }

  const locationProfile = Object.values(profiles).find(p => p.type === 'endevor-location');
  if (!locationProfile) {
    return context.warn('No "endevor-location" profile found. Add one to specify your instance, environment, system, and subsystem.');
  }

  return context.pass(`Zowe config looks good. Endevor host: ${host}`);
};
