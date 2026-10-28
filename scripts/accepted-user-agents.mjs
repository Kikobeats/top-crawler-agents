// Web Bot Auth entries have no `instances` and therefore no User-Agent.
// `?? []` is required: flatMap keeps a bare undefined, and the later sort throws.
export const acceptedUserAgents = json =>
  json.flatMap(item => item.instances?.accepted ?? [])
