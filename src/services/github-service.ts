import { AppError } from '../utils/app-error.js';

interface GitHubRepo {
  githubId: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  languages: {
    name: string;
    color: string;
  }[];
  lastCommit?: {
    message: string;
    committedDate: string;
    oid: string;
  };
}

export class GithubService {
  private readonly GRAPHQL_URL = 'https://api.github.com/graphql';

  private async graphqlRequest(query: string, variables: any, accessToken: string) {
    const response = await fetch(this.GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    // Rate Limit Handling
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining && parseInt(remaining) < 10) {
      const waitTime = reset ? (parseInt(reset) * 1000 - Date.now()) : 5000;
      if (waitTime > 0) {
        console.warn(`GitHub Rate Limit low. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(
        errorData.message || 'GitHub API error',
        response.status,
        'GITHUB_API_ERROR'
      );
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new AppError(
        result.errors[0].message || 'GitHub GraphQL error',
        400,
        'GITHUB_GRAPHQL_ERROR'
      );
    }

    return result.data;
  }

  async fetchUserData(accessToken: string): Promise<GitHubRepo[]> {
    const query = `
      query ($since: GitTimestamp) {
        viewer {
          repositories(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}, ownerAffiliations: OWNER) {
            nodes {
              databaseId
              name
              nameWithOwner
              description
              url
              stargazerCount
              languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                nodes {
                  name
                  color
                }
              }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 1, since: $since) {
                      nodes {
                        message
                        committedDate
                        oid
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const data = await this.graphqlRequest(query, { since: oneYearAgo.toISOString() }, accessToken);

    return data.viewer.repositories.nodes.map((repo: any) => ({
      githubId: repo.databaseId.toString(),
      name: repo.name,
      fullName: repo.nameWithOwner,
      description: repo.description,
      url: repo.url,
      stargazerCount: repo.stargazerCount,
      languages: repo.languages.nodes.map((lang: any) => ({
        name: lang.name,
        color: lang.color,
      })),
      lastCommit: repo.defaultBranchRef?.target?.history?.nodes[0] || null,
    }));
  }
}

export default new GithubService();
