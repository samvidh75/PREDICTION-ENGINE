export interface CommunityIdea {
  id: string;
  title: string;
  description: string;
  symbol: string;
  thesis: string;
  convictionScore: number;
  riskFactors: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  votes: number;
  comments: number;
  tags: string[];
  status: 'active' | 'closed' | 'archived';
}

export interface IdeaVote {
  ideaId: string;
  userId: string;
  vote: 'up' | 'down';
  timestamp: string;
}

export interface IdeaComment {
  id: string;
  ideaId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ThesisDiscussion {
  ideaId: string;
  contributions: Array<{
    userId: string;
    type: 'supporting_evidence' | 'counter_argument' | 'risk_added' | 'update';
    text: string;
    timestamp: string;
  }>;
}

export class IdeaSharingService {
  private ideas: CommunityIdea[] = [];
  private votes: IdeaVote[] = [];
  private comments: IdeaComment[] = [];

  createIdea(input: Omit<CommunityIdea, 'id' | 'createdAt' | 'updatedAt' | 'votes' | 'comments'>): CommunityIdea {
    const idea: CommunityIdea = {
      ...input,
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votes: 0,
      comments: 0,
    };
    this.ideas.unshift(idea);
    return idea;
  }

  getIdeas(filters?: {
    symbol?: string;
    authorId?: string;
    tags?: string[];
    status?: CommunityIdea['status'];
    sortBy?: 'newest' | 'top' | 'most_discussed';
    limit?: number;
  }): CommunityIdea[] {
    let result = [...this.ideas];

    if (filters?.symbol) result = result.filter(i => i.symbol === filters.symbol);
    if (filters?.authorId) result = result.filter(i => i.authorId === filters.authorId);
    if (filters?.tags?.length) result = result.filter(i => filters.tags!.some(t => i.tags.includes(t)));
    if (filters?.status) result = result.filter(i => i.status === filters.status);

    switch (filters?.sortBy) {
      case 'newest':
        result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'top':
        result.sort((a, b) => b.votes - a.votes);
        break;
      case 'most_discussed':
        result.sort((a, b) => b.comments - a.comments);
        break;
      default:
        result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result.slice(0, filters?.limit ?? 50);
  }

  voteIdea(ideaId: string, userId: string, vote: 'up' | 'down'): CommunityIdea | null {
    const existing = this.votes.find(v => v.ideaId === ideaId && v.userId === userId);
    if (existing) {
      if (existing.vote === vote) return null;
      existing.vote = vote;
      existing.timestamp = new Date().toISOString();
    } else {
      this.votes.push({ ideaId, userId, vote, timestamp: new Date().toISOString() });
    }

    const idea = this.ideas.find(i => i.id === ideaId);
    if (!idea) return null;

    const upVotes = this.votes.filter(v => v.ideaId === ideaId && v.vote === 'up').length;
    const downVotes = this.votes.filter(v => v.ideaId === ideaId && v.vote === 'down').length;
    idea.votes = upVotes - downVotes;
    idea.updatedAt = new Date().toISOString();
    return { ...idea };
  }

  addComment(ideaId: string, authorId: string, authorName: string, text: string): IdeaComment | null {
    const idea = this.ideas.find(i => i.id === ideaId);
    if (!idea) return null;

    const comment: IdeaComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ideaId,
      authorId,
      authorName,
      text,
      createdAt: new Date().toISOString(),
    };

    this.comments.push(comment);
    idea.comments = this.comments.filter(c => c.ideaId === ideaId).length;
    idea.updatedAt = new Date().toISOString();
    return comment;
  }

  getComments(ideaId: string): IdeaComment[] {
    return this.comments
      .filter(c => c.ideaId === ideaId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getTrendingIdeas(limit: number = 10): CommunityIdea[] {
    return this.ideas
      .filter(i => i.status === 'active')
      .sort((a, b) => {
        const aScore = a.votes * 2 + a.comments + (Date.now() - new Date(a.createdAt).getTime()) / 86400000 * 0.5;
        const bScore = b.votes * 2 + b.comments + (Date.now() - new Date(b.createdAt).getTime()) / 86400000 * 0.5;
        return bScore - aScore;
      })
      .slice(0, limit);
  }
}

export const ideaSharingService = new IdeaSharingService();
