#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { Octokit } = require("@octokit/rest");

const ROOT = path.resolve(__dirname, "..");
const TRACKING_PATH = path.join(ROOT, ".github", "submitted-registries.json");
const SERVICE_URL = "https://github.com/DheerajKumar76x/x402-api";
const OPENAPI_URL = "https://x402-api-91r3.vercel.app/docs/openapi.json";
const MCP_URL = "https://x402-api-91r3.vercel.app/.well-known/mcp.json";
const BRANCH = "add-x402-api-service";
const QUERIES = ["awesome x402", "awesome mcp", "awesome ai agents", "awesome paywall"];
const MAX_PR_PER_RUN = Math.min(positiveInt(process.env.MAX_PR_PER_RUN, 3), 10);
const MAX_SEARCH_PAGES = positiveInt(process.env.MAX_SEARCH_PAGES, 5);
const LISTING = `- [x402 API](${SERVICE_URL}) - Production-ready x402 HTTP payment-required API suite supporting native USDC payment validation, OpenAPI 3.0 specs, and MCP agent discovery (\`/.well-known/mcp.json\`).`;

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readTracking() {
  if (!fs.existsSync(TRACKING_PATH)) return { submitted: [] };
  const value = JSON.parse(fs.readFileSync(TRACKING_PATH, "utf8"));
  if (!value || !Array.isArray(value.submitted)) throw new Error(`${TRACKING_PATH} must contain a submitted array`);
  return value;
}

function writeTracking(tracking) {
  fs.mkdirSync(path.dirname(TRACKING_PATH), { recursive: true });
  fs.writeFileSync(TRACKING_PATH, `${JSON.stringify(tracking, null, 2)}\n`);
}

function findSection(readme) {
  const lines = readme.split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[index]);
    if (match) headings.push({ index, level: match[1].length, title: match[2] });
  }

  const preferred = headings
    .map((heading) => ({
      ...heading,
      score: /x402\s*(endpoints?|apis?)/i.test(heading.title) ? 100
        : /mcp\s+servers?/i.test(heading.title) ? 95
          : /^apis?$/i.test(heading.title) ? 90
            : /^services?$/i.test(heading.title) ? 85
              : /community\s+resources|ecosystem/i.test(heading.title) ? 50
                : 0
    }))
    .filter((heading) => heading.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];

  if (!preferred) return { lines, heading: null, insertAt: lines.length, addHeading: true };
  const end = headings.find((heading) => heading.index > preferred.index && heading.level <= preferred.level);
  return { lines, heading: preferred, insertAt: end ? end.index : lines.length, addHeading: false };
}

function addListing(readme) {
  if (readme.toLowerCase().includes(SERVICE_URL.toLowerCase())) return null;
  const section = findSection(readme);
  const before = section.lines.slice(0, section.insertAt);
  const after = section.lines.slice(section.insertAt);
  while (before.length && before[before.length - 1].trim() === "") before.pop();

  if (section.addHeading) {
    before.push("", "## Community Resources", "", LISTING);
  } else {
    before.push("", LISTING);
  }
  const result = [...before, ...after];
  if (section.addHeading || section.insertAt === section.lines.length) {
    while (result.length && result[result.length - 1].trim() === "") result.pop();
  }
  return `${result.join("\n")}\n`;
}

function decodeContent(content) {
  return Buffer.from(content, "base64").toString("utf8");
}

function encodeContent(content) {
  return Buffer.from(content, "utf8").toString("base64");
}

async function findRepositories(octokit, ownLogin, tracking) {
  const submitted = new Set(tracking.submitted.map((item) => item.repository.toLowerCase()));
  const results = new Map();
  for (const phrase of QUERIES) {
    const q = `${phrase} in:name,description,readme is:public archived:false fork:false`;
    for (let page = 1; page <= MAX_SEARCH_PAGES; page += 1) {
      const { data } = await octokit.rest.search.repos({ q, sort: "stars", order: "desc", per_page: 100, page });
      for (const repo of data.items) {
        const key = repo.full_name.toLowerCase();
        if (results.has(key) || submitted.has(key) || key === `${ownLogin}/x402-api`.toLowerCase()) continue;
        if (!repo.allow_forking || repo.archived || repo.disabled || !repo.has_issues || repo.fork) continue;
        results.set(key, repo);
      }
      if (data.items.length < 100 || page * 100 >= data.total_count) break;
    }
  }
  return [...results.values()].sort((a, b) => b.stargazers_count - a.stargazers_count);
}

async function waitForFork(octokit, owner, repo) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await octokit.rest.repos.get({ owner, repo });
    } catch (error) {
      if (error.status !== 404 || attempt === 9) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`Timed out waiting for fork ${owner}/${repo}`);
}

