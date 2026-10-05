export const capability = {
  id: "QUALIFY_AND_BID",
  version: "1.0.0",
  workflow: ["DISCOVER","EXTRACT","QUALIFY","BID_NO_BID","PREPARE_BID","SUBMIT","TRACK_OUTCOME"]
} as const;