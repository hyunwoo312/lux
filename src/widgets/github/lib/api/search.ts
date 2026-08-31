import { z } from "zod";
import { httpUrlSchema } from "@/lib/open-url";
import { graphql } from "@/widgets/github/lib/api/client";
import type { GithubSearch, RepoHit, IssueHit } from "@/widgets/github/types";

const HIT_LIMIT = 10;

function searchQuery(term: string): string {
  const needle = JSON.stringify(term);
  return `query {
  repositories: search(query: ${needle}, type: REPOSITORY, first: ${HIT_LIMIT}) {
    nodes {
      ... on Repository {
        nameWithOwner
        url
        description
        isPrivate
        stargazerCount
      }
    }
  }
  issues: search(query: ${needle}, type: ISSUE, first: ${HIT_LIMIT}) {
    nodes {
      ... on Issue { id title url number updatedAt repository { nameWithOwner isPrivate } }
      ... on PullRequest {
        id
        title
        url
        number
        updatedAt
        isDraft
        repository { nameWithOwner isPrivate }
      }
    }
  }
}`;
}

const repoNodeSchema = z.object({
  nameWithOwner: z.string(),
  url: httpUrlSchema,
  description: z.string().nullish(),
  isPrivate: z.boolean(),
  stargazerCount: z.number(),
});

const issueNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: httpUrlSchema,
  number: z.number(),
  updatedAt: z.string(),
  isDraft: z.boolean().optional(),
  repository: z.object({ nameWithOwner: z.string(), isPrivate: z.boolean() }),
});

const searchSchema = z.object({
  data: z.object({
    repositories: z.object({ nodes: z.array(z.unknown()) }).nullable(),
    issues: z.object({ nodes: z.array(z.unknown()) }).nullable(),
  }),
});

function toRepo(node: unknown): RepoHit[] {
  const parsed = repoNodeSchema.safeParse(node);
  if (!parsed.success) return [];
  const { nameWithOwner, url, description, isPrivate, stargazerCount } = parsed.data;
  return [
    { nameWithOwner, url, description: description ?? null, isPrivate, stars: stargazerCount },
  ];
}

function toIssue(node: unknown): IssueHit[] {
  const parsed = issueNodeSchema.safeParse(node);
  if (!parsed.success) return [];
  const { id, title, url, number, updatedAt, isDraft, repository } = parsed.data;
  return [
    {
      id,
      title,
      url,
      number,
      updatedAt,
      repo: repository.nameWithOwner,
      isPrivate: repository.isPrivate,
      isPullRequest: isDraft !== undefined,
    },
  ];
}

export async function searchGithub(query: string, signal?: AbortSignal): Promise<GithubSearch> {
  const parsed = searchSchema.safeParse(await graphql(searchQuery(query), signal));
  if (!parsed.success) {
    throw new Error("Unexpected GitHub search response");
  }
  return {
    repositories: (parsed.data.data.repositories?.nodes ?? []).flatMap(toRepo),
    issues: (parsed.data.data.issues?.nodes ?? []).flatMap(toIssue),
  };
}
