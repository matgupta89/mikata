// What a given role is allowed to see. This is the gating logic that makes
// the role switcher actually mean something: a prospect sees only the
// "prospect" pieces, members see member content too, and editors/admins
// additionally see editor-only pieces.
export function visibleVisibilities(role: string | null): string[] {
  switch (role) {
    case "editor":
    case "admin":
      return ["prospect", "member", "editor"];
    case "member":
    case "contributor":
      return ["prospect", "member"];
    default:
      // prospect, or signed out
      return ["prospect"];
  }
}
