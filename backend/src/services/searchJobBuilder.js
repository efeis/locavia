export function buildSearchJobs() {
  const jobs = [{ type: "google_places" }];

  const serpApiEnabled = process.env.ENABLE_SERPAPI === "true";

  if (serpApiEnabled) {
    jobs.push({ type: "serpapi" });
  }

  return jobs;
}