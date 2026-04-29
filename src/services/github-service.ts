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
  commits: {
    message: string;
    committedDate: string;
    oid: string;
  }[];
}

interface GitHubProfile {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
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

    if (remaining && parseInt(remaining) < 10) {
      throw new AppError(
        'GitHub Rate Limit low, retrying via queue...',
        429,
        'GITHUB_RATE_LIMIT'
      );
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

  async fetchUserData(accessToken: string, userGithubId: string): Promise<GitHubRepo[]> {
    const query = `
      query ($since: GitTimestamp) {
        viewer {
          repositories(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
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
                    history(first: 100, since: $since) {
                      nodes {
                        message
                        committedDate
                        oid
                        author {
                          user {
                            databaseId
                          }
                        }
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

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const data = await this.graphqlRequest(query, { since: ninetyDaysAgo.toISOString() }, accessToken);

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
      commits: (repo.defaultBranchRef?.target?.history?.nodes || [])
        .filter((c: any) => c.author?.user?.databaseId?.toString() === userGithubId)
        .map((c: any) => ({
          message: c.message,
          committedDate: c.committedDate,
          oid: c.oid,
        })),
    }));
  }

  async fetchContributionGraph(accessToken: string, username: string) {
    const query = `
      query ($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.graphqlRequest(query, { login: username }, accessToken);
    
    if (!data?.user?.contributionsCollection?.contributionCalendar) {
      throw new Error("Could not fetch contribution calendar");
    }

    const calendar = data.user.contributionsCollection.contributionCalendar;
    const days: { date: string; count: number }[] = [];
    
    calendar.weeks.forEach((week: any) => {
      week.contributionDays.forEach((day: any) => {
        days.push({
          date: day.date,
          count: day.contributionCount,
        });
      });
    });

    return {
      totalContributions: calendar.totalContributions,
      days: days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }

  async getProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(
        errorData.message || 'Failed to fetch GitHub profile',
        response.status,
        'GITHUB_PROFILE_ERROR'
      );
    }

    return await response.json();
  }
}

export default new GithubService();
