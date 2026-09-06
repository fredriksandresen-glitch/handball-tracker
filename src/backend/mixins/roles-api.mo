import Principal "mo:core/Principal";
import RolesLib "../lib/roles";
import Types "../types/roles";

mixin (state : RolesLib.State) {

  /** Min egen rolle. Alle kan spoerre om sin egen. */
  public query ({ caller }) func getMyRole() : async {
    role : Types.Role;
    teamId : ?Nat;
    isAdmin : Bool;
  } {
    {
      role = RolesLib.roleOf(state, caller);
      teamId = RolesLib.teamOf(state, caller);
      isAdmin = RolesLib.isAdmin(state, caller);
    };
  };

  /** Kun admin. Backend avviser andre - ikke bare skjult i UI. */
  public shared ({ caller }) func setUserRole(
    subject : Principal,
    role : Types.Role,
    teamId : ?Nat,
  ) : async Types.Assignment {
    RolesLib.setRole(state, caller, subject, role, teamId);
  };

  public query ({ caller }) func listRoleAssignments() : async [Types.Assignment] {
    RolesLib.listAssignments(state, caller);
  };

  public query ({ caller }) func listRoleAuditLog() : async [Types.AuditEntry] {
    RolesLib.listAudit(state, caller);
  };
}
