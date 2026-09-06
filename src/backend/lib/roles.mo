import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/roles";

module {
  // Re-eksport slik at main.mo slipper aa importere typemodulen separat.
  public type Role = Types.Role;
  public type Assignment = Types.Assignment;
  public type AuditEntry = Types.AuditEntry;

  public type State = {
    var assignments : Map.Map<Principal, Assignment>;
    var audit : List.List<AuditEntry>;
    var nextAuditId : Nat;
  };

  /**
   * Bootstrap: den foerste adminen. Uten dette kan ingen utnevne noen.
   * Canisterens controller er alltid admin i tillegg, slik at man ikke kan
   * laase seg selv ute permanent.
   */
  let BOOTSTRAP_ADMIN : Text =
    "uzelm-nlsyn-dklu2-lesds-h4vsy-6yiab-hbxxc-omxaa-kgkfe-mmkjp-wae";

  public func roleOf(state : State, who : Principal) : Role {
    if (who.toText() == BOOTSTRAP_ADMIN) return #admin;
    switch (state.assignments.get(who)) {
      case (?a) a.role;
      case null #supporter;
    };
  };

  public func teamOf(state : State, who : Principal) : ?Nat {
    switch (state.assignments.get(who)) {
      case (?a) a.teamId;
      case null null;
    };
  };

  public func isAdmin(state : State, caller : Principal) : Bool {
    if (caller.isController()) return true;
    switch (roleOf(state, caller)) {
      case (#admin) true;
      case _ false;
    };
  };

  /**
   * Tilgangskontroll skjer HER, ikke i frontend. Aa skjule en fane hindrer
   * ingen i aa kalle canisteren direkte.
   */
  public func requireAdmin(state : State, caller : Principal) {
    if (caller.isAnonymous()) Runtime.trap("Authentication required");
    if (not isAdmin(state, caller)) Runtime.trap("Admin access required");
  };

  public func setRole(
    state : State,
    caller : Principal,
    subject : Principal,
    role : Role,
    teamId : ?Nat,
  ) : Assignment {
    requireAdmin(state, caller);
    if (subject.isAnonymous()) Runtime.trap("Cannot assign a role to the anonymous principal");

    let previous = switch (state.assignments.get(subject)) {
      case (?a) ?a.role;
      case null null;
    };

    let assignment : Assignment = {
      subject;
      role;
      teamId;
      assignedBy = caller;
      assignedAt = Time.now();
    };
    state.assignments.add(subject, assignment);

    state.audit.add({
      id = state.nextAuditId;
      changedBy = caller;
      subject;
      previousRole = previous;
      newRole = role;
      teamId;
      at = Time.now();
    });
    state.nextAuditId += 1;
    assignment;
  };

  public func listAssignments(state : State, caller : Principal) : [Assignment] {
    requireAdmin(state, caller);
    List.fromIter<Assignment>(state.assignments.values()).toArray();
  };

  public func listAudit(state : State, caller : Principal) : [AuditEntry] {
    requireAdmin(state, caller);
    state.audit.toArray();
  };
}