async function ensureFork(octokit, repo, login) {
  const owner = login;
  try {
    return await octokit.rest.repos.get({ owner, repo: repo.name });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await octokit.rest.repos.createFork({ owner: repo.owner.login, repo: repo.name });
  return waitForFork(octokit, owner, repo.name);
}

async function commitReadme(octokit, upstream, fork, readmeText) {
  let branchSha;
  try {
    const existingBranch = await octokit.rest.git.getRef({ owner: fork.owner.login, repo: fork.name, ref: `heads/${BRANCH}` });
    branchSha = existingBranch.data.object.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
    const base = await octokit.rest.git.getRef({ owner: upstream.owner.login, repo: upstream.name, ref: `heads/${upstream.default_branch}` });
    await octokit.rest.git.createRef({ owner: fork.owner.login, repo: fork.name, ref: `refs/heads/${BRANCH}`, sha: base.data.object.sha });
  }

  let existing;
  try {
    existing = await octokit.rest.repos.getContent({ owner: fork.owner.login, repo: fork.name, path: "README.md", ref: BRANCH });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const existingText = existing && !Array.isArray(existing.data) && "content" in existing.data
    ? decodeContent(existing.data.content)
    : null;
  if (existingText && existingText.toLowerCase().includes(SERVICE_URL.toLowerCase())) return;

  const sha = existing && !Array.isArray(existing.data) && "sha" in existing.data ? existing.data.sha : undefined;
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: fork.owner.login,
    repo: fork.name,
    path: "README.md",
    message: "docs: add x402-api service to resources",
    content: encodeContent(readmeText),
    branch: BRANCH,
    ...(sha ? { sha } : {})
  });
}

function pullRequestBody(repository) {
  return `## About x402 API\n\n[x402 API](${SERVICE_URL}) is a production-ready x402 HTTP API suite for paid services using USDC, with OpenAPI 3.0 documentation and MCP tool discovery.\n\n- OpenAPI specification: ${OPENAPI_URL}\n- MCP discovery manifest: ${MCP_URL}\n\nThis small documentation change adds the service to the repository resources list. Please feel free to suggest a better section or wording for ${repository}.`;
}

async function hasExistingPullRequest(octokit, upstream, login) {
  const { data } = await octokit.rest.pulls.list({ owner: upstream.owner.login, repo: upstream.name, state: "open", head: `${login}:${BRANCH}`, per_page: 100 });
  return data[0] || null;
}

async function rejectsContributions(octokit, upstream) {
  const files = ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"];
  let guidance = "";
  for (const file of files) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner: upstream.owner.login, repo: upstream.name, path: file, ref: upstream.default_branch });
      if (!Array.isArray(data) && "content" in data) guidance += `\n${decodeContent(data.content)}`;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return /(?:pull requests?|contributions?|submissions?)\s+(?:are|is)\s+not\s+accepted|not accepting (?:pull requests?|contributions?)|do not submit (?:pull requests?|contributions?)|no pull requests? (?:please|accepted)|submissions? (?:are|is) closed/i.test(guidance);
}

async function submitToRepository(octokit, upstream, login) {
  const readmeResponse = await octokit.rest.repos.getReadme({ owner: upstream.owner.login, repo: upstream.name, ref: upstream.default_branch });
  const originalReadme = decodeContent(readmeResponse.data.content);
  const updatedReadme = addListing(originalReadme);
  if (!updatedReadme) return { skipped: "README already links to x402 API" };
  if (await rejectsContributions(octokit, upstream)) return { skipped: "contribution guidance does not accept submissions" };

  const existingPr = await hasExistingPullRequest(octokit, upstream, login);
  if (existingPr) return { skipped: "open pull request already exists", url: existingPr.html_url };

  const forkResponse = await ensureFork(octokit, upstream, login);
  await commitReadme(octokit, upstream, forkResponse.data, updatedReadme);
  const { data: pullRequest } = await octokit.rest.pulls.create({
    owner: upstream.owner.login,
    repo: upstream.name,
    head: `${login}:${BRANCH}`,
    base: upstream.default_branch,
    title: "docs: add x402-api service to resources",
    body: pullRequestBody(upstream.full_name)
  });
  return { url: pullRequest.html_url };
}

async function main() {
  const token = process.env.GH_AUTOMATION_TOKEN;
  if (!token) throw new Error("GH_AUTOMATION_TOKEN is required");
  const octokit = new Octokit({ auth: token, userAgent: "x402-api-registry-submitter/1.0" });
  const { data: user } = await octokit.rest.users.getAuthenticated();
  const tracking = readTracking();
  const candidates = await findRepositories(octokit, user.login, tracking);
  console.log(`Found ${candidates.length} eligible repositories; submitting at most ${MAX_PR_PER_RUN} pull requests this run.`);

  let created = 0;
  for (const upstream of candidates) {
    if (created >= MAX_PR_PER_RUN) break;
    try {
      const result = await submitToRepository(octokit, upstream, user.login);
      if (result.skipped) {
        console.log(`Skipped ${upstream.full_name}: ${result.skipped}${result.url ? ` (${result.url})` : ""}`);
        continue;
      }
      tracking.submitted.push({ repository: upstream.full_name, pullRequest: result.url, submittedAt: new Date().toISOString() });
      writeTracking(tracking);
      created += 1;
      console.log(`Opened PR for ${upstream.full_name}: ${result.url}`);
    } catch (error) {
      console.error(`Could not submit to ${upstream.full_name}: ${error.message}`);
      if (error.status === 401 || error.status === 403 && /bad credentials|resource not accessible/i.test(error.message)) throw error;
    }
  }
  console.log(`Created ${created} pull request(s).`);
}

main().catch((error) => {
  console.error(`Registry submission failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
