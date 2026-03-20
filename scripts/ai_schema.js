// Schema/contract utilities extracted from ai.js
// Handles RL schema validation, applyRLMeta, and related helpers

function hasBucketizedFeatures(features) {
  if (features == null || features.length == null || features.length == 0) return false;
  try {
    return features[0] != null && features[0].name != null && features[0].bins != null && features[0].bins.length != null;
  } catch (e) {
    return false;
  }
}

function applyRLMeta(data) {
  if (data == null) {
    Log.info("[RL] Schema validation failed: data is null");
    return false;
  }
  // Validate actions: must be list of non-empty unique strings
  var actions = data.actions;
  if (!Array.isArray(actions)) {
    Log.info("[RL] Schema validation failed: actions must be a list");
    return false;
  }
  var seenActions = {};
  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if (typeof action !== "string" || action.length === 0) {
      Log.info("[RL] Schema validation failed: action[" + i + "] must be a non-empty string, got: " + action);
      return false;
    }
    if (seenActions[action] === true) {
      Log.info("[RL] Schema validation failed: duplicate action name: " + action);
      return false;
    }
    seenActions[action] = true;
  }
  // Validate features using hasBucketizedFeatures pattern
  if (!hasBucketizedFeatures(data.features)) {
    Log.info("[RL] Schema validation failed: features must be a list of {name, bins} objects");
    return false;
  }
  var features = data.features;
  var seenFeatureNames = {};
  for (var fi = 0; fi < features.length; fi++) {
    var feature = features[fi];
    if (typeof feature !== "object" || feature === null) {
      Log.info("[RL] Schema validation failed: feature[" + fi + "] must be an object");
      return false;
    }
    var featureName = feature.name;
    if (typeof featureName !== "string" || featureName.length === 0) {
      Log.info("[RL] Schema validation failed: feature[" + fi + "].name must be a non-empty string, got: " + featureName);
      return false;
    }
    if (seenFeatureNames[featureName] === true) {
      Log.info("[RL] Schema validation failed: duplicate feature name: " + featureName);
      return false;
    }
    seenFeatureNames[featureName] = true;
    var bins = feature.bins;
    if (!Array.isArray(bins)) {
      Log.info("[RL] Schema validation failed: feature[" + fi + "].bins must be a list");
      return false;
    }
  }
  // Validate norms: must be object with keys matching feature names exactly
  var norms = data.norms;
  if (typeof norms !== "object" || norms === null || Array.isArray(norms)) {
    Log.info("[RL] Schema validation failed: norms must be an object");
    return false;
  }
  // Check exact parity between norms keys and feature names
  var normKeys = [];
  for (var key in norms) {
    if (norms.hasOwnProperty(key)) {
      normKeys.push(key);
    }
  }
  var featureNames = [];
  for (var f = 0; f < features.length; f++) {
    featureNames.push(features[f].name);
  }
  // Check for missing norms
  for (var fn = 0; fn < featureNames.length; fn++) {
    if (norms[featureNames[fn]] === undefined) {
      Log.info("[RL] Schema validation failed: missing norms for feature: " + featureNames[fn]);
      return false;
    }
  }
  // Check for extra norms
  for (var nk = 0; nk < normKeys.length; nk++) {
    if (seenFeatureNames[normKeys[nk]] !== true) {
      Log.info("[RL] Schema validation failed: extra norm key not in features: " + normKeys[nk]);
      return false;
    }
  }
  // All validations passed, apply the metadata
  rlQMeta.actions = actions;
  rlQMeta.features = features;
  rlQMeta.norms = {};
  for (var key in norms) {
    if (norms.hasOwnProperty(key)) {
      rlQMeta.norms[key] = norms[key];
    }
  }
  Log.info("[RL] Schema applied: " + rlQMeta.actions.length + " actions, " + rlQMeta.features.length + " features");
  return true;
}

module.exports = {
  hasBucketizedFeatures,
  applyRLMeta
};
