// src/services/portfolio/WorkspaceEngine.ts

export interface TeamMember {
  id: string;
  name: string;
  role: "Admin" | "Analyst" | "Viewer";
}

export class WorkspaceEngine {
  private static members: TeamMember[] = [];

  public static getMembers(): TeamMember[] {
    return this.members;
  }

  public static inviteMember(name: string, role: "Admin" | "Analyst" | "Viewer"): void {
    this.members.push({
      id: Math.random().toString(36).substring(2, 9),
      name,
      role,
    });
  }
}
